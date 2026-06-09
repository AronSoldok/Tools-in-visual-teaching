from tortoise.models import Model
from tortoise import fields


class Base(Model):
    id = fields.BigIntField(pk=True)
    created_at = fields.DatetimeField(auto_now_add=True)

    def __str__(self):
        return str(self.id)
