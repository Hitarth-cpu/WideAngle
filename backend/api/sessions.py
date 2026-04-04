import uuid
import logging
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.core.database import get_db, AsyncSessionLocal
from backend.models.session import Session, SessionStatus
from backend.models.agent_record import AgentRecord

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sessions", tags=["Sessions"])


class CreateSessionRequest(BaseModel):
    mode: str
    input_type: str = "code"
    input_text: str = ""


@router.post("", status_code=201)
async def create_session(req: CreateSessionRequest, db: AsyncSession = Depends(get_db)):
    session = Session(
        id=str(uuid.uuid4()), mode=req.mode,
        input_type=req.input_type, input_text=req.input_text,
        status=SessionStatus.PENDING,
    )
    db.add(session)
    await db.flush()
    return {"session_id": session.id, "status": session.status}


@router.post("/{session_id}/run", status_code=202)
async def run_session(session_id: str, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")
    if session.status == SessionStatus.RUNNING:
        raise HTTPException(409, "Session already running")
    session.status = SessionStatus.RUNNING
    await db.flush()
    background_tasks.add_task(_run_session_background, session_id)
    return {"session_id": session_id, "status": "running"}


@router.get("/{session_id}")
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")
    return {"session_id": session.id, "mode": session.mode, "status": session.status,
            "final_report": session.final_report, "created_at": session.created_at.isoformat()}


@router.get("")
async def list_sessions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Session).order_by(Session.created_at.desc()).limit(20))
    sessions = result.scalars().all()
    return [{"session_id": s.id, "mode": s.mode, "status": s.status,
             "created_at": s.created_at.isoformat()} for s in sessions]


@router.get("/{session_id}/agents")
async def get_session_agents(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AgentRecord).where(AgentRecord.session_id == session_id).order_by(AgentRecord.stage)
    )
    agents = result.scalars().all()
    return [
        {
            "id": a.id,
            "name": a.name,
            "persona": a.persona,
            "role": a.role,
            "stage": a.stage,
            "status": a.status,
            "output": a.output,
            "dependencies": [],
        }
        for a in agents
    ]


@router.delete("/{session_id}", status_code=204)
async def delete_session(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")
    await db.delete(session)


async def _run_session_background(session_id: str):
    from backend.core.websocket import ws_manager
    from backend.core.ollama import ollama_client
    from backend.agents.planner import PlannerAgent
    from backend.agents.meta import MetaSynthesizer
    from backend.agents.concrete import build_agent_from_spec
    from backend.orchestrator.runner import SessionRunner
    from backend.orchestrator.queue import agent_queue
    from backend.ingestion.router import ingest

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Session).where(Session.id == session_id))
        session = result.scalar_one_or_none()
        if not session:
            return
        try:
            text = await ingest(session.input_type, session.input_text)
            planner = PlannerAgent(ollama_client=ollama_client)
            dag = await planner.plan(text, session.mode)
            meta = MetaSynthesizer(session_id, ws_manager, ollama_client)
            tool_context = {"document_text": text, "codebase_path": "."}
            def factory(spec, sid, ws):
                return build_agent_from_spec(spec, sid, ws, ollama_client, tool_context)
            runner = SessionRunner(session_id, ws_manager, agent_queue)
            report = await runner.run(dag, text, factory, meta)
            session.status = "done"
            session.final_report = report
            await db.commit()
        except Exception as e:
            logger.error(f"Session {session_id} failed:", exc_info=True)
            session.status = "failed"
            await db.commit()
            await ws_manager.send_to_session(session_id, {"type": "session_error", "data": {"error": str(e)}})
