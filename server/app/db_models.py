from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    uid = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=True)
    credits = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    charges = relationship("Charge", back_populates="user", cascade="all, delete-orphan")
    consumptions = relationship(
        "Consumption", back_populates="user", cascade="all, delete-orphan"
    )


class Charge(Base):
    __tablename__ = "charges"

    id = Column(String, primary_key=True)
    uid = Column(String, ForeignKey("users.uid"), nullable=False)
    price_id = Column(String, nullable=True)
    quantity = Column(Integer, nullable=False, default=1)
    credits_added = Column(Integer, nullable=False)
    amount_total_jpy = Column(Integer, nullable=False)
    currency = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    user = relationship("User", back_populates="charges")


class Consumption(Base):
    __tablename__ = "consumptions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    uid = Column(String, ForeignKey("users.uid"), nullable=False)
    credits_used = Column(Integer, nullable=False)
    reason = Column(Text, nullable=True)
    request_id = Column(String, nullable=True, index=True)
    refunded = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    user = relationship("User", back_populates="consumptions")
