from decimal import Decimal, ROUND_HALF_UP
from fastapi import APIRouter, HTTPException, Query
from tortoise.transactions import in_transaction
from uuid import uuid4

from api.curs import get_usd_rate_sum
from api.payloads import (
    AddressCreateRequest,
    AddressResponse,
    CheckoutPayRequest,
    CheckoutPayResponse,
    CheckoutPreviewRequest,
    CheckoutPreviewResponse,
    RecipientCreateRequest,
    RecipientResponse,
)
from database.models.balance import Balance
from database.models.basket import Basket
from database.models.location import Location
from database.models.order import Order, OrderItem
from database.models.recipient import Recipient
from database.models.statisticks import Statistics
from database.models.user import User
from api.i18n import normalize_lang, t

router = APIRouter()

DELIVERY_WINDOW = "В течение 30-59 мин"


def _line_sum_uzs(amount: Decimal, unit: str, price_per_kg_or_piece: Decimal) -> Decimal:
    if unit == "grams":
        return (amount / Decimal("1000")) * price_per_kg_or_piece
    return amount * price_per_kg_or_piece


def _address_full_text(location: Location) -> str:
    parts = [location.city, location.street, f"дом {location.house}"]
    if location.entrance:
        parts.append(f"подъезд {location.entrance}")
    if location.flat:
        parts.append(f"кв {location.flat}")
    if location.comment:
        parts.append(location.comment)
    return ", ".join(parts)


async def _get_user_by_tg_id(tg_id: int, lang: str = "ru") -> User:
    user = await User.get_or_none(tg_id=tg_id)
    if not user:
        raise HTTPException(status_code=404, detail=t("user_not_found", lang))
    if user.language != lang:
        user.language = lang
        await user.save()
    return user


async def _basket_total_uzs(user: User) -> Decimal:
    basket_items = await Basket.filter(user=user, status="active").prefetch_related("product")
    total = Decimal("0")
    for item in basket_items:
        total += _line_sum_uzs(
            amount=Decimal(item.amount),
            unit=item.product.unit,
            price_per_kg_or_piece=Decimal(item.product.price),
        )
    return total


def _calc_total_usd(total_sum_uzs: Decimal, usd_rate: float) -> Decimal:
    if usd_rate <= 0:
        raise HTTPException(status_code=500, detail="Некорректный курс USD")
    return (total_sum_uzs / Decimal(str(usd_rate))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


@router.get(
    "/addresses",
    response_model=list[AddressResponse],
    summary="Получить адреса пользователя",
    description="Возвращает сохраненные адреса. Используется при нажатии 'Добавить адрес'.",
    responses={
        200: {
            "description": "Список адресов пользователя",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "id": 1,
                            "city": "Самарканд",
                            "street": "ул. Буйук Ипак Йули",
                            "house": "21",
                            "entrance": "2",
                            "flat": "13",
                            "comment": "домофон нет, этаж 3",
                            "is_default": True,
                            "full_text": "Самарканд, ул. Буйук Ипак Йули, дом 21, подъезд 2, кв 13, домофон нет, этаж 3",
                        }
                    ]
                }
            },
        }
    },
)
async def get_addresses(
    tg_id: int = Query(..., description="Telegram user id"),
    lang: str = Query("ru", description="Язык ответа: ru/en/uz"),
):
    lang = normalize_lang(lang)
    user = await _get_user_by_tg_id(tg_id, lang)
    locations = await Location.filter(user=user).order_by("-is_default", "-id")
    return [
        AddressResponse(
            id=loc.id,
            city=loc.city,
            street=loc.street,
            house=loc.house,
            entrance=loc.entrance,
            flat=loc.flat,
            comment=loc.comment,
            is_default=loc.is_default,
            full_text=_address_full_text(loc),
        )
        for loc in locations
    ]


