from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from database import AsyncSessionLocal
from models import Courier

router = APIRouter(prefix="/tracking", tags=["tracking"])

# Список всех подключений
active_admins: list[WebSocket] = []
active_couriers: dict[int, WebSocket] = {}  # courier_id -> WebSocket

async def get_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session

active_couriers = {}  # словарь {courier_id: websocket}

# 📍 WebSocket для курьеров (отправка координат)
@router.websocket("/ws/courier/{courier_id}")
async def courier_ws(websocket: WebSocket, courier_id: int, session: AsyncSession = Depends(get_session)):
    await websocket.accept()
    active_couriers[courier_id] = websocket
    print(f"✅ Курьер {courier_id} подключился по WebSocket")

    try:
        while True:
            data = await websocket.receive_json()
            # например, позиции от курьера
            lat = data.get("latitude")
            lon = data.get("longitude")
            print(f"📍 Курьер {courier_id}: {lat}, {lon}")

            # ✅ сохраняем координаты в БД
            await session.execute(
                update(Courier)
                .where(Courier.id == courier_id)
                .values(latitude=lat, longitude=lon)
            )
            await session.commit()


    except WebSocketDisconnect:
        print(f"❌ Курьер {courier_id} отключился")
        active_couriers.pop(courier_id, None)


# 📍 WebSocket для админов (получение всех позиций)
@router.websocket("/ws/admin")
async def admin_ws(websocket: WebSocket, session: AsyncSession = Depends(get_session)):
    await websocket.accept()
    active_admins.append(websocket)
    print("✅ Админ подключился")

    try:
        # При подключении сразу отправляем текущие позиции
        await broadcast_positions(session)

        while True:
            await websocket.receive_text()  # ждём, но админ ничего не шлёт

    except WebSocketDisconnect:
        print("❌ Админ отключился")
        active_admins.remove(websocket)

# 📤 Отправка всем админам
async def broadcast_positions(session: AsyncSession):
    result = await session.execute(select(Courier))
    couriers = result.scalars().all()

    positions = [
        {
            "courier_id": c.id,
            "name": c.name,
            "latitude": c.latitude,
            "longitude": c.longitude,
            "status": c.status
        }
        for c in couriers if c.latitude is not None and c.longitude is not None
    ]

    for admin_ws in active_admins:
        await admin_ws.send_json(positions)


@router.get("/all_positions")
async def get_all_positions(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Courier))
    couriers = result.scalars().all()

    return [
        {
            "courier_id": c.id,
            "name": c.name,
            "latitude": c.latitude,
            "longitude": c.longitude,
            "status": c.status
        }
        for c in couriers if c.latitude is not None and c.longitude is not None
    ]