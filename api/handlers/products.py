from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from database.models.product import Product
from database.models.chapter import Chapter, Category, Subcategory
from database.models.banner import Banner
from database.models.balance import Balance
from database.models.user import User
from database.models.regos_product_stock import RegosProductStock
from api.i18n import normalize_lang, t
from decimal import Decimal
import random
from tortoise.expressions import Q

router = APIRouter()

class ProductSchema(BaseModel):
    id: int
    name: str
    description: Optional[str]
    price: float
    old_price: Optional[float] = None # Цена без скидки
    discount_percentage: int = 0
    image_url: Optional[str]
    shelf_life: Optional[str]
    unit: str
    stock_quantity: float = 0

class SectionSchema(BaseModel):
    id: int
    name: str
    icon_url: Optional[str]

class BannerSchema(BaseModel):
    id: int
    image_url: str
    title: Optional[str]
    description: Optional[str]
    link_url: Optional[str]

class MainScreenResponse(BaseModel):
    balance_usd: float
    user_name: str
    sections: List[SectionSchema]
    banners: List[BannerSchema]
    promo_products: List[ProductSchema]
    random_products: List[ProductSchema]


class SubcategoryProductsSchema(BaseModel):
    subcategory_id: int
    subcategory_name: str
    products: List[ProductSchema]


class ChapterProductsResponse(BaseModel):
    chapter_id: int
    chapter_name: str
    total_products: int
    subcategories: List[SubcategoryProductsSchema]


class CategoryTreeSubcategory(BaseModel):
    id: int
    name: str


class CategoryTreeCategory(BaseModel):
    id: int
    name: str
    subcategories: List[CategoryTreeSubcategory]


class CategoryTreeChapter(BaseModel):
    id: int
    name: str
    categories: List[CategoryTreeCategory]


class CategoryProductsResponse(BaseModel):
    category_id: int
    category_name: str
    chapter_id: int
    chapter_name: str
    total_products: int
    subcategories: List[SubcategoryProductsSchema]


class SubcategoryProductsResponse(BaseModel):
    subcategory_id: int
    subcategory_name: str
    category_id: int
    category_name: str
    chapter_id: int
    chapter_name: str
    total_products: int
    products: List[ProductSchema]


class ProductSearchItem(BaseModel):
    id: int
    name: str
    description: Optional[str]
    price: float
    image_url: Optional[str]
    shelf_life: Optional[str]
    unit: str
    chapter_id: int
    chapter_name: str
    subcategory_id: int
    subcategory_name: str
    stock_quantity: float = 0


async def _stock_map_for_products(products: List[Product]) -> dict:
    product_ids = [p.id for p in products]
    if not product_ids:
        return {}
    stock_rows = await RegosProductStock.filter(product_id__in=product_ids)
    return {row.product_id: float(row.quantity) for row in stock_rows}


def _product_payload(p: Product, stock_map: dict) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "description": p.description,
        "price": float(p.price),
        "image_url": p.image_url,
        "shelf_life": p.shelf_life,
        "unit": p.unit,
        "stock_quantity": float(stock_map.get(p.id, 0)),
    }

