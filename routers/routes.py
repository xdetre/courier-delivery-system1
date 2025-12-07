from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import Courier, CourierAccount, Order
from database import AsyncSessionLocal
from typing import Optional, List
from schemas.order import OrderRead

from routers.auth import verify_token, oauth2_scheme

router = APIRouter()

# ===============================
# 📌 Модели данных для курьеров
# ===============================

class CouriersCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    status: str = Field(..., description="Статус: avail, unavail или offline")
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        if v not in ['avail', 'unavail', 'offline']:
            raise ValueError('Статус должен быть: avail, unavail или offline')
        return v

class CourierUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    status: Optional[str] = None
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        if v is not None and v not in ['avail', 'unavail', 'offline']:
            raise ValueError('Статус должен быть: avail, unavail или offline')
        return v

class StatusUpdate(BaseModel):
    status: str = Field(..., description="Статус: avail или unavail")
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        if v not in ['avail', 'unavail']:
            raise ValueError('Статус должен быть: avail или unavail')
        return v

# ===============================
# 📌 Асинхронная сессия
# ===============================

async def get_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session


# ===============================
# 📌 Эндпоинты для курьеров
# ===============================

@router.patch("/couriers/status")
async def update_status(
    status_data: StatusUpdate,
    session: AsyncSession = Depends(get_session),
    phone: str = Depends(verify_token)):

    result = await session.execute(
        select(Courier).join(CourierAccount, Courier.account_id == CourierAccount.id).where(
            CourierAccount.phone == phone)
    )
    courier = result.scalar_one_or_none()
    if not courier:
        raise HTTPException(status_code=404, detail="Курьер не найден")

    courier.status = status_data.status
    await session.commit()
    await session.refresh(courier)
    return {"message": "Статус успешно обновлен", "new_status": courier.status}

@router.get("/couriers/me")
async def get_current_courier(
    session: AsyncSession = Depends(get_session),
    phone: str = Depends(verify_token)):

    result = await session.execute(
        select(Courier).join(CourierAccount, Courier.account_id == CourierAccount.id).where(
            CourierAccount.phone == phone)
    )
    courier = result.scalar_one_or_none()
    if not courier:
        raise HTTPException(status_code=404, detail="Курьер не найден")
    return {"id": courier.id, "name": courier.name, "status": courier.status}



@router.get("/couriers")
async def get_couriers(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Courier))
    couriers = result.scalars().all()
    return [{"id": c.id, "name": c.name, "status": c.status} for c in couriers]


@router.get("/couriers/{courier_id}")
async def get_courier(courier_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.get(Courier, courier_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Courier with id {courier_id} not found")
    return {"id": result.id, "name": result.name, "status": result.status}


@router.post("/couriers")
async def create_courier(courier: CouriersCreate, session: AsyncSession = Depends(get_session)):
    new_courier = Courier(name=courier.name, status=courier.status)
    session.add(new_courier)
    await session.commit()
    await session.refresh(new_courier)
    return {"id": new_courier.id, "name": new_courier.name, "status": new_courier.status}


@router.delete("/couriers/{courier_id}")
async def delete_courier(courier_id: int, session: AsyncSession = Depends(get_session)):
    courier = await session.get(Courier, courier_id)
    if courier is None:
        raise HTTPException(status_code=404, detail=f"Courier with id {courier_id} not found")
    await session.delete(courier)
    await session.commit()
    return {"message": f"Courier with id {courier_id} has been deleted"}


@router.put("/couriers/{courier_id}")
async def update_courier(courier_id: int, updated_data: CouriersCreate, session: AsyncSession = Depends(get_session)):
    courier = await session.get(Courier, courier_id)
    if not courier:
        raise HTTPException(status_code=404, detail=f"Courier with id {courier_id} not found")
    courier.name = updated_data.name
    courier.status = updated_data.status
    await session.commit()
    await session.refresh(courier)
    return {"id": courier.id, "name": courier.name, "status": courier.status}



@router.patch("/couriers/{courier_id}")
async def patch_courier(courier_id: int, updated_data: CourierUpdate, session: AsyncSession = Depends(get_session)):
    courier = await session.get(Courier, courier_id)
    if not courier:
        raise HTTPException(status_code=404, detail=f"Courier with id {courier_id} not found")
    if updated_data.name is not None:
        courier.name = updated_data.name
    if updated_data.status is not None:
        courier.status = updated_data.status
    await session.commit()
    await session.refresh(courier)
    return {"id": courier.id, "name": courier.name, "status": courier.status}




# 📌 Получить все заказы конкретного курьера
@router.get("/couriers/{courier_id}/orders", response_model=List[OrderRead])
async def get_orders_by_courier(courier_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(Order).where(Order.courier_id == courier_id)
    )
    orders = result.scalars().all()
    return orders



# GET — получить
# POST — создать
# PUT — заменить
# PATCH — частично изменить
# DELETE — удалить

#fz9I{8tP+m:n6