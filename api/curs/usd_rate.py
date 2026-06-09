from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional, Tuple
import requests

CBU_USD_URL = "https://cbu.uz/uz/arkhiv-kursov-valyut/json/USD/"

_cached_date: Optional[str] = None
_cached_rate: Optional[float] = None


def get_usd_rate_sum() -> Tuple[float, str]:
    """
    Возвращает курс USD->UZS по данным ЦБ Узбекистана.
    Кэшируем результат в рамках дня, т.к. курс обновляется раз в сутки.
    """
    global _cached_date, _cached_rate

    today = datetime.now(timezone.utc).date().isoformat()
    if _cached_date == today and _cached_rate is not None:
        return _cached_rate, _cached_date

    response = requests.get(CBU_USD_URL, timeout=10)
    response.raise_for_status()
    payload = response.json()
    if not payload:
        raise ValueError("CBU returned empty response")

    # Rate приходит строкой, например "12091.22"
    rate_raw = str(payload[0].get("Rate", "0")).replace(",", ".")
    rate = float(rate_raw)
    rate_date = str(payload[0].get("Date", today))

    _cached_date = today
    _cached_rate = rate
    return rate, rate_date