@router.get(
    "/main",
    response_model=MainScreenResponse,
    summary="Главный экран WebApp",
    description=(
        "Возвращает данные для главного экрана: имя пользователя, баланс, баннеры и товары. "
        "Фронт вызывает после успешной авторизации и при открытии WebApp для зарегистрированного пользователя."
    ),
    responses={
        200: {
            "description": "Данные главного экрана",
            "content": {
                "application/json": {
                    "example": {
                        "balance_usd": 200,
                        "user_name": "Soliumas",
                        "sections": [
                            {"id": 1, "name": "Доставка продуктов", "icon_url": "https://..."}
                        ],
                        "banners": [
                            {
                                "id": 1,
                                "image_url": "https://...",
                                "title": "Скидки недели",
                                "description": "До -30%",
                                "link_url": "https://...",
                            }
                        ],
                        "promo_products": [],
                        "random_products": [],
                    }
                }
            },
        },
        404: {"description": "Пользователь не найден"},
    },
)
async def get_main_screen_data(
    tg_id: int = Query(..., description="Telegram user id текущего пользователя"),
    lang: str = Query("ru", description="Язык ответа: ru/en/uz"),
):
    lang = normalize_lang(lang)
    # 1. Получаем пользователя и баланс
    user = await User.get_or_none(tg_id=tg_id)
    if not user:
        raise HTTPException(status_code=404, detail=t("user_not_found", lang))
    if user.language != lang:
        user.language = lang
        await user.save()
    
    balance = await Balance.get_or_none(user=user)
    balance_val = float(balance.balance_usd) if balance else 0.0
    
    # 2. Разделы (Chapters)
    chapter_ids = await Product.filter(is_active=True).values_list(
        "subcategory__category__chapter_id",
        flat=True,
    )
    chapter_ids = sorted(set(chapter_ids))
    chapters = await Chapter.filter(is_active=True, id__in=chapter_ids).order_by("name").limit(50)
    sections = [
        {"id": c.id, "name": c.name, "icon_url": c.image_url} 
        for c in chapters
    ]
    
    # 3. Баннеры
    banners_db = await Banner.filter(is_active=True).order_by('order')
    banners = [
        {
            "id": b.id, 
            "image_url": b.image_url, 
            "title": b.title, 
            "description": b.description,
            "link_url": b.link_url
        } for b in banners_db
    ]
    
    # 4. Товары со скидкой (Логика: выбираем товары, у которых есть связанные Discount)
    # Для упрощения сейчас возьмем любые 10 товаров
    all_products = await Product.filter(is_active=True).limit(20)
    
    promo_list = []
    random_list = []
    
    stock_map = await _stock_map_for_products(all_products)
    for p in all_products:
        item = _product_payload(p, stock_map)
        # Тут в будущем будет расчет скидки через подгрузку Discount модели
        random_list.append(item)
    
    return {
        "balance_usd": balance_val,
        "user_name": user.name or user.username or "Пользователь",
        "sections": sections,
        "banners": banners,
        "promo_products": random_list[:10], # Пока берем первые 10
        "random_products": random_list[10:]
    }


@router.get(
    "/chapter/{chapter_id}",
    response_model=ChapterProductsResponse,
    summary="Товары по разделу",
    description=(
        "Возвращает все товары указанного раздела, сгруппированные по подкатегориям. "
        "Используется фронтом при нажатии на раздел (например, 'Мясо и курица')."
    ),
    responses={
        200: {
            "description": "Список товаров раздела",
            "content": {
                "application/json": {
                    "example": {
                        "chapter_id": 9,
                        "chapter_name": "Мясо и курица",
                        "total_products": 12,
                        "subcategories": [
                            {
                                "subcategory_id": 31,
                                "subcategory_name": "Говядина",
                                "products": [
                                    {
                                        "id": 101,
                                        "name": "Говядина мякоть",
                                        "description": "Охлажденная говядина",
                                        "price": 89900,
                                        "old_price": None,
                                        "discount_percentage": 0,
                                        "image_url": "https://...",
                                        "shelf_life": "3 д.",
                                        "unit": "grams",
                                        "stock_quantity": 42,
                                    }
                                ],
                            }
                        ],
                    }
                }
            },
        },
        404: {"description": "Раздел не найден"},
    },
)
async def get_products_by_chapter(
    chapter_id: int,
    tg_id: Optional[int] = Query(None, description="Telegram user id текущего пользователя"),
    lang: str = Query("ru", description="Язык ответа: ru/en/uz"),
):
    lang = normalize_lang(lang)
    chapter = await Chapter.get_or_none(id=chapter_id, is_active=True)
    if not chapter:
        raise HTTPException(status_code=404, detail="Раздел не найден")

    if tg_id is not None:
        user = await User.get_or_none(tg_id=tg_id)
        if user and user.language != lang:
            user.language = lang
            await user.save()

    categories = await Category.filter(chapter=chapter, is_active=True).prefetch_related("subcategories")

    subcategory_rows = []
    total_products = 0

    for category in categories:
        subcategories = await Subcategory.filter(category=category, is_active=True)
        for sub in subcategories:
            products = await Product.filter(subcategory=sub, is_active=True)
            stock_map = await _stock_map_for_products(products)
            products_payload = [
                _product_payload(p, stock_map)
                for p in products
            ]
            total_products += len(products_payload)
            subcategory_rows.append(
                {
                    "subcategory_id": sub.id,
                    "subcategory_name": sub.name,
                    "products": products_payload,
                }
            )

    return {
        "chapter_id": chapter.id,
        "chapter_name": chapter.name,
        "total_products": total_products,
        "subcategories": subcategory_rows,
    }


