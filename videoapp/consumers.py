# videoapp/consumers.py

import json
import base64
from channels.generic.websocket import AsyncWebsocketConsumer
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.conf import settings
from django.contrib.auth.models import User
from asgiref.sync import sync_to_async





class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_group_name = 'chat_room'
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        username = text_data_json.get('username')

        # Séparer la fonction de récupération ou création d'utilisateur
        user, created = await sync_to_async(User.objects.get_or_create)(username=username)
        
        if 'message' in text_data_json:
            message = text_data_json['message']
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': message,
                    'username': username
                }
            )
        elif 'file' in text_data_json:
            file_data = text_data_json['file']
            file_name = text_data_json['file_name']
            file_type = text_data_json['file_type']

            # Decode Base64 and save to file
            file_data = base64.b64decode(file_data)
            file_path = await sync_to_async(default_storage.save)(f"uploads/{file_name}", ContentFile(file_data))
            file_url = f"{settings.MEDIA_URL}{file_path}"

            # Create ChatFile instance if you have such a model
            # await sync_to_async(ChatFile.objects.create)(user=user, file=file_path)

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_file',
                    'file_url': file_url,
                    'file_name': file_name,
                    'username': username
                }
            )

    async def chat_message(self, event):
        message = event['message']
        username = event['username']
        await self.send(text_data=json.dumps({
            'message': message,
            'username': username
        }))

    async def chat_file(self, event):
        file_url = event['file_url']
        file_name = event['file_name']
        username = event['username']
        await self.send(text_data=json.dumps({
            'file_url': file_url,
            'file_name': file_name,
            'username': username
        }))



class VoiceConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        print("Connection etablie")
        self.room_name = 'voice_room'
        await self.channel_layer.group_add(
            self.room_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_name,
            self.channel_name
        )

    async def receive(self, text_data):
        print("Message reçu", text_data)
        text_data_json = json.loads(text_data)
        transcript = text_data_json.get('transcript')
        username = text_data_json.get('username')
        user, created = await sync_to_async(User.objects.get_or_create)(username=username)
        
        await self.channel_layer.group_send(
            self.room_name,
            {
                'type': 'voice_transcript',
                'transcript': transcript,
                'username': username,
            }
        )

    async def voice_transcript(self, event):
        transcript = event['transcript']
        username =  event['username']
        await self.send(text_data=json.dumps({
            'transcript': transcript,
           'username': username,
        }))


