from django.urls import path, include
from .views import *

urlpatterns = [
    path('generate_agora_token/', generate_agora_token, name='generate_agora_token'),
    path('', index, name='index'),
    # login-section
    path('login/', connection, name='login'),
    path('register/', register, name="register"),
    path('logout/', deconnexion, name='logout'),
    path('chat_ai/', chat_ai, name='chat_ai'),
    path('chat_view/', chat_view, name='chat_view'),
    
    path('forgotpassword/', forgotpassword, name='forgotpassword'),

    
    
]


