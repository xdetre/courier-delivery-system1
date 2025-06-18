import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from logging.config import fileConfig
from sqlalchemy import create_engine, pool
from alembic import context

from models import Base
from database import DATABASE_URL  # 👈 подключаем твой URL отсюда

# Alembic конфиг
config = context.config

# Логгер
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Мета-данные моделей
target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Офлайн-миграции (генерация SQL без подключения к БД)"""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Онлайн-миграции (с подключением к БД)"""

    # создаём СИНХРОННЫЙ движок
    connectable = create_engine(
        DATABASE_URL.replace("asyncpg", "psycopg2"),
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
