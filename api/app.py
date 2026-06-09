from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from tortoise.contrib.fastapi import register_tortoise
from config import settings
from api.handlers.auth import router as auth_router
from api.handlers.products import router as products_router
from api.handlers.transfers import router as transfers_router
from api.handlers.cart import router as cart_router
from api.handlers.checkout import router as checkout_router
from api.handlers.orders import router as orders_router
from api.handlers.curs import router as curs_router
from api.handlers.regos import router as regos_router
from api.bootstrap import ensure_standard_catalog_structure
from api.REGOS import sync_products_from_regos_to_db
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import os

def create_app() -> FastAPI:
    app = FastAPI(title="Ravonak API", version="0.1.7")
    
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request, exc):
        print(f"DEBUG: Validation error on {request.url}: {exc.errors()}")
        return JSONResponse(
            status_code=422,
            content={"detail": exc.errors(), "body": exc.body},
        )
    
    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Роутеры (все API под префиксом /api)
    app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
    app.include_router(products_router, prefix="/api/products", tags=["Products"])
    app.include_router(transfers_router, prefix="/api/transfers", tags=["Transfers"])
    app.include_router(cart_router, prefix="/api/cart", tags=["Cart"])
    app.include_router(checkout_router, prefix="/api/checkout", tags=["Checkout"])
    app.include_router(orders_router, prefix="/api/orders", tags=["Orders"])
    app.include_router(curs_router, prefix="/api/curs", tags=["Curs"])
    app.include_router(regos_router, prefix="/api/regos", tags=["Regos"])

    # Раздача фронтенда (test_front) через FastAPI
    # Это позволяет избежать проблем с CORS и Mixed Content в Telegram WebApp
    front_path = os.path.join(os.getcwd(), "test_front")
    if os.path.exists(front_path):
        app.mount("/", StaticFiles(directory=front_path, html=True), name="static")


    # Инициализация Tortoise ORM
    register_tortoise(
        app,
        config=settings.TORTOISE_ORM,
        generate_schemas=True, # Генерируем схемы на лету для разработки
        add_exception_handlers=True,
    )

    @app.on_event("startup")
    async def seed_standard_catalog_on_startup():
        # Бэкенд-ориентированный bootstrap стандартной структуры каталога.
        await ensure_standard_catalog_structure()
        try:
            sync_result = await sync_products_from_regos_to_db()
            print(f"[REGOS SYNC] Startup sync completed: {sync_result}")
        except Exception as exc:
            print(f"[REGOS SYNC] Startup sync failed: {exc}")

    return app

app = create_app()
