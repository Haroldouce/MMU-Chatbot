# models.py
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, Text, DateTime, Boolean
from datetime import datetime

class Base(DeclarativeBase):
    pass

class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # matches auth.users.id (UUID)
    username: Mapped[str] = mapped_column(String(100), nullable=True)
    role: Mapped[str] = mapped_column(String(20), default='user')
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    email: Mapped[str] = mapped_column(Text, nullable=True)