@router.get(
    "/categories",
    response_model=List[CategoryTreeChapter],
    summary="Список категорий каталога",
    description=(
        "Возвращает дерево категорий: разделы -> категории -> подкатегории. "
        "Используется фронтом для меню категорий и навигации."
    ),
    responses={
        200: {
            "description": "Полное дерево категорий",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "id": 1,
                            "name": "Овощи и фрукты",
                            "categories": [
                                {
                                    "id": 1,
                                    "name": "Основное",
                                    "subcategories": [
                                        {"id": 1, "name": "Зелень и салаты"},
                                        {"id": 2, "name": "Огурцы и помидоры"},
                                    ],
                                }
                            ],
                        }
                    ]
                }
            },
        }
    },
)
async def get_categories_tree(lang: str = Query("ru", description="Язык ответа: ru/en/uz")):
    _ = normalize_lang(lang)
    chapters = await Chapter.filter(is_active=True).order_by("id")
    result = []
    for chapter in chapters:
        categories = await Category.filter(chapter=chapter, is_active=True).order_by("id")
        categories_payload = []
        for category in categories:
            subcategories = await Subcategory.filter(category=category, is_active=True).order_by("id")
            categories_payload.append(
                {
                    "id": category.id,
                    "name": category.name,
                    "subcategories": [{"id": s.id, "name": s.name} for s in subcategories],
                }
            )
        result.append({"id": chapter.id, "name": chapter.name, "categories": categories_payload})
    return result


@router.get(
    "/search",
    response_model=List[ProductSearchItem],
    summary="Поиск товаров",
    description=(
        "Ищет товары по ключевому слову в названии/описании. "
        "Если передан `chapter_id`, ограничивает поиск выбранным разделом."
    ),
    responses={
        200: {
            "description": "Результаты поиска",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "id": 1,
                            "name": "Сыр President рассольный Greco",
                            "description": "Рассольный сыр",
                            "price": 41990,
                            "image_url": "https://...",
                            "shelf_life": "3 д.",
                            "unit": "pcs",
                            "chapter_id": 8,
                            "chapter_name": "Сырная лавка",
                            "subcategory_id": 22,
                            "subcategory_name": "Твердый сыр",
                            "stock_quantity": 13,
                        }
                    ]
                }
            },
        }
    },
)
async def search_products(
    q: str = Query("", description="Ключевое слово поиска"),
    chapter_id: Optional[int] = Query(None, description="Ограничить поиск по разделу"),
    limit: int = Query(50, ge=1, le=200, description="Максимум товаров в ответе"),
    lang: str = Query("ru", description="Язык ответа: ru/en/uz"),
):
    _ = normalize_lang(lang)
    term = q.strip()
    query = Product.filter(is_active=True).prefetch_related("subcategory__category__chapter")

    if chapter_id is not None:
        query = query.filter(subcategory__category__chapter_id=chapter_id)

    if term:
        query = query.filter(Q(name__icontains=term) | Q(description__icontains=term))

    products = await query.limit(limit)
    stock_map = await _stock_map_for_products(products)

    result = []
    for p in products:
        chapter = p.subcategory.category.chapter
        result.append(
            {
                "id": p.id,
                "name": p.name,
                "description": p.description,
                "price": float(p.price),
                "image_url": p.image_url,
                "shelf_life": p.shelf_life,
                "unit": p.unit,
                "chapter_id": chapter.id,
                "chapter_name": chapter.name,
                "subcategory_id": p.subcategory.id,
                "subcategory_name": p.subcategory.name,
                "stock_quantity": float(stock_map.get(p.id, 0)),
            }
        )
    return result

@router.get(
    "/category/{category_id}",
    response_model=CategoryProductsResponse,
    summary="Товары по категории",
    description=(
        "Возвращает все товары указанной категории, сгруппированные по подкатегориям. "
        "Например: нажали на 'ШАМПУНИ' внутри раздела 'ХИМИЯ' — получили только шампуни."
    ),
    responses={
        200: {
            "description": "Товары категории",
            "content": {
                "application/json": {
                    "example": {
                        "category_id": 3,
                        "category_name": "ШАМПУНИ",
                        "chapter_id": 2,
                        "chapter_name": "ХИМИЯ",
                        "total_products": 18,
                        "subcategories": [
                            {
                                "subcategory_id": 10,
                                "subcategory_name": "Общее",
                                "products": [
                                    {
                                        "id": 1133,
                                        "name": "CLEAR MEN ШАМПУНЬ И СВЕЖЕСТЬ 180МЛ",
                                        "description": None,
                                        "price": 32900,
                                        "old_price": None,
                                        "discount_percentage": 0,
                                        "image_url": "https://cdn.regos.uz/...",
                                        "shelf_life": None,
                                        "unit": "pcs",
                                        "stock_quantity": 5,
                                    }
                                ],
                            }
                        ],
                    }
                }
            },
        },
        404: {"description": "Категория не найдена"},
    },
)
async def get_products_by_category(
    category_id: int,
    lang: str = Query("ru", description="Язык ответа: ru/en/uz"),
):
    lang = normalize_lang(lang)
    category = await Category.get_or_none(id=category_id, is_active=True).prefetch_related("chapter")
    if not category:
        raise HTTPException(status_code=404, detail=t("product_not_found", lang))

    subcategories = await Subcategory.filter(category=category, is_active=True).order_by("id")
    subcategory_rows = []
    total_products = 0

    for sub in subcategories:
        products = await Product.filter(subcategory=sub, is_active=True)
        stock_map = await _stock_map_for_products(products)
        products_payload = [_product_payload(p, stock_map) for p in products]
        total_products += len(products_payload)
        subcategory_rows.append(
            {
                "subcategory_id": sub.id,
                "subcategory_name": sub.name,
                "products": products_payload,
            }
        )

    return {
        "category_id": category.id,
        "category_name": category.name,
        "chapter_id": category.chapter.id,
        "chapter_name": category.chapter.name,
        "total_products": total_products,
        "subcategories": subcategory_rows,
    }


