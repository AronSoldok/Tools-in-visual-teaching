from fastapi import APIRouter, HTTPException, Query
from typing import List
from database.models.user import User
from database.models.balance import Balance
from database.models.transfer import TransferHistory
from tortoise.transactions import in_transaction
from tortoise.expressions import Q
from api.payloads import (
    TransferHistoryItem,
    TransferHistoryResponse,
    TransferPreviewResponse,
    TransferRequest,
    TransferSearchResponse,
    TransferSendResponse,
    TransferUserInfo,
)
from api.i18n import normalize_lang, t

router = APIRouter()


def _normalize_phone_digits(value: str) -> str:
    return "".join(ch for ch in value if ch.isdigit())

@router.get(
    "/search",
    response_model=TransferSearchResponse,
    summary="Шаг 1: Поиск получателя",
    description=(
        "Используется на экране поиска по номеру. "
        "Возвращает список пользователей, подходящих по телефону, кроме самого отправителя."
    ),
    responses={
        200: {
            "description": "Результат поиска получателя",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Найдено пользователей: 1",
                        "users": [
                            {
                                "tg_id": 100500100,
                                "name": "Ольга Картункова",
                                "phone": "+998888888888",
                            }
                        ],
                    }
                }
            },
        }
    },
)
async def search_user(
    phone: str = Query(..., description="Телефон получателя (частично или полностью)"),
    sender_tg_id: int = Query(..., description="TG id отправителя"),
    lang: str = Query("ru", description="Язык ответа: ru/en/uz"),
):
    """
    Шаг 1 для фронта: поиск пользователя по номеру телефона.
    Возвращает список подходящих пользователей (кроме самого отправителя).
    """
    lang = normalize_lang(lang)
    clean_phone = _normalize_phone_digits(phone)
    if not clean_phone:
        return TransferSearchResponse(success=False, message="Введите номер телефона", users=[])

    # Сужаем поиск через БД и затем нормализуем в python,
    # чтобы корректно учитывать формат с пробелами/плюсом.
    candidates = await User.filter(
        Q(phone_number__contains=clean_phone) | Q(phone_number__contains=phone.strip()),
        phone_number__not_isnull=True,
    ).limit(50)

    filtered = []
    for user in candidates:
        if user.tg_id == sender_tg_id:
            continue
        user_digits = _normalize_phone_digits(user.phone_number or "")
        if clean_phone in user_digits or user_digits in clean_phone:
            filtered.append(user)

    if not filtered:
        return TransferSearchResponse(
            success=False,
            message="Пользователи с похожим номером не найдены",
            users=[],
        )

    return TransferSearchResponse(
        success=True,
        message="Найдено пользователей: %d" % len(filtered),
        users=[
            TransferUserInfo(
                tg_id=u.tg_id,
                name=u.name or u.username or "Без имени",
                phone=u.phone_number or "",
            )
            for u in filtered
        ],
    )

@router.get(
    "/preview",
    response_model=TransferPreviewResponse,
    summary="Шаг 2: Превью перед переводом",
    description=(
        "Вызывается после выбора пользователя из поиска. "
        "Возвращает баланс отправителя и данные получателя для экрана ввода суммы."
    ),
    responses={
        200: {
            "description": "Данные для экрана ввода суммы",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Preview ready",
                        "sender_tg_id": 209684758,
                        "receiver_tg_id": 100500100,
                        "receiver_name": "Ольга Картункова",
                        "receiver_phone": "+998888888888",
                        "sender_balance_usd": 327,
                    }
                }
            },
        },
        400: {"description": "Попытка перевода самому себе"},
        404: {"description": "Отправитель или получатель не найден"},
    },
)
async def preview_transfer(
    sender_tg_id: int = Query(..., description="TG id отправителя"),
    receiver_tg_id: int = Query(..., description="TG id получателя"),
    lang: str = Query("ru", description="Язык ответа: ru/en/uz"),
):
    """
    Шаг 2 для фронта: получить данные перед вводом суммы.
    Нужен для экрана с карточками "Ваш баланс" и "Получатель".
    """
    lang = normalize_lang(lang)
    sender_user = await User.get_or_none(tg_id=sender_tg_id)
    receiver_user = await User.get_or_none(tg_id=receiver_tg_id)

    if not sender_user or not receiver_user:
        raise HTTPException(status_code=404, detail=t("user_not_found", lang))
    if sender_tg_id == receiver_tg_id:
        raise HTTPException(status_code=400, detail="Нельзя перевести себе")
    if sender_user.language != lang:
        sender_user.language = lang
        await sender_user.save()

    sender_balance = await Balance.get_or_none(user=sender_user)
    return TransferPreviewResponse(
        success=True,
        message="Preview ready",
        sender_tg_id=sender_tg_id,
        receiver_tg_id=receiver_tg_id,
        receiver_name=receiver_user.name or receiver_user.username or "Без имени",
        receiver_phone=receiver_user.phone_number or "",
        sender_balance_usd=float(sender_balance.balance_usd) if sender_balance else 0.0,
    )