@router.post(
    "/addresses",
    response_model=AddressResponse,
    summary="Создать адрес пользователя",
    description=(
        "Создает новый адрес доставки. Минимально обязательны поля `city` и `street`. "
        "Если `is_default=true`, предыдущие default-адреса пользователя сбрасываются."
    ),
    responses={
        200: {
            "description": "Созданный адрес",
            "content": {
                "application/json": {
                    "example": {
                        "id": 11,
                        "city": "Самарканд",
                        "street": "Буйук Ипак Йули",
                        "house": "21A",
                        "entrance": "2",
                        "flat": "13",
                        "comment": "домофон нет",
                        "is_default": True,
                        "full_text": "Самарканд, Буйук Ипак Йули, дом 21A, подъезд 2, кв 13, домофон нет",
                    }
                }
            },
        },
        400: {"description": "Не заполнены обязательные поля city/street"},
    },
)
async def create_address(req: AddressCreateRequest):
    lang = normalize_lang(req.lang)
    user = await _get_user_by_tg_id(req.tg_id, lang)
    if not str(req.city or "").strip() or not str(req.street or "").strip():
        raise HTTPException(
            status_code=400,
            detail="Обязательные поля: город и улица"
            if lang == "ru"
            else ("Required fields: city and street" if lang == "en" else "Majburiy maydonlar: shahar va ko'cha"),
        )

    if req.is_default:
        await Location.filter(user=user, is_default=True).update(is_default=False)

    location = await Location.create(
        user=user,
        city=req.city.strip(),
        street=req.street.strip(),
        house=(req.house or "-").strip() or "-",
        entrance=req.entrance,
        flat=req.flat,
        comment=req.comment,
        is_default=req.is_default,
    )

    return AddressResponse(
        id=location.id,
        city=location.city,
        street=location.street,
        house=location.house,
        entrance=location.entrance,
        flat=location.flat,
        comment=location.comment,
        is_default=location.is_default,
        full_text=_address_full_text(location),
    )


@router.get(
    "/recipients",
    response_model=list[RecipientResponse],
    summary="Получить получателей пользователя",
    description="Возвращает сохраненных получателей. Используется при нажатии 'Добавить получателя'.",
    responses={
        200: {
            "description": "Список получателей",
            "content": {
                "application/json": {
                    "example": [
                        {"id": 1, "name": "Арманов Миша", "phone": "+998483575804", "is_default": True}
                    ]
                }
            },
        }
    },
)
async def get_recipients(
    tg_id: int = Query(..., description="Telegram user id"),
    lang: str = Query("ru", description="Язык ответа: ru/en/uz"),
):
    lang = normalize_lang(lang)
    user = await _get_user_by_tg_id(tg_id, lang)
    recipients = await Recipient.filter(user=user).order_by("-is_default", "-id")
    return [
        RecipientResponse(
            id=rec.id,
            name=rec.name,
            phone=rec.phone,
            is_default=rec.is_default,
        )
        for rec in recipients
    ]


@router.post(
    "/recipients",
    response_model=RecipientResponse,
    summary="Создать получателя",
    description=(
        "Создает нового получателя. Обязательны поля `name` и `phone`, поле `surname` опционально. "
        "Если `is_default=true`, предыдущие default-получатели пользователя сбрасываются."
    ),
    responses={
        200: {
            "description": "Созданный получатель",
            "content": {
                "application/json": {
                    "example": {
                        "id": 7,
                        "name": "Арманов Миша",
                        "phone": "+998483575804",
                        "is_default": True,
                    }
                }
            },
        },
        400: {"description": "Не заполнены обязательные поля name/phone"},
    },
)
async def create_recipient(req: RecipientCreateRequest):
    lang = normalize_lang(req.lang)
    user = await _get_user_by_tg_id(req.tg_id, lang)
    if not str(req.name or "").strip() or not str(req.phone or "").strip():
        raise HTTPException(
            status_code=400,
            detail="Обязательные поля: имя и телефон"
            if lang == "ru"
            else ("Required fields: name and phone" if lang == "en" else "Majburiy maydonlar: ism va telefon"),
        )
    if req.is_default:
        await Recipient.filter(user=user, is_default=True).update(is_default=False)

    full_name = f"{(req.surname or '').strip()} {req.name.strip()}".strip()
    recipient = await Recipient.create(
        user=user,
        name=full_name,
        phone=req.phone.strip(),
        is_default=req.is_default,
    )
    return RecipientResponse(
        id=recipient.id,
        name=recipient.name,
        phone=recipient.phone,
        is_default=recipient.is_default,
    )


