from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import AsyncSessionLocal
from models import Courier

router = APIRouter(prefix="/tracking", tags=["tracking"])

# 📦 Асинхронная сессия
async def get_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session

# 📍 Модель данных для позиции курьера
class PositionUpdate(BaseModel):
    courier_id: int
    latitude: float
    longitude: float

# 📍 Обновление позиции курьера в БД
@router.post("/update_position")
async def update_position(data: PositionUpdate, session: AsyncSession = Depends(get_session)):
    courier = await session.get(Courier, data.courier_id)
    if not courier:
        raise HTTPException(status_code=404, detail="Courier not found")

    courier.latitude = data.latitude
    courier.longitude = data.longitude

    await session.commit()
    await session.refresh(courier)

    return {"message": "Position updated"}

# 📍 Получение позиции одного курьера
@router.get("/position/{courier_id}")
async def get_position(courier_id: int, session: AsyncSession = Depends(get_session)):
    courier = await session.get(Courier, courier_id)
    if not courier:
        raise HTTPException(status_code=404, detail="Courier not found")

    if courier.latitude is None or courier.longitude is None:
        raise HTTPException(status_code=404, detail="Position not available")

    return {"latitude": courier.latitude, "longitude": courier.longitude}

# 📍 Получение всех позиций курьеров
@router.get("/all_positions")
async def get_all_positions(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Courier))
    couriers = result.scalars().all()

    positions = [
        {
            "courier_id": c.id,
            "name": c.name,
            "latitude": c.latitude,
            "longitude": c.longitude
        }
        for c in couriers if c.latitude is not None and c.longitude is not None
    ]

    return positions
