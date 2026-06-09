from fastapi import APIRouter, HTTPException, Query

from api.REGOS import fetch_regos_action, group_stock_items_by_categories


router = APIRouter()


@router.get(
    "/stock",
    include_in_schema=False,
)
async def get_stock_from_regos(
    method_path: str = Query("/v1/Item/Get", description="REGOS method path"),
    limit: int = Query(500, ge=1, le=5000),
    offset: int = Query(0, ge=0),
):
    result = await fetch_regos_action(
        method_path=method_path,
        data={"limit": limit, "offset": offset},
    )
    if int(result.get("http_status", 500)) >= 400:
        raise HTTPException(
            status_code=502,
            detail={
                "message": "REGOS request failed",
                "regos_http_status": result.get("http_status"),
                "regos_response": result.get("response"),
            },
        )
    return group_stock_items_by_categories(result)
