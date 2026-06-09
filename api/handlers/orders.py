from fastapi import APIRouter, HTTPException, Query

from api.payloads import ActiveOrderResponse, OrderDetailsResponse
from database.models.order import Order
from database.models.user import User
from api.i18n import normalize_lang, t

router = APIRouter()


@router.get(
    "/active",
    response_model=ActiveOrderResponse,
    summary="Получить активный заказ",
    description=(
        "Используется для верхней плашки на главном экране. "
        "Возвращает последний заказ в статусе pending/assembling/delivering."
    ),
    responses={
        200: {
            "description": "Активный заказ найден или отсутствует",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "order_number": "N154",
                        "status": "assembling",
                        "total_sum_uzs": 41990,
                    }
                }
            },
        }
    },
)
async def get_active_order(
    tg_id: int = Query(..., description="Telegram user id"),
    lang: str = Query("ru", description="Язык ответа: ru/en/uz"),
):
    lang = normalize_lang(lang)
    user = await User.get_or_none(tg_id=tg_id)
    if not user:
        raise HTTPException(status_code=404, detail=t("user_not_found", lang))
    if user.language != lang:
        user.language = lang
        await user.save()

    order = (
        await Order.filter(customer=user, status__in=["pending", "assembling", "delivering"])
        .order_by("-id")
        .first()
    )

    if not order:
        return ActiveOrderResponse(success=True)

    return ActiveOrderResponse(
        success=True,
        order_number=order.order_number,
        status=order.status,
        total_sum_uzs=float(order.total_price),
    )


@router.get(
    "/{order_number}",
    response_model=OrderDetailsResponse,
    summary="Детали заказа",
    description="Возвращает состав заказа для модального окна.",
    responses={
        200: {
            "description": "Детали заказа",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "order_number": "N154",
                        "status": "delivering",
                        "delivery_address": "Самарканд, ул. Буйук Ипак Йули, дом 21",
                        "recipient_name": "Арманов Миша",
                        "recipient_phone": "+998483575804",
                        "total_sum_uzs": 41990,
                        "items": [
                            {
                                "product_id": 1,
                                "product_name": "Сыр President",
                                "amount": 1,
                                "unit": "pcs",
                                "unit_price_sum": 41990,
                            }
                        ],
                    }
                }
            },
        },
        404: {"description": "Пользователь или заказ не найден"},
    },
)
async def get_order_details(
    order_number: str,
    tg_id: int = Query(..., description="Telegram user id"),
    lang: str = Query("ru", description="Язык ответа: ru/en/uz"),
):
    lang = normalize_lang(lang)
    user = await User.get_or_none(tg_id=tg_id)
    if not user:
        raise HTTPException(status_code=404, detail=t("user_not_found", lang))
    if user.language != lang:
        user.language = lang
        await user.save()

    order = await Order.get_or_none(order_number=order_number, customer=user).prefetch_related("items__product")
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    items = []
    for item in order.items:
        items.append(
            {
                "product_id": item.product.id,
                "product_name": item.product.name,
                "amount": float(item.amount),
                "unit": item.product.unit,
                "unit_price_sum": float(item.price_at_purchase),
            }
        )

    return {
        "success": True,
        "order_number": order.order_number,
        "status": order.status,
        "delivery_address": order.delivery_address,
        "recipient_name": order.recipient_name,
        "recipient_phone": order.recipient_phone,
        "total_sum_uzs": float(order.total_price),
        "items": items,
    }

