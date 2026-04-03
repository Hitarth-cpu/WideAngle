import uuid
from backend.models.session import Session, SessionStatus
from backend.models.agent_record import AgentRecord
from backend.models.message import Message


def test_session_fields():
    s = Session(id=str(uuid.uuid4()), mode="startup", input_type="code",
                input_text="test", status=SessionStatus.PENDING)
    assert s.mode == "startup"
    assert s.status == "pending"


def test_agent_record_fields():
    a = AgentRecord(id=str(uuid.uuid4()), session_id=str(uuid.uuid4()),
                    name="Market Analyst", persona="VC", role="Analyze", stage=1)
    assert a.stage == 1


def test_message_fields():
    m = Message(id=str(uuid.uuid4()), session_id=str(uuid.uuid4()),
                agent_id=str(uuid.uuid4()), role="user", content="Why small TAM?")
    assert m.role == "user"


def test_session_status_enum():
    assert SessionStatus.PENDING == "pending"
    assert SessionStatus.DONE == "done"
