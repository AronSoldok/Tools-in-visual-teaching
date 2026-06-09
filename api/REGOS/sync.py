from typing import Any, Dict, List

from tortoise import connections
from database.models.chapter import Chapter, Category, Subcategory
from database.models.product import Product
from database.models.discounts import Discounts
from database.models.regos_product_map import RegosProductMap
from database.models.regos_product_stock import RegosProductStock

from .client import fetch_regos_action
from .category_mapping import remap_regos_path


async def _ensure_regos_schema() -> None:
    conn = connections.get("default")
    await conn.execute_script(
        """
        CREATE TABLE IF NOT EXISTS regos_product_map (
            id BIGSERIAL PRIMARY KEY,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            deleted_at TIMESTAMPTZ NULL,
            regos_item_id BIGINT UNIQUE,
            product_id BIGINT UNIQUE REFERENCES products(id) ON DELETE CASCADE
        );

        ALTER TABLE regos_product_map
            ADD COLUMN IF NOT EXISTS regos_last_update BIGINT NULL;

        CREATE TABLE IF NOT EXISTS regos_product_stock (
            id BIGSERIAL PRIMARY KEY,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            deleted_at TIMESTAMPTZ NULL,
            product_id BIGINT UNIQUE REFERENCES products(id) ON DELETE CASCADE,
            quantity NUMERIC(20,3) NOT NULL DEFAULT 0,
            stock_ids VARCHAR(255) NULL
        );
        """
    )


