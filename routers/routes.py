from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import Courier
from database import AsyncSessionLocal
from typing import Optional

router = APIRouter()

# ===============================
# 📌 Модели данных для курьеров
# ===============================

class CouriersCreate(BaseModel):
    name: str
    status: str

class CourierUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None


# ===============================
# 📌 Асинхронная сессия
# ===============================

async def get_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session


# ===============================
# 📌 Эндпоинты для курьеров
# ===============================

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


# ===============================
# 📌 Модели и эндпоинты для трекинга
# ===============================

courier_positions = {}

class PositionUpdate(BaseModel):
    courier_id: int
    latitude: float
    longitude: float


@router.post("/tracking/update_position")
async def update_position(data: PositionUpdate):
    courier_positions[data.courier_id] = {
        "lat": data.latitude,
        "lon": data.longitude
    }
    return {"message": "Position updated"}


@router.get("/tracking/position/{courier_id}")
async def get_position(courier_id: int):
    if courier_id not in courier_positions:
        raise HTTPException(status_code=404, detail="Position not found")
    return courier_positions[courier_id]


@router.get("/tracking/all_positions")
async def get_all_positions():
    return courier_positions



# GET — получить
# POST — создать
# PUT — заменить
# PATCH — частично изменить
# DELETE — удалить