"""
Маппинг REGOS group.path → структура каталога (Chapter / Category / Subcategory).

Правила применяются сверху вниз; первое совпадение побеждает.
Если ни одно правило не сработало, path разбирается как раньше (по слэшам).

Формат каждого правила:
{
    "match": <строка или список строк>,   # точное имя первой части path ИЛИ полный path
    "chapter":     "Название раздела",
    "category":    "Название категории",        # опционально
    "subcategory": "Название подкатегории",      # опционально
    "use_tail":    True/False,                   # брать остаток path как category/subcategory
}

Логика:
1. Берём group.path, разбиваем по "/".
2. Пробегаем RULES: если первая часть path совпала с match (или full path совпал) — применяем.
3. Если `use_tail=True`, оставшиеся части path дописываются как category/subcategory.
4. Если правило не найдено — fallback: parts[0]=chapter, parts[1]=category, parts[2]=subcategory.
"""

RULES = [
    # ─── ПИТАНИЕ: объединяем всё пищевое под один раздел ───
    {"match": "ДЕТСКОЕ",      "chapter": "Питание", "category": "Детское питание", "use_tail": True},
    {"match": "КОЛБАСА",      "chapter": "Питание", "category": "Колбасы и мясные изделия", "use_tail": True},
    {"match": "КОНСЕРВЫ",     "chapter": "Питание", "category": "Консервы", "use_tail": True},
    {"match": "МАЙОНЕЗ",      "chapter": "Питание", "category": "Соусы и кетчуп", "use_tail": True},
    {"match": "МАКАРОН",      "chapter": "Питание", "category": "Макароны и крупы", "use_tail": True},
    {"match": "МОЛОЧКА",      "chapter": "Питание", "category": "Молочные продукты", "use_tail": True},
    {"match": "ОВОЩИ",        "chapter": "Питание", "category": "Овощи и фрукты", "use_tail": True},
    {"match": "ПЕЧЕНЕ",       "chapter": "Питание", "category": "Печенье и выпечка", "use_tail": True},
    {"match": "ПРИПРАВА",     "chapter": "Питание", "category": "Приправы и специи", "use_tail": True},
    {"match": "СЕМЕЧКИ",      "chapter": "Питание", "category": "Снеки", "subcategory": "Семечки"},
    {"match": "СУХОФРУКТЫ",   "chapter": "Питание", "category": "Сухофрукты и орехи", "use_tail": True},
    {"match": "ХАЛВА",        "chapter": "Питание", "category": "Сладости", "subcategory": "Халва"},
    {"match": "ХЛЕБ",         "chapter": "Питание", "category": "Хлеб и выпечка", "use_tail": True},
    {"match": "ЧИПСЫ",        "chapter": "Питание", "category": "Снеки", "use_tail": True},
    {"match": "ШОКОЛАД",      "chapter": "Питание", "category": "Шоколад и конфеты", "use_tail": True},
    {"match": "ГУШТ",         "chapter": "Питание", "category": "Мясо", "use_tail": True},

    # ─── НАПИТКИ ───
    {"match": "НАПИТКИ",      "chapter": "Напитки", "use_tail": True},
    {"match": "ЭНЕРГЕТИКА",   "chapter": "Напитки", "category": "Энергетики"},

    # ─── ЧАЙ И КОФЕ ───
    {"match": "ЧАЙ",          "chapter": "Чай и кофе", "use_tail": True},
    {"match": "КОФЕ",         "chapter": "Чай и кофе", "category": "Кофе"},
    {"match": "СЛИВКИ",       "chapter": "Чай и кофе", "category": "Сливки"},

    # ─── БЫТОВАЯ ХИМИЯ ───
    {"match": "ХИМИЯ",        "chapter": "Бытовая химия", "use_tail": True},
    {"match": "ДЕЗОДОРАНТ-СПРЕЙ", "chapter": "Бытовая химия", "category": "Дезодоранты"},
    {"match": "ЗУБНАЯ ПАСТА", "chapter": "Бытовая химия", "category": "Зубная паста"},
    {"match": "КРАСКА",       "chapter": "Бытовая химия", "category": "Краска для волос"},
    {"match": "МЫЛО",         "chapter": "Бытовая химия", "category": "Мыло"},
    {"match": "САЛФЕТКИ",     "chapter": "Бытовая химия", "category": "Салфетки"},
    {"match": "ШАМПУНИ",      "chapter": "Бытовая химия", "category": "Шампуни"},

    # ─── ХОЗТОВАРЫ ───
    {"match": "ХОЗ ТОВАР",    "chapter": "Хозтовары", "use_tail": True},

    # ─── ИГРУШКИ ───
    {"match": "ИГРУШКА",      "chapter": "Детские товары", "category": "Игрушки"},

    # ─── Catch-all для ПИТАНИЕ (если path начинается с ПИТАНИЕ/...) ───
    {"match": "ПИТАНИЕ",      "chapter": "Питание", "use_tail": True},
]

DEFAULT_SUBCATEGORY = "Основное"
DEFAULT_CATEGORY = "Общее"


def remap_regos_path(path_parts: list[str]) -> dict:
    """
    Принимает разобранный path (список строк) и возвращает
    {"chapter": ..., "category": ..., "subcategory": ...}.
    """
    if not path_parts:
        return {"chapter": "Без категории", "category": DEFAULT_CATEGORY, "subcategory": DEFAULT_SUBCATEGORY}

    first = path_parts[0].strip().upper()
    full_path_upper = "/".join(p.strip().upper() for p in path_parts)

    for rule in RULES:
        match_values = rule["match"] if isinstance(rule["match"], list) else [rule["match"]]
        matched = False
        for m in match_values:
            m_upper = m.strip().upper()
            if first == m_upper or full_path_upper == m_upper or full_path_upper.startswith(m_upper + "/"):
                matched = True
                break

        if not matched:
            continue

        chapter = rule["chapter"]
        category = rule.get("category")
        subcategory = rule.get("subcategory")

        if rule.get("use_tail") and len(path_parts) > 1:
            tail = path_parts[1:]
            if not category:
                category = tail[0] if len(tail) >= 1 else DEFAULT_CATEGORY
            if not subcategory:
                subcategory = tail[1] if len(tail) >= 2 else DEFAULT_SUBCATEGORY
                if not subcategory or subcategory == category:
                    subcategory = DEFAULT_SUBCATEGORY

        return {
            "chapter": chapter,
            "category": category or DEFAULT_CATEGORY,
            "subcategory": subcategory or DEFAULT_SUBCATEGORY,
        }

    chapter = path_parts[0] if len(path_parts) >= 1 else "Без категории"
    category = path_parts[1] if len(path_parts) >= 2 else DEFAULT_CATEGORY
    subcategory = path_parts[2] if len(path_parts) >= 3 else DEFAULT_SUBCATEGORY

    return {"chapter": chapter, "category": category, "subcategory": subcategory}
