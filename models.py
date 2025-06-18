from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Courier(Base):
    __tablename__ = "couriers"

    id= Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("courier_accounts.id"), unique=True)
    name = Column(String)
    status = Column(String)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    account = relationship("CourierAccount", back_populates="courier")


class CourierAccount(Base):
    __tablename__ = "courier_accounts"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    courier = relationship("Courier", back_populates="account", uselist=False)