def _extract_result_list(response_payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    response = response_payload.get("response", {})
    if not isinstance(response, dict):
        return []
    result = response.get("result")
    if isinstance(result, list):
        return [x for x in result if isinstance(x, dict)]
    return []


def _group_name(item: Dict[str, Any]) -> str:
    group = item.get("group")
    if isinstance(group, dict):
        name = str(group.get("name", "")).strip()
        if name:
            return name
    return "Без категории"


def _group_path_parts(item: Dict[str, Any]) -> List[str]:
    group = item.get("group")
    if isinstance(group, dict):
        raw_path = str(group.get("path", "")).strip()
        if raw_path:
            parts = [p.strip() for p in raw_path.split("/") if p.strip()]
            if parts:
                return parts
        name = str(group.get("name", "")).strip()
        if name:
            return [name]
    return [_group_name(item)]


def _catalog_names_from_item(item: Dict[str, Any]) -> Dict[str, str]:
    parts = _group_path_parts(item)
    mapped = remap_regos_path(parts)
    return {
        "chapter_name": mapped["chapter"],
        "category_name": mapped["category"],
        "subcategory_name": mapped["subcategory"],
    }


def _unit(item: Dict[str, Any]) -> str:
    unit = item.get("unit")
    if isinstance(unit, dict):
        t = str(unit.get("type", "")).strip().lower()
        if t in {"pcs", "grams"}:
            return t
    return "pcs"


def _description(item: Dict[str, Any]) -> str:
    for key in ("description", "fullname"):
        value = str(item.get(key, "")).strip()
        if value:
            return value
    return ""


def _discount_percent(item: Dict[str, Any], price_row: Dict[str, Any]) -> int:
    for source in (item, price_row):
        for key in ("discount_percentage", "discount_percent", "discount"):
            val = source.get(key)
            if isinstance(val, (int, float)):
                return max(0, int(val))
    return 0


async def _fetch_all_regos_items(limit: int = 500) -> List[Dict[str, Any]]:
    offset = 0
    items: List[Dict[str, Any]] = []
    while True:
        page = await fetch_regos_action(
            method_path="/v1/Item/Get",
            data={"limit": limit, "offset": offset},
            log_raw=False,
        )
        if int(page.get("http_status", 500)) >= 400:
            break
        rows = _extract_result_list(page)
        if not rows:
            break
        items.extend(rows)
        response = page.get("response", {})
        next_offset = response.get("next_offset")
        total = response.get("total")
        if isinstance(next_offset, int):
            if isinstance(total, int) and next_offset >= total:
                break
            offset = next_offset
            continue
        if len(rows) < limit:
            break
        offset += limit
    return items


async def _fetch_prices(item_ids: List[int], chunk_size: int = 300) -> Dict[int, Dict[str, Any]]:
    prices: Dict[int, Dict[str, Any]] = {}
    for i in range(0, len(item_ids), chunk_size):
        chunk = item_ids[i : i + chunk_size]
        response = await fetch_regos_action(
            method_path="/v1/ItemPrice/Get",
            data={"item_ids": chunk, "limit": len(chunk), "offset": 0},
            log_raw=False,
        )
        if int(response.get("http_status", 500)) >= 400:
            continue
        rows = _extract_result_list(response)
        for row in rows:
            item_id = row.get("item_id")
            if isinstance(item_id, int):
                prices[item_id] = row
    return prices


async def _fetch_stock_ids_for_item(item_id: int) -> List[int]:
    response = await fetch_regos_action(
        method_path="/v1/Item/GetQuantity",
        data={"item_id": item_id},
        log_raw=False,
    )
    if int(response.get("http_status", 500)) >= 400:
        return []
    rows = _extract_result_list(response)
    stock_ids: List[int] = []
    for row in rows:
        stock = row.get("stock")
        if isinstance(stock, dict):
            sid = stock.get("id")
            if isinstance(sid, int):
                stock_ids.append(sid)
    return sorted(set(stock_ids))


async def _fetch_quantities(item_ids: List[int], stock_ids: List[int], chunk_size: int = 300) -> Dict[int, float]:
    if not stock_ids:
        return {item_id: 0.0 for item_id in item_ids}
    quantities: Dict[int, float] = {item_id: 0.0 for item_id in item_ids}
    for i in range(0, len(item_ids), chunk_size):
        chunk = item_ids[i : i + chunk_size]
        response = await fetch_regos_action(
            method_path="/v1/Item/GetCurrentQuantity",
            data={"stock_ids": stock_ids, "item_ids": chunk},
            log_raw=False,
        )
        if int(response.get("http_status", 500)) >= 400:
            continue
        rows = _extract_result_list(response)
        for row in rows:
            item_id = row.get("item_id")
            qty = row.get("quantity")
            if isinstance(item_id, int) and isinstance(qty, (int, float)):
                quantities[item_id] = quantities.get(item_id, 0.0) + float(qty)
    return quantities


async def sync_products_from_regos_to_db() -> Dict[str, Any]:
    await _ensure_regos_schema()
    items = await _fetch_all_regos_items(limit=500)
    item_ids = [x.get("id") for x in items if isinstance(x.get("id"), int)]
    existing_mappings = await RegosProductMap.all().prefetch_related("product")
    mapping_by_regos_id = {m.regos_item_id: m for m in existing_mappings}
    changed_item_ids: List[int] = []
    for item in items:
        regos_item_id = item.get("id")
        if not isinstance(regos_item_id, int):
            continue
        regos_last_update = int(item.get("last_update") or 0)
        mapping = mapping_by_regos_id.get(regos_item_id)
        if mapping is None or int(mapping.regos_last_update or 0) != regos_last_update:
            changed_item_ids.append(regos_item_id)

    prices = await _fetch_prices(changed_item_ids)
    stock_ids = await _fetch_stock_ids_for_item(changed_item_ids[0]) if changed_item_ids else []
    quantities = await _fetch_quantities(changed_item_ids, stock_ids)

    chapters_cache: Dict[str, Chapter] = {}
    categories_cache: Dict[tuple, Category] = {}
    subcategories_cache: Dict[tuple, Subcategory] = {}

    created_products = 0
    updated_products = 0
    discounts_updated = 0
    unchanged_products = 0

    for item in items:
        regos_item_id = item.get("id")
        if not isinstance(regos_item_id, int):
            continue
        regos_last_update = int(item.get("last_update") or 0)
        if regos_item_id not in changed_item_ids:
            unchanged_products += 1
            continue

        names = _catalog_names_from_item(item)
        chapter_name = names["chapter_name"]
        category_name = names["category_name"]
        subcategory_name = names["subcategory_name"]
        chapter = chapters_cache.get(chapter_name)
        if not chapter:
            chapter, _ = await Chapter.get_or_create(name=chapter_name, defaults={"is_active": True})
            if not chapter.is_active:
                chapter.is_active = True
                await chapter.save()
            chapters_cache[chapter_name] = chapter

        category_key = (chapter.id, category_name)
        category = categories_cache.get(category_key)
        if not category:
            category, _ = await Category.get_or_create(
                chapter=chapter,
                name=category_name,
                defaults={"is_active": True},
            )
            if not category.is_active:
                category.is_active = True
                await category.save()
            categories_cache[category_key] = category

        subcategory_key = (category.id, subcategory_name)
        subcategory = subcategories_cache.get(subcategory_key)
        if not subcategory:
            subcategory, _ = await Subcategory.get_or_create(
                category=category,
                name=subcategory_name,
                defaults={"is_active": True},
            )
            if not subcategory.is_active:
                subcategory.is_active = True
                await subcategory.save()
            subcategories_cache[subcategory_key] = subcategory

        mapping = mapping_by_regos_id.get(regos_item_id)
        price_row = prices.get(regos_item_id, {})
        price_val = float(price_row.get("value", 0) or 0)

        defaults = {
            "subcategory": subcategory,
            "name": str(item.get("name", "")).strip() or f"REGOS {regos_item_id}",
            "description": _description(item),
            "price": price_val,
            "image_url": item.get("image_url"),
            "unit": _unit(item),
            "is_active": not bool(item.get("deleted_mark", False)),
        }

        if mapping and mapping.product:
            product = mapping.product
            product.subcategory = defaults["subcategory"]
            product.name = defaults["name"]
            product.description = defaults["description"]
            product.price = defaults["price"]
            product.image_url = defaults["image_url"]
            product.unit = defaults["unit"]
            product.is_active = defaults["is_active"]
            await product.save()
            updated_products += 1
        else:
            product = await Product.create(**defaults)
            mapping = await RegosProductMap.create(
                regos_item_id=regos_item_id,
                product=product,
                regos_last_update=regos_last_update,
            )
            mapping_by_regos_id[regos_item_id] = mapping
            created_products += 1

        if mapping and mapping.regos_last_update != regos_last_update:
            mapping.regos_last_update = regos_last_update
            await mapping.save()

        discount_percent = _discount_percent(item, price_row)
        if discount_percent > 0:
            discount, created = await Discounts.get_or_create(
                product=product,
                defaults={"discount_percentage": discount_percent, "status": "active"},
            )
            if not created:
                discount.discount_percentage = discount_percent
                discount.status = "active"
                await discount.save()
            discounts_updated += 1
        else:
            await Discounts.filter(product=product).update(status="inactive")

        await RegosProductStock.update_or_create(
            product=product,
            defaults={
                "quantity": quantities.get(regos_item_id, 0.0),
                "stock_ids": ",".join(str(x) for x in stock_ids) if stock_ids else None,
            },
        )

    return {
        "fetched_items": len(items),
        "changed_items": len(changed_item_ids),
        "priced_items": len(prices),
        "stock_ids": stock_ids,
        "created_products": created_products,
        "updated_products": updated_products,
        "unchanged_products": unchanged_products,
        "discounts_updated": discounts_updated,
    }
