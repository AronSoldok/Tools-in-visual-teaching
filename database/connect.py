from tortoise import Tortoise
from config import settings


async def init_database():
    await Tortoise.init(config=settings.TORTOISE_ORM)
    await Tortoise.generate_schemas()


async def close_database():
    await Tortoise.close_connections()
