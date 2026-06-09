from typing import Any, Dict, List


def _extract_items(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    response = payload.get("response") if isinstance(payload, dict) else {}
    if not isinstance(response, dict):
        return []

    result = response.get("result", response)
    if isinstance(result, list):
        return [x for x in result if isinstance(x, dict)]
    if not isinstance(result, dict):
        return []

    for key in ("items", "data", "rows", "list", "result"):
        value = result.get(key)
        if isinstance(value, list):
            return [x for x in value if isinstance(x, dict)]

    return []


def _pick_first_str(item: Dict[str, Any], keys: List[str], default: str) -> str:
    for key in keys:
        value = item.get(key)
        if value is None:
            continue
        text = str(value).strip()
        if text:
            return text
    return default


def _get_group_name(item: Dict[str, Any]) -> str:
    group = item.get("group")
    if isinstance(group, dict):
        value = str(group.get("name", "")).strip()
        if value:
            return value
        path = str(group.get("path", "")).strip()
        if path:
            return path
    return _pick_first_str(
        item,
        [
            "category_name",
            "category",
            "item_group_name",
            "group_name",
            "group",
            "itemGroupName",
        ],
        "Без категории",
    )


def group_stock_items_by_categories(regos_payload: Dict[str, Any]) -> Dict[str, Any]:
    items = _extract_items(regos_payload)
    grouped: Dict[str, Dict[str, List[Dict[str, Any]]]] = {}

    for item in items:
        category_name = _get_group_name(item)
        subcategory_name = _pick_first_str(
            item,
            [
                "subcategory_name",
                "subcategory",
                "sub_group_name",
                "subgroup_name",
                "subgroup",
                "subCategoryName",
            ],
            "Общее",
        )

        grouped.setdefault(category_name, {}).setdefault(subcategory_name, []).append(item)

    categories = []
    for category_name, subcategories_dict in grouped.items():
        subcategories = []
        category_total = 0
        for subcategory_name, sub_items in subcategories_dict.items():
            subcategories.append(
                {
                    "name": subcategory_name,
                    "items_count": len(sub_items),
                    "items": sub_items,
                }
            )
            category_total += len(sub_items)
        categories.append(
            {
                "name": category_name,
                "items_count": category_total,
                "subcategories": subcategories,
            }
        )

    return {
        "success": True,
        "total_items": len(items),
        "categories": categories,
        "raw_response": regos_payload.get("response", {}),
    }
