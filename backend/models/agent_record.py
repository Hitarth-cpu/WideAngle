from datetime import datetime
from sqlalchemy import String, Text, DateTime, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from backend.core.database import Base


class AgentRecord(Base):
    __tablename__ = "agent_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("sessions.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(100))
    persona: Mapped[str] = mapped_column(Text)
    role: Mapped[str] = mapped_column(Text)
    stage: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), default="idle")
    output: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