@router.get(
    "/subcategory/{subcategory_id}",
    response_model=SubcategoryProductsResponse,
    summary="Товары по подкатегории",
    description=(
        "Возвращает товары конкретной подкатегории. "
        "Самый глубокий уровень навигации каталога."
    ),
    responses={
        200: {
            "description": "Товары подкатегории",
            "content": {
                "application/json": {
                    "example": {
                        "subcategory_id": 10,
                        "subcategory_name": "ЙОГУРТ",
                        "category_id": 7,
                        "category_name": "МОЛОЧКА",
                        "chapter_id": 1,
                        "chapter_name": "ПИТАНИЕ",
                        "total_products": 8,
                        "products": [
                            {
                                "id": 501,
                                "name": "Йогурт Даниссимо 130г",
                                "description": None,
                                "price": 12900,
                                "old_price": None,
                                "discount_percentage": 0,
                                "image_url": "https://cdn.regos.uz/...",
                                "shelf_life": None,
                                "unit": "pcs",
                                "stock_quantity": 24,
                            }
                        ],
                    }
                }
            },
        },
        404: {"description": "Подкатегория не найдена"},
    },
)
async def get_products_by_subcategory(
    subcategory_id: int,
    lang: str = Query("ru", description="Язык ответа: ru/en/uz"),
):
    lang = normalize_lang(lang)
    sub = await Subcategory.get_or_none(id=subcategory_id, is_active=True).prefetch_related(
        "category__chapter"
    )
    if not sub:
        raise HTTPException(status_code=404, detail=t("product_not_found", lang))

    products = await Product.filter(subcategory=sub, is_active=True)
    stock_map = await _stock_map_for_products(products)
    products_payload = [_product_payload(p, stock_map) for p in products]

    return {
        "subcategory_id": sub.id,
        "subcategory_name": sub.name,
        "category_id": sub.category.id,
        "category_name": sub.category.name,
        "chapter_id": sub.category.chapter.id,
        "chapter_name": sub.category.chapter.name,
        "total_products": len(products_payload),
        "products": products_payload,
    }


@router.get(
    "/{product_id}",
    response_model=ProductSchema,
    summary="Детали товара",
    description="Возвращает карточку товара для продуктового модального окна.",
    responses={
        200: {
            "description": "Детальная информация по товару",
            "content": {
                "application/json": {
                    "example": {
                        "id": 101,
                        "name": "Говядина мякоть",
                        "description": "Охлажденная говядина",
                        "price": 89900,
                        "old_price": None,
                        "discount_percentage": 0,
                        "image_url": "https://...",
                        "shelf_life": "3 д.",
                        "unit": "grams",
                        "stock_quantity": 42,
                    }
                }
            },
        },
        404: {"description": "Товар не найден"},
    },
)
async def get_product_details(
    product_id: int,
    lang: str = Query("ru", description="Язык ответа: ru/en/uz"),
):
    lang = normalize_lang(lang)
    p = await Product.get_or_none(id=product_id)
    if not p:
        raise HTTPException(status_code=404, detail=t("product_not_found", lang))
    
    stock_row = await RegosProductStock.get_or_none(product_id=p.id)
    return {
        "id": p.id,
        "name": p.name,
        "description": p.description,
        "price": float(p.price),
        "image_url": p.image_url,
        "shelf_life": p.shelf_life,
        "unit": p.unit,
        "stock_quantity": float(stock_row.quantity) if stock_row else 0,
    }
