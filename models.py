from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Courier(Base):
    __tablename__ = "couriers"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("courier_accounts.id"), unique=True)
    name = Column(String, nullable=False)
    status = Column(String, default="offline")
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    current_order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    last_active = Column(DateTime, nullable=True)
    completed_orders_count = Column(Integer, default=0)

    account = relationship("CourierAccount", back_populates="courier")
    orders = relationship(
        "Order",
        back_populates="courier",
        foreign_keys="Order.courier_id"
    )


class CourierAccount(Base):
    __tablename__ = "courier_accounts"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Integer, default=1)
    last_login = Column(DateTime, nullable=True)

    courier = relationship("Courier", back_populates="account", uselist=False)


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    address = Column(String, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    status = Column(String, default="pending")
    courier_id = Column(Integer, ForeignKey("couriers.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    assigned_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)

    recipient_name = Column(String, nullable=True)
    recipient_phone = Column(String, nullable=True)
    comment = Column(String, nullable=True)
    price = Column(Float, nullable=True)

    courier = relationship(
        "Courier",
        back_populates="orders",
        foreign_keys=[courier_id]   # <-- вот это добавляем
    )