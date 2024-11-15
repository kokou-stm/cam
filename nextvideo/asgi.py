# nextvideo/asgi.py

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from videoapp import routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nextvideo.settings')
ASGI_APPLICATION = 'nextvideo.asgi.application'
application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            routing.websocket_urlpatterns
        )
    ),
})
