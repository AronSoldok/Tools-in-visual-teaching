from database.models.chapter import Chapter, Category, Subcategory


# Стандартные разделы и подразделы каталога.
# Формат: Раздел (Chapter) -> список подразделов.
STANDARD_CATALOG_STRUCTURE = {
    "Овощи и фрукты": [
        "Зелень и салаты",
        "Огурцы и помидоры",
        "Овощи",
        "Грибы",
        "Замороженные овощи",
    ],
    "Фрукты и ягоды": [
        "Яблоки и груши",
        "Цитрусовые",
        "Бананы",
        "Ягоды",
        "Фрукты",
    ],
    "Молоко и масло": [
        "Молоко",
        "Масло и маргарин",
        "Каймак и сливки",
        "Молочные продукты",
    ],
    "Яйца": [
        "Яйца куринные",
        "Яйца перепелинные",
    ],
    "Творожки и сырки": [
        "Творожки",
        "Сырки",
    ],
    "Йогурты": [
        "Сладкие йогурты",
        "Питьевые йогурты",
        "Катык и йогурты без добавок",
    ],
    "Творог и кефир": [
        "Творог",
        "Кефир",
    ],
    "Сырная лавка": [
        "Твердый сыр",
        "Мягкий сыр",
        "Плавленый сыр",
        "Остальные сыры",
    ],
    "Мясо и курица": [
        "Говядина",
        "Курица",
        "Баранина",
        "Фарш",
        "Остальные продукты",
    ],
    "Колбасная витрина": [
        "Вареная колбаса и ветчина",
        "Копченная колбаса",
        "Сосиски",
        "Остальные изделия",
    ],
    "Рыба": [
        "Замороженная рыба",
        "Соленая и копченая рыба",
        "Остальные продукты",
    ],
    "Рыбные закуски": [
        "Икра",
        "Крабовые палочки",
        "Консервы",
    ],
    "Морские деликатесы": [
        "Кальмары, мидии, креветки",
    ],
    "Вода": [
        "Газированная вода",
        "Негазированная вода",
        "В бутылках",
        "Остальные продукты",
    ],
    "Газированные напитки": [
        "Газировка в банках",
        "Газировка без сахара",
        "Квас",
        "Лимонады",
        "Остальные продукты",
    ],
}


async def ensure_standard_catalog_structure() -> None:
    """
    Идемпотентно создает стандартные разделы/подразделы при запуске API.
    Используем фиксированную категорию "Основное" под каждый раздел.
    """
    for chapter_name, subcategories in STANDARD_CATALOG_STRUCTURE.items():
        chapter, chapter_created = await Chapter.get_or_create(
            name=chapter_name,
            defaults={"is_active": True},
        )
        if not chapter.is_active:
            chapter.is_active = True
            await chapter.save()

        category, _ = await Category.get_or_create(
            chapter=chapter,
            name="Основное",
            defaults={"is_active": True},
        )
        if not category.is_active:
            category.is_active = True
            await category.save()

        for sub_name in subcategories:
            subcategory, _ = await Subcategory.get_or_create(
                category=category,
                name=sub_name,
                defaults={"is_active": True},
            )
            if not subcategory.is_active:
                subcategory.is_active = True
                await subcategory.save()