@router.patch(
    "/addresses/{address_id}/select",
    response_model=AddressResponse,
    summary="Выбрать адрес по умолчанию",
    description="Делает выбранный адрес текущим (`is_default=true`) для пользователя.",
    responses={
        200: {
            "description": "Выбранный адрес",
            "content": {
                "application/json": {
                    "example": {
                        "id": 11,
                        "city": "Самарканд",
                        "street": "Буйук Ипак Йули",
                        "house": "21A",
                        "entrance": "2",
                        "flat": "13",
                        "comment": "домофон нет",
                        "is_default": True,
                        "full_text": "Самарканд, Буйук Ипак Йули, дом 21A, подъезд 2, кв 13, домофон нет",
                    }
                }
            },
        },
        404: {"description": "Адрес не найден"},
    },
)
async def select_address(
    address_id: int,
    tg_id: int = Query(..., description="Telegram user id"),
    lang: str = Query("ru", description="Язык ответа: ru/en/uz"),
):
    lang = normalize_lang(lang)
    user = await _get_user_by_tg_id(tg_id, lang)
    location = await Location.get_or_none(id=address_id, user=user)
    if not location:
        raise HTTPException(status_code=404, detail="Адрес не найден")

    await Location.filter(user=user, is_default=True).exclude(id=location.id).update(is_default=False)
    location.is_default = True
    await location.save()

    return AddressResponse(
        id=location.id,
        city=location.city,
        street=location.street,
        house=location.house,
        entrance=location.entrance,
        flat=location.flat,
        comment=location.comment,
        is_default=location.is_default,
        full_text=_address_full_text(location),
    )


@router.patch(
    "/recipients/{recipient_id}/select",
    response_model=RecipientResponse,
    summary="Выбрать получателя по умолчанию",
    description="Делает выбранного получателя текущим (`is_default=true`) для пользователя.",
    responses={
        200: {
            "description": "Выбранный получатель",
            "content": {
                "application/json": {
                    "example": {
                        "id": 7,
                        "name": "Арманов Миша",
                        "phone": "+998483575804",
                        "is_default": True,
                    }
                }
            },
        },
        404: {"description": "Получатель не найден"},
    },
)
async def select_recipient(
    recipient_id: int,
    tg_id: int = Query(..., description="Telegram user id"),
    lang: str = Query("ru", description="Язык ответа: ru/en/uz"),
):
    lang = normalize_lang(lang)
    user = await _get_user_by_tg_id(tg_id, lang)
    recipient = await Recipient.get_or_none(id=recipient_id, user=user)
    if not recipient:
        raise HTTPException(status_code=404, detail="Получатель не найден")

    await Recipient.filter(user=user, is_default=True).exclude(id=recipient.id).update(is_default=False)
    recipient.is_default = True
    await recipient.save()

    return RecipientResponse(
        id=recipient.id,
        name=recipient.name,
        phone=recipient.phone,
        is_default=recipient.is_default,
    )


@router.post(
    "/preview",
    response_model=CheckoutPreviewResponse,
    summary="Превью перед оплатой",
    description=(
        "Считает итог в сумах по корзине, подтягивает курс USD из ЦБ и вычисляет списание в USD. "
        "Также возвращает флаг can_pay для кнопки 'Оплатить'."
    ),
    responses={
        200: {
            "description": "Результат предварительного расчета checkout",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Preview ready",
                        "address_selected": True,
                        "recipient_selected": True,
                        "delivery_window": "В течение 30-59 мин",
                        "total_sum_uzs": 159135,
                        "usd_rate": 12091.22,
                        "usd_rate_date": "17.03.2026",
                        "total_usd": 13.16,
                        "balance_usd": 200,
                        "can_pay": True,
                        "disable_reason": None,
                    }
                }
            },
        }
    },
)
async def checkout_preview(req: CheckoutPreviewRequest):
    lang = normalize_lang(req.lang)
    user = await _get_user_by_tg_id(req.tg_id, lang)
    basket_total_uzs = await _basket_total_uzs(user)
    usd_rate, usd_rate_date = get_usd_rate_sum()
    total_usd = _calc_total_usd(basket_total_uzs, usd_rate)

    balance = await Balance.get_or_none(user=user)
    balance_usd = Decimal(str(balance.balance_usd if balance else 0))

    address_selected = bool(req.address_id)
    recipient_selected = bool(req.recipient_id)
    can_pay = True
    disable_reason = None

    if basket_total_uzs <= 0:
        can_pay = False
        disable_reason = "Корзина пуста" if lang == "ru" else ("Cart is empty" if lang == "en" else "Savat bo'sh")
    elif not address_selected:
        can_pay = False
        disable_reason = "Не выбран адрес" if lang == "ru" else ("Address is not selected" if lang == "en" else "Manzil tanlanmagan")
    elif not recipient_selected:
        can_pay = False
        disable_reason = "Не выбран получатель" if lang == "ru" else ("Recipient is not selected" if lang == "en" else "Qabul qiluvchi tanlanmagan")
    elif balance_usd < total_usd:
        can_pay = False
        disable_reason = t("insufficient_funds", lang)

    return CheckoutPreviewResponse(
        success=True,
        message="Preview ready" if lang == "en" else ("Preview tayyor" if lang == "uz" else "Превью готово"),
        address_selected=address_selected,
        recipient_selected=recipient_selected,
        delivery_window=DELIVERY_WINDOW,
        total_sum_uzs=float(basket_total_uzs),
        usd_rate=float(usd_rate),
        usd_rate_date=usd_rate_date,
        total_usd=float(total_usd),
        balance_usd=float(balance_usd),
        can_pay=can_pay,
        disable_reason=disable_reason,
    )


