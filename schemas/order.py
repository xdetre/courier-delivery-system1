from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime

class OrderCreate(BaseModel):
    address: str = Field(..., min_length=5, max_length=200, description="Адрес доставки")
    latitude: Optional[float] = Field(None, ge=-90, le=90, description="Широта")
    longitude: Optional[float] = Field(None, ge=-180, le=180, description="Долгота")
    recipient_name: Optional[str] = Field(None, max_length=100, description="Имя получателя")
    recipient_phone: Optional[str] = Field(None, max_length=20, description="Телефон получателя")
    comment: Optional[str] = Field(None, max_length=500, description="Комментарий к заказу")
    price: Optional[float] = Field(None, ge=0, description="Стоимость заказа")
    
    @field_validator('recipient_phone')
    @classmethod
    def validate_phone(cls, v):
        if v and not v.startswith('+'):
            raise ValueError('Телефон должен начинаться с +')
        return v

class OrderRead(BaseModel):
    id: int
    address: str
    status: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    created_at: datetime
    assigned_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    courier_id: Optional[int] = None
    recipient_name: Optional[str] = None
    recipient_phone: Optional[str] = None
    comment: Optional[str] = None
    price: Optional[float] = None

    class Config:
        from_attributes = True
