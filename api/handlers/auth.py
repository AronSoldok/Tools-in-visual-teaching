from fastapi import APIRouter, HTTPException
from database.models.user import User
from database.models.auth import SmsCode
from api.payloads import AuthCheckRequest, PhoneRequest, VerifyCodeRequest, AuthResponse
from api.i18n import normalize_lang, t
from datetime import datetime, timedelta, timezone
import random
import logging

# Импортируем клиент (уже реализован на aiohttp в supportiv_function/eskiz.py)
# from supportiv_function.eskiz import eskiz_client
# Или можно создать его здесь через Depends/инициализацию

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post(
    "/check",
    response_model=AuthResponse,
    summary="Проверка регистрации пользователя",
    description="Фронт вызывает при старте WebApp. По `tg_id` определяет, зарегистрирован ли пользователь.",
    responses={
        200: {
            "description": "Результат проверки регистрации",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Check completed",
                        "is_registered": True,
                        "display_name": "Chelovetishe",
                        "tg_id": 209684758,
                        "phone_number": "+998901234567",
                    }
                }
            },
        }
    },
)
async def check_registration(req: AuthCheckRequest):
    """
    Проверяет, зарегистрирован ли пользователь.
    """
    lang = normalize_lang(req.lang)
    user = await User.get_or_none(tg_id=req.tg_id)
    display_name = None
    phone_number = None
    if user:
        if user.language != lang:
            user.language = lang
            await user.save()
        display_name = user.name or user.username or "Пользователь"
        phone_number = user.phone_number

    return AuthResponse(
        success=True,
        message=t("check_completed", lang),
        is_registered=user is not None,
        display_name=display_name,
        tg_id=req.tg_id,
        phone_number=phone_number,
    )

@router.post(
    "/send-code",
    response_model=AuthResponse,
    summary="Отправка SMS-кода",
    description="Фронт вызывает после ввода телефона. В dev-режиме код печатается в консоли backend.",
    responses={
        200: {
            "description": "Код успешно создан и отправлен",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Code sent successfully",
                    }
                }
            },
        },
        500: {"description": "Ошибка отправки SMS"},
    },
)
async def send_code(req: PhoneRequest):
    """
    Генерирует и отправляет 5-значный код через SMS.
    """
    lang = normalize_lang(req.lang)
    code = f"{random.randint(10000, 99999)}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
    
    # Сохраняем код в БД
    await SmsCode.create(
        phone_number=req.phone_number,
        code=code,
        expires_at=expires_at
    )
    
    # ВЫВОД КОДА В КОНСОЛЬ ДЛЯ ТЕСТИРОВАНИЯ (т.к. шлюз не подключен)
    print(f"\n{'='*20}")
    print(f"SMS CODE FOR {req.phone_number}: {code}")
    print(f"{'='*20}\n")
    
    logger.info(f"Generated code {code} for {req.phone_number}")
    
    # В реальности тут вызов eskiz_client.send_sms
    # sent = await eskiz_client.send_sms(req.phone_number, f"Ваш код подтверждения: {code}")
    sent = True # Заглушка для отладки
    
    if sent:
        return AuthResponse(success=True, message=t("code_sent", lang))
    else:
        raise HTTPException(status_code=500, detail=t("sms_send_failed", lang))


@router.post(
    "/send-code-debug",
    response_model=AuthResponse,
    summary="Отправка SMS-кода (debug, с кодом в ответе)",
    description=(
        "DEV-метод для фронтенда. Генерирует и сохраняет SMS-код, "
        "а также возвращает его в поле `debug_sms_code`."
    ),
)
async def send_code_debug(req: PhoneRequest):
    lang = normalize_lang(req.lang)
    code = f"{random.randint(10000, 99999)}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)

    await SmsCode.create(
        phone_number=req.phone_number,
        code=code,
        expires_at=expires_at,
    )

    print(f"\n{'='*20}")
    print(f"SMS CODE FOR {req.phone_number}: {code}")
    print(f"{'='*20}\n")

    return AuthResponse(
        success=True,
        message=t("code_sent", lang),
        debug_sms_code=code,
    )

@router.post(
    "/verify-code",
    response_model=AuthResponse,
    summary="Проверка SMS-кода и регистрация",
    description=(
        "Фронт вызывает после ввода 5-значного кода. "
        "При успехе создаёт нового пользователя или обновляет существующего."
    ),
    responses={
        200: {
            "description": "Код подтверждён, пользователь зарегистрирован",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "User registered successfully",
                        "is_registered": True,
                        "display_name": "Chelovetishe",
                        "tg_id": 209684758,
                        "phone_number": "+998901234567",
                    }
                }
            },
        },
        400: {"description": "Неверный или просроченный код"},
    },
)
async def verify_code(req: VerifyCodeRequest):
    """
    Проверяет код и создает/обновляет пользователя.
    """
    lang = normalize_lang(req.lang)
    print(f"DEBUG: verify_code received: {req.dict()}")
    display_name = req.username or req.name or "Пользователь"
    sms_code = await SmsCode.filter(
        phone_number=req.phone_number,
        code=req.code,
        expires_at__gt=datetime.now(timezone.utc),
        is_verified=False
    ).order_by("-id").first()
    
    if not sms_code:
        raise HTTPException(status_code=400, detail=t("invalid_or_expired_code", lang))
    
    # Помечаем код как использованный
    sms_code.is_verified = True
    await sms_code.save()
    
    # Создаем или обновляем пользователя
    user, created = await User.update_or_create(
        tg_id=req.tg_id,
        defaults={
            "phone_number": req.phone_number,
            "name": display_name,
            "surname": req.surname,
            "username": req.username,
            "language": lang,
        }
    )
    
    return AuthResponse(
        success=True, 
        message=t("user_registered", lang) if created else t("user_updated", lang),
        is_registered=True,
        display_name=user.name or user.username or "Пользователь",
        tg_id=user.tg_id,
        phone_number=user.phone_number,
    )
