import asyncio
from aiogram import Bot
from aiogram.types import BotCommand
from tortoise import Tortoise

from config import settings
from supportiv_function.logger import get_logger, init_logging

# Инициализируем систему логирования при старте приложения
init_logging()
logger = get_logger(__name__)



async def init_db():
    """Инициализация базы данных"""
    await Tortoise.init(config=settings.TORTOISE_ORM)
    await Tortoise.generate_schemas()
    logger.info("База данных инициализирована")


async def close_db():
    """Закрытие соединения с базой данных"""
    await Tortoise.close_connections()
    logger.info("Соединение с базой данных закрыто")

from aiogram import types, F
from aiogram.filters import Command
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

async def set_bot_commands(bot: Bot):
    """Устанавливает команды бота для отображения в меню автодополнения"""
    commands = [
        BotCommand(command="start", description="Запустить бота"),
    ]
    await bot.set_my_commands(commands)
    logger.info("Команды бота установлены")

@settings.dp.message(Command("start"))
async def start_command(message: types.Message):
    """Обработка команды /start"""
    markup = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="Открыть админку", web_app=WebAppInfo(url=settings.WEBAPP_URL))]
    ])
    
    await message.answer(
        f"<b>Привет, {message.from_user.first_name}!</b>\n\n"
        f"Добро пожаловать в <b>Админ бота для трёх проектов</b>. Нажмите на кнопку ниже, чтобы войти в кабинет администратора.",
        reply_markup=markup
    )

async def main():
    """Основная функция запуска бота"""
    try:        
        # Инициализация базы данных
        await init_db()
        
        # Настройка команд бота
        await set_bot_commands(settings.bot)
        
        # Подключение роутеров бота
        from test.test_command import router as test_router
        settings.dp.include_router(test_router)
        
        logger.info("Запуск бота...")
        await settings.dp.start_polling(settings.bot)
        
    except Exception as e:
        logger.error(f"Ошибка при запуске бота: {e}")
    finally:
        # Закрытие базы данных
        await close_db()


if __name__ == "__main__":
    asyncio.run(main())
