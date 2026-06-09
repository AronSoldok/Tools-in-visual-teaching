from decimal import Decimal
from fastapi import APIRouter, HTTPException, Query

from api.payloads import (
    CartItemAdjustRequest,
    CartItemRequest,
    CartItemResponse,
    CartItemUpdateRequest,
    CartResponse,
)
from database.models.basket import Basket
from database.models.product import Product
from database.models.user import User
from api.i18n import normalize_lang, t

router = APIRouter()


def _line_sum_uzs(amount: Decimal, unit: str, price_per_kg_or_piece: Decimal) -> Decimal:
    if unit == "grams":
        return (amount / Decimal("1000")) * price_per_kg_or_piece
    return amount * price_per_kg_or_piece


async def _build_cart_response(tg_id: int, lang: str = "ru") -> CartResponse:
    user = await User.get_or_none(tg_id=tg_id)
    if not user:
        raise HTTPException(status_code=404, detail=t("user_not_found", lang))

    basket_items = await (
        Basket.filter(user=user, status="active").prefetch_related("product").order_by("id")
    )
    items = []
    total_sum = Decimal("0")
    for item in basket_items:
        line_sum = _line_sum_uzs(
            amount=Decimal(item.amount),
            unit=item.product.unit,
            price_per_kg_or_piece=Decimal(item.product.price),
        )
        total_sum += line_sum
        items.append(
            CartItemResponse(
                basket_item_id=item.id,
                product_id=item.product.id,
                product_name=item.product.name,
                unit=item.product.unit,
                amount=float(item.amount),
                price_sum=float(line_sum),
                image_url=item.product.image_url,
            )
        )

    return CartResponse(
        success=True,
        tg_id=tg_id,
        items=items,
        total_sum=float(total_sum),
        item_count=len(items),
    )


@router.get(
    "",
    response_model=CartResponse,
    summary="Получить корзину",
    description="Возвращает текущую корзину пользователя и итоговую сумму в сумах.",
    responses={
        200: {
            "description": "Текущее состояние корзины",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "tg_id": 8129149096,
                        "items": [
                            {
                                "basket_item_id": 12,
                                "product_id": 1,
                                "product_name": "Сыр President",
                                "unit": "pcs",
                                "amount": 2,
                                "price_sum": 83980,
                                "image_url": "https://...",
                            }
                        ],
                        "total_sum": 83980,
                        "item_count": 1,
                    }
                }
            },
        }
    },
)
async def get_cart(
    tg_id: int = Query(..., description="Telegram user id"),
    lang: str = Query("ru", description="Язык ответа: ru/en/uz"),
):
    lang = normalize_lang(lang)
    return await _build_cart_response(tg_id, lang)


@router.post(
    "/items",
    response_model=CartResponse,
    summary="Добавить товар в корзину",
    description=(
        "Добавляет товар в корзину или увеличивает количество, если товар уже есть в корзине."
    ),
    responses={200: {"description": "Обновленная корзина после добавления"}},
)
async def add_cart_item(req: CartItemRequest):
    lang = normalize_lang(req.lang)
    user = await User.get_or_none(tg_id=req.tg_id)
    if not user:
        raise HTTPException(status_code=404, detail=t("user_not_found", lang))
    if user.language != lang:
        user.language = lang
        await user.save()

    product = await Product.get_or_none(id=req.product_id, is_active=True)
    if not product:
        raise HTTPException(status_code=404, detail=t("product_not_found", lang))

    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Количество должно быть больше нуля")

    existing = await Basket.get_or_none(user=user, product=product, status="active")
    if existing:
        existing.amount = Decimal(existing.amount) + Decimal(str(req.amount))
        await existing.save()
    else:
        await Basket.create(
            user=user,
            product=product,
            amount=Decimal(str(req.amount)),
            status="active",
        )

    return await _build_cart_response(req.tg_id, lang)


@router.patch(
    "/items/{item_id}",
    response_model=CartResponse,
    summary="Изменить количество товара в корзине",
    description="Обновляет количество/вес товара. Если amount <= 0, позиция удаляется.",
    responses={200: {"description": "Обновленная корзина после изменения"}},
)
async def update_cart_item(
    item_id: int,
    req: CartItemUpdateRequest,
    tg_id: int = Query(..., description="Telegram user id"),
    lang: str = Query("ru", description="Язык ответа: ru/en/uz"),
):
    lang = normalize_lang(req.lang or lang)
    user = await User.get_or_none(tg_id=tg_id)
    if not user:
        raise HTTPException(status_code=404, detail=t("user_not_found", lang))
    if user.language != lang:
        user.language = lang
        await user.save()

    item = await Basket.get_or_none(id=item_id, user=user, status="active")
    if not item:
        raise HTTPException(status_code=404, detail="Элемент корзины не найден")

    if req.amount <= 0:
        await item.delete()
    else:
        item.amount = Decimal(str(req.amount))
        await item.save()

    return await _build_cart_response(tg_id, lang)


@router.post(
    "/items/{item_id}/adjust",
    response_model=CartResponse,
    summary="Шаговое изменение количества в корзине",
    description=(
        "Изменяет количество товара на шаг. Для `grams` по умолчанию шаг 200г, "
        "для `pcs` шаг 1. Если количество <= 0, позиция удаляется."
    ),
    responses={200: {"description": "Обновленная корзина после + / -"}},
)
async def adjust_cart_item(
    item_id: int,
    req: CartItemAdjustRequest,
    tg_id: int = Query(..., description="Telegram user id"),
):
    lang = normalize_lang(req.lang)
    user = await User.get_or_none(tg_id=tg_id)
    if not user:
        raise HTTPException(status_code=404, detail=t("user_not_found", lang))
    if user.language != lang:
        user.language = lang
        await user.save()

    item = await Basket.get_or_none(id=item_id, user=user, status="active").prefetch_related("product")
    if not item:
        raise HTTPException(status_code=404, detail="Элемент корзины не найден")

    if req.delta == 0:
        return await _build_cart_response(tg_id, lang)

    default_step = Decimal("200") if item.product.unit == "grams" else Decimal("1")
    step = Decimal(str(req.step)) if req.step and req.step > 0 else default_step
    new_amount = Decimal(str(item.amount)) + (Decimal(req.delta) * step)

    if new_amount <= 0:
        await item.delete()
    else:
        item.amount = new_amount
        await item.save()

    return await _build_cart_response(tg_id, lang)


@router.delete(
    "/items/{item_id}",
    response_model=CartResponse,
    summary="Удалить товар из корзины",
    description="Удаляет выбранную позицию из активной корзины пользователя.",
    responses={200: {"description": "Обновленная корзина после удаления"}},
)
async def delete_cart_item(
    item_id: int,
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

    item = await Basket.get_or_none(id=item_id, user=user, status="active")
    if not item:
        raise HTTPException(status_code=404, detail="Элемент корзины не найден")

    await item.delete()
    return await _build_cart_response(tg_id, lang)

