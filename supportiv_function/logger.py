import logging
from logging import NullHandler
from config import settings

# Флаг для отслеживания инициализации
_initialized = False


def init_logging():
    """
    Инициализирует систему логирования на основе ENABLE_LOGGING.
    Должна быть вызвана при старте приложения для настройки корневого logger'а
    и отключения логирования библиотек при необходимости.
    """
    global _initialized
    if _initialized:
        return
    
    root_logger = logging.getLogger()
    
    if not settings.ENABLE_LOGGING:
        # Отключаем все логирование
        root_logger.handlers.clear()
        root_logger.addHandler(NullHandler())
        root_logger.setLevel(logging.CRITICAL)
        # Отключаем логирование для популярных библиотек
        logging.getLogger('aiogram').setLevel(logging.CRITICAL)
        logging.getLogger('tortoise').setLevel(logging.CRITICAL)
        logging.getLogger('asyncpg').setLevel(logging.CRITICAL)
        logging.getLogger('aiohttp').setLevel(logging.CRITICAL)
    else:
        # Настраиваем базовое логирование
        if not root_logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            root_logger.addHandler(handler)
            root_logger.setLevel(logging.INFO)
    
    _initialized = True


def get_logger(name: str) -> logging.Logger:
    """
    Возвращает настроенный logger в зависимости от значения ENABLE_LOGGING.
    
    Args:
        name: Имя модуля (обычно __name__)
        
    Returns:
        Logger: Настроенный logger. Если ENABLE_LOGGING = False, 
                возвращает logger с NullHandler (логи не выводятся).
    """
    # Инициализируем логирование при первом вызове, если еще не инициализировано
    if not _initialized:
        init_logging()
    
    logger = logging.getLogger(name)
    
    # Если логирование отключено, настраиваем logger для отключения вывода
    if not settings.ENABLE_LOGGING:
        # Удаляем все существующие handlers
        logger.handlers.clear()
        # Добавляем NullHandler, который ничего не выводит
        logger.addHandler(NullHandler())
        # Устанавливаем уровень CRITICAL, чтобы даже случайные логи не проходили
        logger.setLevel(logging.CRITICAL)
        # Отключаем распространение на родительские loggers
        logger.propagate = False
    else:
        # Если логирование включено, используем наследование от корневого logger'а
        # Устанавливаем уровень логирования (наследуется от корневого, но можно переопределить)
        logger.setLevel(logging.INFO)
        # Разрешаем распространение на родительские loggers для использования корневого handler'а
        logger.propagate = True
    
    return logger

