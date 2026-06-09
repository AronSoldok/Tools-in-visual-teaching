from fastapi import APIRouter, Query

from api.curs import get_usd_rate_sum

router = APIRouter()


@router.get(
    "/usd",
    summary="Курс USD от ЦБ Узбекистана",
    description=(
        "Возвращает курс USD -> UZS из открытого API ЦБ. "
        "Источник: https://cbu.uz/uz/arkhiv-kursov-valyut/json/USD/"
    ),
    responses={
        200: {
            "description": "Текущий курс USD",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "source": "CBU",
                        "currency": "USD",
                        "rate_uzs": 12091.22,
                        "date": "17.03.2026",
                    }
                }
            },
        }
    },
)
async def get_usd_rate(lang: str = Query("ru", description="Язык ответа: ru/en/uz")):
    rate, rate_date = get_usd_rate_sum()
    return {
        "success": True,
        "source": "CBU",
        "currency": "USD",
        "rate_uzs": rate,
        "date": rate_date,
    }

