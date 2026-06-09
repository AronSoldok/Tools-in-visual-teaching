# API интеграция для фронтенда

Бэкенд WebApp работает независимо от `test_front`: даже если удалить папку `test_front`, Swagger и все API-методы останутся доступны. Если не забуду то папки test_front фронтер даже не должен увидеть, на всякий оставлю тут коммент

## Быстрый старт

```bash
pip install fastapi uvicorn tortoise-orm asyncpg aiohttp python-dotenv tzdata requests
uvicorn api.app:app --reload --host 0.0.0.0 --port 8000
```

- Swagger: [http://localhost:8000/docs](http://localhost:8000/docs)
- OpenAPI JSON: [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)

## Что обязательно в `.env`

- `WEBAPP_URL` — внешний URL WebApp (актуальный ngrok/домен).
- Настройки БД PostgreSQL (см. `config.py`).
- Параметры REGOS (`ENDPOINT_REGOS` и связанные переменные) для синхронизации каталога/остатков.

## Язык ответов

- `GET` методы: query `lang=ru|en|uz`
- `POST/PATCH` методы: поле `lang` в body
- По умолчанию используется `ru`

## Публичные API для реализации фронта

### Auth
- `POST /api/auth/check`
- `POST /api/auth/send-code`
- `POST /api/auth/send-code-debug` (только dev)
- `POST /api/auth/verify-code`

### Products
- `GET /api/products/main`
- `GET /api/products/chapter/{chapter_id}` — все товары раздела
- `GET /api/products/category/{category_id}` — товары категории внутри раздела
- `GET /api/products/subcategory/{subcategory_id}` — товары конкретной подкатегории
- `GET /api/products/categories` — дерево: разделы > категории > подкатегории
- `GET /api/products/search`
- `GET /api/products/{product_id}`

### Transfers
- `GET /api/transfers/search`
- `GET /api/transfers/preview`
- `POST /api/transfers/send`
- `GET /api/transfers/history`

### Cart
- `GET /api/cart`
- `POST /api/cart/items`
- `PATCH /api/cart/items/{item_id}`
- `POST /api/cart/items/{item_id}/adjust`
- `DELETE /api/cart/items/{item_id}`

### Checkout
- `GET /api/checkout/addresses`
- `POST /api/checkout/addresses`
- `PATCH /api/checkout/addresses/{address_id}/select`
- `GET /api/checkout/recipients`
- `POST /api/checkout/recipients`
- `PATCH /api/checkout/recipients/{recipient_id}/select`
- `POST /api/checkout/preview`
- `POST /api/checkout/pay`

### Orders
- `GET /api/orders/active`
- `GET /api/orders/{order_number}`

### Currency
- `GET /api/curs/usd` (источник CBU)

## Важно по REGOS

- `GET /api/regos/stock` скрыт из Swagger (`include_in_schema=False`) и используется как внутренний/технический метод.
- Для диагностики используйте скрипты в корне проекта (`regos_stock_fetch.py`, `print_catalog_tree.py`).

## Чеклист перед передачей фронтенду

- Swagger открывается по `/docs`.
- Для каждого публичного метода есть `summary/description` и примеры в `responses`.
- Для ключевых методов задан `response_model`.
- Все сценарии WebApp (auth, каталог, поиск, корзина, checkout, заказы, переводы) покрыты API-контрактами.

При запуски Uvicorn нужно дождаться синхронизации с REGOS [REGOS SYNC] Startup sync completed