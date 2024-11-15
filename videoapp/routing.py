# videoapp/routing.py

from django.urls import re_path, path
from . import consumers

websocket_urlpatterns = [
    path('', consumers.ChatConsumer.as_asgi()),
     re_path(r'ws/voice/$', consumers.VoiceConsumer.as_asgi()),
]
