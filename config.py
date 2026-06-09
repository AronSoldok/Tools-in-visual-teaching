from os import getenv
from dotenv import load_dotenv
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.memory import MemoryStorage


class Settings:
    load_dotenv()
    BOT_TOKEN: str = str(getenv('BOT_TOKEN'))
    # Список ID администраторов - для отладки добавим значение по умолчанию
    ADMINS: list = (
        [
            admin.strip()
            for admin in str(getenv("ADMINS", "")).split(",")
            if admin.strip()
        ]
        if str(getenv("ADMINS", ""))
        else []
    )
    # API ключ для RegOS
    ENDPOINT_REGOS: str = str(getenv("ENDPOINT_REGOS"))
    # URL для WebApp (обязательный параметр)
    _webapp_url_raw: str = str(getenv("WEBAPP_URL", "")).strip()
    if not _webapp_url_raw:
        raise ValueError("WEBAPP_URL is required in .env")
    WEBAPP_URL: str = _webapp_url_raw
    
    # Данные для подключения к базе данных
    POSTGRES_HOST: str = str(getenv("POSTGRES_HOST"))
    POSTGRES_PORT: int = int(str(getenv("POSTGRES_PORT")))
    POSTGRES_DB: str = str(getenv("POSTGRES_DB"))
    POSTGRES_USER: str = str(getenv("POSTGRES_USER"))
    POSTGRES_PASSWORD: str = str(getenv("POSTGRES_PASSWORD"))
    ENABLE_LOGGING: bool = getenv("ENABLE_LOGGING", "True").lower() in ("true", "1", "yes")
    # Токен для бота, включаем сразу parse_mode и link_preview_is_disabled
    bot = Bot(
        token=BOT_TOKEN, 
        default=DefaultBotProperties(parse_mode=ParseMode.HTML, link_preview_is_disabled=True)
    )
    # Диспетчер для бота
    dp = Dispatcher(storage=MemoryStorage())
    # Модели для базы данных
    database_models = [
        "database.models.base",
        "database.models.user",
        "database.models.chapter",
        "database.models.product",
        "database.models.discounts",
        "database.models.staff",
        "database.models.order",
        "database.models.statisticks",
        "database.models.auth",
        "database.models.basket",
        "database.models.banner",
        "database.models.balance",
        "database.models.location",
        "database.models.recipient",
        "database.models.transfer",
                "database.models.regos_product_map",
                "database.models.regos_product_stock",
    ]

    TORTOISE_ORM = {
        "connections": {
            "default": {
                "engine": "tortoise.backends.asyncpg",
                "credentials": {
                    "database": POSTGRES_DB,
                    "host": POSTGRES_HOST,
                    "password": POSTGRES_PASSWORD,
                    "port": POSTGRES_PORT,
                    "user": POSTGRES_USER,
                }
            }
        },
        "apps": {
            "models": {
                "models": database_models,
                "default_connection": "default"
            }
        }
    }

settings = Settings()
