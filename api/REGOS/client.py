import json
from typing import Any, Dict, Optional

import aiohttp

from config import settings


REGOS_TIMEOUT_SECONDS = 30


async def fetch_regos_action(
    method_path: str = "/v1/Item/Get",
    data: Optional[Dict[str, Any]] = None,
    log_raw: bool = True,
) -> Dict[str, Any]:
    payload = data or {}
    endpoint = f"{str(settings.ENDPOINT_REGOS).rstrip('/')}/{str(method_path).lstrip('/')}"
    headers = {"Content-Type": "application/json"}

    timeout = aiohttp.ClientTimeout(total=REGOS_TIMEOUT_SECONDS)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        async with session.post(endpoint, json=payload, headers=headers) as response:
            raw_text = await response.text()
            try:
                parsed = json.loads(raw_text) if raw_text else {}
            except json.JSONDecodeError:
                parsed = {"raw": raw_text}

            if log_raw:
                print("\n================ REGOS RAW RESPONSE ================")
                print(json.dumps(parsed, ensure_ascii=False, indent=2))
                print("====================================================\n")

            return {
                "http_status": response.status,
                "endpoint": endpoint,
                "request": payload,
                "response": parsed,
            }
