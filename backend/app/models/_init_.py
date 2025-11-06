from .like import ProductLike
# backend/app/models/__init__.py

# ¡Este archivo se ejecuta para registrar todos los modelos en el mapper!

from .user import User
from .product import Product, ProductImage
from .like import ProductLike

# 👇 IMPORTA TAMBIÉN LOS MODELOS DE CHAT
from .chat import Conversation, ConversationParticipant, Message

__all__ = [
    "User",
    "Product", "ProductImage",
    "ProductLike",
    "Conversation", "ConversationParticipant", "Message",
]


