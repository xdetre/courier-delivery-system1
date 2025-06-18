from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi.security import OAuth2PasswordBearer

from database import AsyncSessionLocal
from models import CourierAccount, Courier

router = APIRouter(prefix="/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# 📌 JWT настройки
SECRET_KEY = "92b3ff7a6b47e83f13e53fd0d7d9e8f9e91b87e73a901627e3e56cf1b7bcd41e"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 30  # 30 дней

# 📌 Контекст хеширования паролей
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 📌 Асинхронная сессия
async def get_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session

# 📌 Pydantic модели
class UserCreate(BaseModel):
    phone: str
    password: str
    name: str

class UserLogin(BaseModel):
    phone: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

# 📌 Регистрация

@router.post("/register")
async def register(data: UserCreate, session: AsyncSession = Depends(get_session)):
    # Проверяем, нет ли уже такого телефона
    result = await session.execute(
        select(CourierAccount).where(CourierAccount.phone == data.phone)
    )
    user = result.scalar_one_or_none()
    if user:
        raise HTTPException(status_code=400, detail="Пользователь уже зарегистрирован")

    # Хешируем пароль и создаём аккаунт
    hashed_password = pwd_context.hash(data.password)
    new_user = CourierAccount(phone=data.phone, password_hash=hashed_password)
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)

    # Создаём курьера с именем и привязываем к account_id
    new_courier = Courier(
        name=data.name,
        status="offline",
        account_id=new_user.id
    )
    session.add(new_courier)
    await session.commit()
    await session.refresh(new_courier)

    return {
        "message": "Регистрация успешна",
        "courier_id": new_courier.id
    }



# 📌 Логин + выдача токена
@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(CourierAccount).where(CourierAccount.phone == data.phone)
    )
    user = result.scalar_one_or_none()
    if not user or not pwd_context.verify(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверный номер или пароль")

    access_token = create_access_token(data={"sub": user.phone})
    return {"access_token": access_token}


def verify_token(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        phone = payload.get("sub")
        if phone is None:
            raise HTTPException(status_code=401, detail="Неверный токен")
        return phone
    except JWTError:
        raise HTTPException(status_code=401, detail="Неверный токен")


@router.get("/secure-data")
async def get_secure_data(user_phone: str = Depends(verify_token)):
    return {"message": f"Привет, {user_phone}"}


# 📌 Функция генерации JWT токена
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@router.delete("/account/{account_id}")
async def delete_account(account_id: int, session: AsyncSession = Depends(get_session)):
    account = await session.get(CourierAccount, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Аккаунт не найден")

    await session.delete(account)
    await session.commit()
    return {"message": f"Аккаунт с id {account_id} удалён"}



