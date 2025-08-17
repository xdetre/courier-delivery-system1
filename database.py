from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "postgresql+asyncpg://courier_user:qwer52@db:5432/delivery"

# Создаём движок
engine = create_async_engine(DATABASE_URL, echo=False)

# Создаём фабрику сессий
AsyncSessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

# Базовый класс для моделей
Base = declarative_base()

# Dependency для FastAPI
async def get_async_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