@router.post(
    "/send",
    response_model=TransferSendResponse,
    summary="Шаг 3: Выполнить перевод",
    description=(
        "Проверяет сумму, доступный баланс, выполняет перевод и создаёт запись в истории."
    ),
    responses={
        200: {
            "description": "Перевод выполнен успешно",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Перевод успешно выполнен",
                        "transfer_id": 55,
                        "sender_balance_usd": 27,
                        "receiver_balance_usd": 410,
                    }
                }
            },
        },
        400: {
            "description": "Некорректная сумма или недостаточно средств",
            "content": {
                "application/json": {
                    "examples": {
                        "not_enough": {"value": {"detail": "Недостаточно средств"}},
                        "bad_amount": {"value": {"detail": "Сумма должна быть больше нуля"}},
                    }
                }
            },
        },
        404: {"description": "Отправитель или получатель не найден"},
    },
)
async def send_transfer(req: TransferRequest):
    """
    Шаг 3 для фронта: выполнить перевод.
    Проверяет сумму и доступный баланс, создаёт запись в истории.
    """
    lang = normalize_lang(req.lang)
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Сумма должна быть больше нуля")
        
    async with in_transaction() as conn:
        sender_user = await User.get_or_none(tg_id=req.sender_tg_id).using_db(conn)
        receiver_user = await User.get_or_none(tg_id=req.receiver_tg_id).using_db(conn)
        
        if not sender_user or not receiver_user:
            raise HTTPException(status_code=404, detail=t("user_not_found", lang))
        if sender_user.language != lang:
            sender_user.language = lang
            await sender_user.save(using_db=conn)
            
        sender_balance = await Balance.get_or_none(user=sender_user).using_db(conn)
        if not sender_balance or sender_balance.balance_usd < req.amount:
            raise HTTPException(status_code=400, detail=t("insufficient_funds", lang))
            
        receiver_balance, _ = await Balance.get_or_create(user=receiver_user, using_db=conn)
        
        # Перевод
        sender_balance.balance_usd -= req.amount
        receiver_balance.balance_usd += req.amount
        
        await sender_balance.save(using_db=conn)
        await receiver_balance.save(using_db=conn)
        
        # Запись в историю
        transfer = await TransferHistory.create(
            sender=sender_user,
            receiver=receiver_user,
            amount=req.amount,
            using_db=conn
        )
        
    return TransferSendResponse(
        success=True,
        message=t("transfer_success", lang),
        transfer_id=transfer.id,
        sender_balance_usd=float(sender_balance.balance_usd),
        receiver_balance_usd=float(receiver_balance.balance_usd),
    )

@router.get(
    "/history",
    response_model=TransferHistoryResponse,
    summary="Шаг 4: История переводов",
    description=(
        "Возвращает объединённую историю отправок и получений для bottom-sheet."
    ),
    responses={
        200: {
            "description": "История переводов пользователя",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "items": [
                            {
                                "id": 55,
                                "type": "send",
                                "amount": 25,
                                "date": "16.03.2026",
                                "partner_name": "Ольга Картункова",
                                "partner_phone": "+998888888888",
                            },
                            {
                                "id": 54,
                                "type": "receive",
                                "amount": 10,
                                "date": "15.03.2026",
                                "partner_name": "Wanderer",
                                "partner_phone": "+998901234567",
                            },
                        ],
                    }
                }
            },
        },
        404: {"description": "Пользователь не найден"},
    },
)
async def get_history(
    tg_id: int = Query(..., description="TG id пользователя, для которого нужна история"),
    limit: int = Query(50, ge=1, le=200, description="Максимум записей истории"),
    lang: str = Query("ru", description="Язык ответа: ru/en/uz"),
):
    """
    Шаг 4 для фронта: история переводов для bottom-sheet.
    """
    lang = normalize_lang(lang)
    user = await User.get_or_none(tg_id=tg_id)
    if not user:
        raise HTTPException(status_code=404, detail=t("user_not_found", lang))
    if user.language != lang:
        user.language = lang
        await user.save()
        
    sent = await TransferHistory.filter(sender=user).prefetch_related('receiver').limit(limit)
    received = await TransferHistory.filter(receiver=user).prefetch_related('sender').limit(limit)
    
    history = []
    
    for s in sent:
        history.append({
            "id": s.id,
            "type": "send",
            "amount": float(s.amount),
            "date": s.created_at.strftime("%d.%m.%Y"),
            "partner_name": s.receiver.name or s.receiver.username or "Без имени",
            "partner_phone": s.receiver.phone_number or ""
        })
        
    for r in received:
        history.append({
            "id": r.id,
            "type": "receive",
            "amount": float(r.amount),
            "date": r.created_at.strftime("%d.%m.%Y"),
            "partner_name": r.sender.name or r.sender.username or "Без имени",
            "partner_phone": r.sender.phone_number or ""
        })
        
    history.sort(key=lambda x: x["id"], reverse=True)
    history = history[:limit]
    
    return TransferHistoryResponse(success=True, items=history)
