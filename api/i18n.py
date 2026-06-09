from typing import Optional

SUPPORTED_LANGS = {"ru", "en", "uz"}

MESSAGES = {
    "check_completed": {
        "ru": "Проверка выполнена",
        "en": "Check completed",
        "uz": "Tekshiruv bajarildi",
    },
    "user_not_found": {
        "ru": "Пользователь не найден",
        "en": "User not found",
        "uz": "Foydalanuvchi topilmadi",
    },
    "product_not_found": {
        "ru": "Товар не найден",
        "en": "Product not found",
        "uz": "Mahsulot topilmadi",
    },
    "code_sent": {
        "ru": "Код успешно отправлен",
        "en": "Code sent successfully",
        "uz": "Kod muvaffaqiyatli yuborildi",
    },
    "invalid_or_expired_code": {
        "ru": "Неверный или просроченный код",
        "en": "Invalid or expired code",
        "uz": "Kod noto'g'ri yoki muddati tugagan",
    },
    "transfer_success": {
        "ru": "Перевод успешно выполнен",
        "en": "Transfer completed successfully",
        "uz": "O'tkazma muvaffaqiyatli bajarildi",
    },
    "insufficient_funds": {
        "ru": "Недостаточно средств",
        "en": "Insufficient funds",
        "uz": "Mablag' yetarli emas",
    },
    "user_registered": {
        "ru": "Пользователь успешно зарегистрирован",
        "en": "User registered successfully",
        "uz": "Foydalanuvchi muvaffaqiyatli ro'yxatdan o'tdi",
    },
    "user_updated": {
        "ru": "Данные пользователя обновлены",
        "en": "User info updated",
        "uz": "Foydalanuvchi ma'lumotlari yangilandi",
    },
    "sms_send_failed": {
        "ru": "Не удалось отправить SMS",
        "en": "Failed to send SMS",
        "uz": "SMS yuborib bo'lmadi",
    },
}


def normalize_lang(lang: Optional[str]) -> str:
    if not lang:
        return "ru"
    l = lang.lower().strip()
    return l if l in SUPPORTED_LANGS else "ru"


def t(key: str, lang: Optional[str] = "ru") -> str:
    lang = normalize_lang(lang)
    return MESSAGES.get(key, {}).get(lang) or MESSAGES.get(key, {}).get("ru") or key

