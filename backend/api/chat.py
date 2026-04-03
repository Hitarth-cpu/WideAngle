import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.core.database import get_db
from backend.models.session import Session
from backend.models.message import Message

router = APIRouter(prefix="/sessions", tags=["Chat"])
_agent_registry: dict[str, dict] = {}


class ChatRequest(BaseModel):
    message: str
    agent_name: str


@router.post("/{session_id}/chat")
async def chat_with_agent(session_id: str, req: ChatRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Session).where(Session.id == session_id))
    if not result.scalar_one_or_none():
        raise HTTPException(404, "Session not found")
    agent = _agent_registry.get(session_id, {}).get(req.agent_name)
    if not agent:
        raise HTTPException(404, f"Agent '{req.agent_name}' not found for this session")
    response = await agent.chat(req.message)
    for role, content in (("user", req.message), ("agent", response)):
        db.add(Message(id=str(uuid.uuid4()), session_id=session_id,
                       agent_id=agent.id, role=role, content=content))
    await db.flush()
    return {"agent": req.agent_name, "response": response}


def register_session_agents(session_id: str, agents: dict) -> None:
    _agent_registry[session_id] = agents
