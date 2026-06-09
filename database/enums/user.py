import enum


class Language(enum.StrEnum):
    RU = "ru"
    UZ = "uz"


class Role(enum.StrEnum):
    USER = "user"
    ADMIN = "admin"
    DELIVERYMAN = "deliveryman"
    DILLER = "diller"
