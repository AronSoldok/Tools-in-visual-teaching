from pydantic import BaseModel, Field
from typing import List, Optional

class PhoneRequest(BaseModel):
    phone_number: str = Field(
        ...,
        description="Телефон в международном формате",
        example="+998901234567",
    )
    lang: Optional[str] = Field(default="ru", description="Язык ответа: ru/en/uz", example="ru")

class AuthCheckRequest(BaseModel):
    tg_id: int = Field(..., description="Telegram user id", example=209684758)
    lang: Optional[str] = Field(default="ru", description="Язык ответа: ru/en/uz", example="ru")

class VerifyCodeRequest(BaseModel):
    phone_number: str = Field(
        ...,
        description="Телефон в международном формате",
        example="+998901234567",
    )
    code: str = Field(..., description="5-значный SMS код", example="12345")
    tg_id: Optional[int] = 12345  # Default for local testing
    name: Optional[str] = "TestUser"
    surname: Optional[str] = None
    username: Optional[str] = None
    lang: Optional[str] = Field(default="ru", description="Язык ответа: ru/en/uz", example="ru")

class AuthResponse(BaseModel):
    success: bool
    message: str
    is_registered: Optional[bool] = None
    display_name: Optional[str] = None
    tg_id: Optional[int] = None
    phone_number: Optional[str] = None
    debug_sms_code: Optional[str] = None

class TransferRequest(BaseModel):
    sender_tg_id: int = Field(..., description="TG id отправителя", example=209684758)
    receiver_tg_id: int = Field(..., description="TG id получателя", example=100500100)
    amount: float = Field(..., gt=0, description="Сумма перевода в USD", example=25)
    lang: Optional[str] = Field(default="ru", description="Язык ответа: ru/en/uz", example="ru")

class TransferUserInfo(BaseModel):
    tg_id: int
    name: str
    phone: str

class TransferSearchResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    users: List[TransferUserInfo] = Field(default_factory=list)

class TransferPreviewResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    sender_tg_id: Optional[int] = None
    receiver_tg_id: Optional[int] = None
    receiver_name: Optional[str] = None
    receiver_phone: Optional[str] = None
    sender_balance_usd: float = 0

class TransferSendResponse(BaseModel):
    success: bool
    message: str
    transfer_id: Optional[int] = None
    sender_balance_usd: Optional[float] = None
    receiver_balance_usd: Optional[float] = None

class TransferHistoryItem(BaseModel):
    id: int
    type: str  # send / receive
    amount: float
    date: str
    partner_name: str
    partner_phone: str

class TransferHistoryResponse(BaseModel):
    success: bool
    items: List[TransferHistoryItem] = Field(default_factory=list)


class CartItemRequest(BaseModel):
    tg_id: int = Field(..., description="Telegram user id", example=8129149096)
    product_id: int = Field(..., description="ID товара", example=1)
    amount: float = Field(..., description="Количество/вес товара", example=1)
    lang: Optional[str] = Field(default="ru", description="Язык ответа: ru/en/uz", example="ru")


class CartItemUpdateRequest(BaseModel):
    amount: float = Field(..., description="Новое количество/вес товара", example=2)
    lang: Optional[str] = Field(default="ru", description="Язык ответа: ru/en/uz", example="ru")

class CartItemAdjustRequest(BaseModel):
    delta: int = Field(..., description="Изменение количества: +1 или -1", example=1)
    step: Optional[float] = Field(
        default=None,
        description="Шаг изменения. Если не передан: grams=200, pcs=1",
        example=200,
    )
    lang: Optional[str] = Field(default="ru", description="Язык ответа: ru/en/uz", example="ru")


class CartItemResponse(BaseModel):
    basket_item_id: int
    product_id: int
    product_name: str
    unit: str
    amount: float
    price_sum: float
    image_url: Optional[str] = None


class CartResponse(BaseModel):
    success: bool
    tg_id: int
    items: List[CartItemResponse] = Field(default_factory=list)
    total_sum: float = 0
    item_count: int = 0


class AddressCreateRequest(BaseModel):
    tg_id: int = Field(..., description="Telegram user id", example=8129149096)
    city: str = Field(..., example="Самарканд")
    street: str = Field(..., example="ул. Буйук Ипак Йули")
    house: Optional[str] = Field(default=None, example="21")
    entrance: Optional[str] = Field(default=None, example="2")
    flat: Optional[str] = Field(default=None, example="13")
    comment: Optional[str] = Field(default=None, example="домофон нет, этаж 3")
    is_default: bool = Field(default=False)
    lang: Optional[str] = Field(default="ru", description="Язык ответа: ru/en/uz", example="ru")


class AddressResponse(BaseModel):
    id: int
    city: str
    street: str
    house: str
    entrance: Optional[str] = None
    flat: Optional[str] = None
    comment: Optional[str] = None
    is_default: bool = False
    full_text: str


class RecipientCreateRequest(BaseModel):
    tg_id: int = Field(..., description="Telegram user id", example=8129149096)
    name: str = Field(..., example="Арманов Миша")
    surname: Optional[str] = Field(default=None, example="Арманов")
    phone: str = Field(..., example="+998483575804")
    is_default: bool = Field(default=False)
    lang: Optional[str] = Field(default="ru", description="Язык ответа: ru/en/uz", example="ru")


class RecipientResponse(BaseModel):
    id: int
    name: str
    phone: str
    is_default: bool = False


class CheckoutPreviewRequest(BaseModel):
    tg_id: int = Field(..., example=8129149096)
    address_id: Optional[int] = Field(default=None, example=1)
    recipient_id: Optional[int] = Field(default=None, example=1)
    lang: Optional[str] = Field(default="ru", description="Язык ответа: ru/en/uz", example="ru")


class CheckoutPreviewResponse(BaseModel):
    success: bool
    message: str
    address_selected: bool
    recipient_selected: bool
    delivery_window: str
    total_sum_uzs: float
    usd_rate: float
    usd_rate_date: str
    total_usd: float
    balance_usd: float
    can_pay: bool
    disable_reason: Optional[str] = None


class CheckoutPayRequest(BaseModel):
    tg_id: int = Field(..., example=8129149096)
    address_id: int = Field(..., example=1)
    recipient_id: int = Field(..., example=1)
    lang: Optional[str] = Field(default="ru", description="Язык ответа: ru/en/uz", example="ru")


class CheckoutPayResponse(BaseModel):
    success: bool
    message: str
    order_number: str
    status: str
    total_sum_uzs: float
    total_usd: float
    usd_rate: float
    remaining_balance_usd: float


class ActiveOrderResponse(BaseModel):
    success: bool
    order_number: Optional[str] = None
    status: Optional[str] = None
    total_sum_uzs: Optional[float] = None


class OrderDetailsItem(BaseModel):
    product_id: int
    product_name: str
    amount: float
    unit: str
    unit_price_sum: float


class OrderDetailsResponse(BaseModel):
    success: bool
    order_number: str
    status: str
    delivery_address: str
    recipient_name: str
    recipient_phone: str
    total_sum_uzs: float
    items: List[OrderDetailsItem] = Field(default_factory=list)