@router.post(
    "/pay",
    response_model=CheckoutPayResponse,
    summary="Оплатить корзину и создать заказ",
    description=(
        "Проводит финальный расчет в сумах и USD (по курсу ЦБ), списывает USD баланс, "
        "создает Order и OrderItem, очищает активную корзину и обновляет статистику. "
        "Номер заказа формируется в понятном последовательном формате: N1, N2, N3..."
    ),
    responses={
        200: {
            "description": "Заказ успешно создан и оплачен",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Заявка принята",
                        "order_number": "N154",
                        "status": "pending",
                        "total_sum_uzs": 159135,
                        "total_usd": 13.16,
                        "usd_rate": 12091.22,
                        "remaining_balance_usd": 186.84,
                    }
                }
            },
        },
        400: {"description": "Корзина пуста или недостаточно средств"},
    },
)
async def checkout_pay(req: CheckoutPayRequest):
    lang = normalize_lang(req.lang)
    user = await _get_user_by_tg_id(req.tg_id, lang)
    location = await Location.get_or_none(id=req.address_id, user=user)
    recipient = await Recipient.get_or_none(id=req.recipient_id, user=user)
    if not location:
        raise HTTPException(status_code=404, detail="Адрес не найден" if lang == "ru" else ("Address not found" if lang == "en" else "Manzil topilmadi"))
    if not recipient:
        raise HTTPException(status_code=404, detail="Получатель не найден" if lang == "ru" else ("Recipient not found" if lang == "en" else "Qabul qiluvchi topilmadi"))

    usd_rate, _ = get_usd_rate_sum()

    async with in_transaction() as conn:
        basket_items = await Basket.filter(user=user, status="active").using_db(conn).prefetch_related("product")
        if not basket_items:
            raise HTTPException(status_code=400, detail="Корзина пуста" if lang == "ru" else ("Cart is empty" if lang == "en" else "Savat bo'sh"))

        total_sum_uzs = Decimal("0")
        for item in basket_items:
            total_sum_uzs += _line_sum_uzs(
                amount=Decimal(item.amount),
                unit=item.product.unit,
                price_per_kg_or_piece=Decimal(item.product.price),
            )

        total_usd = _calc_total_usd(total_sum_uzs, usd_rate)
        balance, _ = await Balance.get_or_create(user=user, using_db=conn)
        if Decimal(str(balance.balance_usd)) < total_usd:
            raise HTTPException(status_code=400, detail=t("insufficient_funds", lang))

        balance.balance_usd = Decimal(str(balance.balance_usd)) - total_usd
        await balance.save(using_db=conn)

        order = await Order.create(
            order_number=f"tmp-{uuid4()}",
            status="pending",
            customer=user,
            recipient_name=recipient.name,
            recipient_phone=recipient.phone,
            delivery_address=_address_full_text(location),
            total_price=total_sum_uzs,
            total_price_usd=total_usd,
            using_db=conn,
        )
        order.order_number = f"N{order.id}"
        await order.save(using_db=conn)

        for item in basket_items:
            await OrderItem.create(
                order=order,
                product=item.product,
                amount=item.amount,
                price_at_purchase=item.product.price,
                using_db=conn,
            )
            item.status = "ordered"
            await item.save(using_db=conn)

    # Обновляем агрегированную статистику после успешной оплаты.
    day_stats = await Statistics.get_or_create_for_period(period_type="day")
    await day_stats.update_global_stats()
    month_stats = await Statistics.get_or_create_for_period(period_type="month")
    await month_stats.update_global_stats()

    return CheckoutPayResponse(
        success=True,
        message="Заявка принята" if lang == "ru" else ("Order accepted" if lang == "en" else "Buyurtma qabul qilindi"),
        order_number=order.order_number,
        status="pending",
        total_sum_uzs=float(total_sum_uzs),
        total_usd=float(total_usd),
        usd_rate=float(usd_rate),
        remaining_balance_usd=float(balance.balance_usd),
    )

