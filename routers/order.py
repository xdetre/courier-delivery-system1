from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from database import AsyncSessionLocal
from models import Order, Courier, CourierAccount
from schemas.order import OrderCreate, OrderRead
from typing import List
from datetime import datetime
from sqlalchemy import func
from routers.auth import verify_token

router = APIRouter(
    prefix="/orders",
    tags=["Orders"]
)

async def get_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session

@router.post("/{order_id}/complete")
async def complete_order(
    order_id: int,
    session: AsyncSession = Depends(get_session),
    phone: str = Depends(verify_token)
):
    # Получаем курьера по телефону
    result = await session.execute(
        select(Courier).join(CourierAccount).where(CourierAccount.phone == phone)
    )
    courier = result.scalar_one_or_none()

    if not courier:
        raise HTTPException(status_code=404, detail="Courier not found")

    # Получаем заказ
    order = await session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Проверяем принадлежность заказа курьеру
    if order.courier_id != courier.id:
        raise HTTPException(status_code=403, detail="This order is not assigned to you")

    if order.status != "assigned":
        raise HTTPException(status_code=400, detail="Order is not in 'assigned' status")

    # Обновляем статус
    order.status = "delivered"
    order.delivered_at = datetime.utcnow()
    
    # Обновляем счетчик завершенных заказов у курьера
    courier.completed_orders_count = (courier.completed_orders_count or 0) + 1
    courier.current_order_id = None  # Освобождаем текущий заказ

    await session.commit()
    await session.refresh(order)

    return {"message": f"Order {order_id} marked as delivered"}


# Получить все свободные заказы
@router.get("/available", response_model=List[OrderRead])
async def get_available_orders(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Order).where(Order.status == "pending"))
    orders = result.scalars().all()
    return orders

# Создать новый заказ
@router.post("/", response_model=OrderRead)
async def create_order(order: OrderCreate, session: AsyncSession = Depends(get_session)):
    new_order = Order(**order.model_dump())
    session.add(new_order)
    await session.commit()
    await session.refresh(new_order)
    return new_order

# Назначить заказ курьеру вручную
@router.post("/{order_id}/assign/{courier_id}")
async def assign_order(order_id: int, courier_id: int, session: AsyncSession = Depends(get_session)):
    order = await session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    courier = await session.get(Courier, courier_id)
    if not courier:
        raise HTTPException(status_code=404, detail="Courier not found")

    # 🛑 Проверяем, есть ли у курьера уже активный заказ
    result = await session.execute(
        select(Order).where(
            Order.courier_id == courier_id,
            Order.status == "assigned"
        )
    )
    existing_order = result.scalar_one_or_none()

    if existing_order:
        raise HTTPException(
            status_code=400,
            detail=f"Courier {courier_id} already has an active order (ID {existing_order.id})"
        )

    if order.status != "pending":
        raise HTTPException(status_code=400, detail="Order is not available")

    # ✅ Назначаем заказ
    order.courier_id = courier_id
    order.status = "assigned"
    order.assigned_at = datetime.utcnow()
    courier.current_order_id = order_id  # Обновляем текущий заказ курьера

    await session.commit()
    await session.refresh(order)

    return {"message": f"Order {order_id} assigned to courier {courier_id}"}



# Получить активный заказ курьера
@router.get("/couriers/{courier_id}/active-order", response_model=OrderRead)
async def get_active_order(courier_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(Order).where(Order.courier_id == courier_id, Order.status == "assigned")
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="No active order")
    return order


@router.get("/nearest/{courier_id}")
async def get_nearest_order(courier_id: int, session: AsyncSession = Depends(get_session)):
    courier = await session.get(Courier, courier_id)
    if not courier:
        raise HTTPException(status_code=404, detail="Courier not found")

    result = await session.execute(
        select(Order).where(Order.status == "pending")
        .order_by(func.sqrt(func.pow(Order.latitude - courier.latitude, 2) + func.pow(Order.longitude - courier.longitude, 2)))
        .limit(1)
    )
    nearest_order = result.scalar_one_or_none()
    if not nearest_order:
        return {}

    return {
        "id": nearest_order.id,
        "address": nearest_order.address,
        "recipient_name": nearest_order.recipient_name,
        "recipient_phone": nearest_order.recipient_phone,
        "comment": nearest_order.comment
    }

@router.delete("/{order_id}")
async def delete_order(order_id: int, session: AsyncSession = Depends(get_session)):
    order = await session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    await session.delete(order)
    await session.commit()

    return {"message": f"Order {order_id} has been deleted"}


# # Создать тестовый заказ с произвольными координатами
# @router.post("/test/create", response_model=OrderRead)
# async def create_test_order(session: AsyncSession = Depends(get_session)):
#     """Создает тестовый заказ с произвольными координатами в районе Махачкалы"""
#     import random
#
#     # Центр Махачкалы: 42.98306, 47.50472
#     # Генерируем случайные координаты в радиусе ~2км
#     base_lat = 42.98306
#     base_lon = 47.50472
#
#     # Случайное смещение в пределах ~2км (примерно 0.018 градуса)
#     lat_offset = random.uniform(-0.015, 0.015)
#     lon_offset = random.uniform(-0.015, 0.015)
#
#     test_order = Order(
#         address=f"ул. Тестовая, {random.randint(1, 200)}, кв. {random.randint(1, 50)}",
#         latitude=base_lat + lat_offset,
#         longitude=base_lon + lon_offset,
#         recipient_name=f"Тестовый получатель {random.randint(1, 100)}",
#         recipient_phone=f"+7999{random.randint(1000000, 9999999)}",
#         comment=f"Тестовый заказ. Код домофона: {random.randint(10, 99)}К",
#         price=round(random.uniform(100, 1000), 2),
#         status="pending"
#     )
#
#     session.add(test_order)
#     await session.commit()
#     await session.refresh(test_order)
#
#     return test_order


