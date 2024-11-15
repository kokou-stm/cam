from django.shortcuts import render, redirect

# Create your views here.


import time
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .agora.RtcTokenBuilder import RtcTokenBuilder, Role_Attendee
from django.core.validators import validate_email
from django.contrib.auth.password_validation import validate_password
from django.db.models import Q
from django.core.mail import EmailMessage
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.conf import settings
from django.contrib import messages
from django.core.files.storage import FileSystemStorage
from django.http import JsonResponse

def upload_file(request):
    if request.method == 'POST' and request.FILES['file']:
        file = request.FILES['file']
        fs = FileSystemStorage()
        filename = fs.save(file.name, file)
        file_url = fs.url(filename)
        
        # Notifier via WebSocket
        # Vous pouvez appeler un consumer ici ou utiliser un autre moyen pour envoyer une notification WebSocket

        return JsonResponse({'file_url': file_url})
    return render(request, 'chat/upload.html')




@csrf_exempt
def generate_agora_token(request):
    app_id = 'f2891190d713482dbed4c3fd804ec233'
    app_certificate = 'ec7803663ae640658b2a5afe5dc0894e'
    channel_name = 'channel1'
    uid = 0  # Utilisez 0 pour des utilisateurs anonymes ou un UID spécifique
    #role = RtcTokenBuilder.Role_Attendee  # Utilisateur participant à la réunion
    expiration_time_in_seconds = 3600  # Durée de validité du token en secondes

    current_timestamp = int(time.time())
    privilege_expired_ts = current_timestamp + expiration_time_in_seconds

    token = RtcTokenBuilder.buildTokenWithUid(app_id, app_certificate, channel_name, uid, Role_Attendee, privilege_expired_ts)
    print("="*10, "token", "="*10)
    print(token)
    print("="*10, "token", "="*10)
    return JsonResponse({'token': token})

@login_required
def index(request):
    return render(request, "index.html")

def chat_ai(request):
    return render(request, "chat.html")

def chat_view(request):
    return render(request, "chat.html")

def forgotpassword(request):
    return render(request, "index.html")


def register(request):
    mess = ""
    if request.method == "POST":
        
        print("="*5, "NEW REGISTRATION", "="*5)
        username = request.POST.get("username", None)
        email = request.POST.get("email", None)
        pass1 = request.POST.get("password1", None)
        pass2 = request.POST.get("password2", None)
        print(username, email, pass1, pass2)
        try:
            validate_email(email)
        except:
            mess = "Invalid Email"
        if pass1 != pass2 :
            mess += " Password not match"
        if User.objects.filter(Q(email= email)| Q(username=username)).first():
            mess += f" Exist user with email {email}"
        if mess=="":
            try:
                    validate_password(pass1)
                    user = User(username= username, email = email)
                    user.save()
                    user.password = pass1
                    user.set_password(user.password)
                    user.save()
                    subject= "Welcome to Youtube Video Translator! "
                    email_message = f"""
                    Dear {username},

                    We are thrilled to welcome you to Youtube Video Translator! 🎉

                    Your account has been successfully created, and you are now ready to explore all the amazing features of our service. With Youtube Video Translator,
                    you can translate YouTube videos using a new artificial voice, making the audio translation experience more immersive than ever.

                    Here are some of the features you can start exploring right away:

                    Translate your favorite YouTube videos into the language of your choice.
                    Customize the artificial voice to match your preferences.
                    Download your translations for offline listening.
                    We look forward to helping you make the most out of our platform and providing you with an exceptional audio translation experience.

                    If you have any questions or concerns, feel free to contact us at [your email address] or through our support page.

                    Once again, welcome to Youtube Video Translator! We are delighted to have you with us.

                    Best regards,

                    The Youtube Video Translator Team"""
                    email = EmailMessage(subject,
                             email_message,
                             f"Youtube VideoTrans <{settings.EMAIL_HOST}>",
                             [user.email])

                    email.send()
                    mess = f"Welcome {user.username}, Your account is create successfully"    
                    messages.info(request, mess)
                    return redirect("login")
            except Exception as e:
                    print("error: ", e)
                    err = " ".join(e)
                    messages.error(request, err)
                    return render(request, template_name="register.html")
            
        #messages.info(request, "Bonjour")

    return render(request, template_name="register.html")



def connection(request):
    mess = ""

    '''if request.user.is_authenticated:
         return redirect("dashboard")'''
    if request.method == "POST":
        
        print("="*5, "NEW CONECTION", "="*5)
        email = request.POST.get("email")
        password = request.POST.get("password")
        
        try:
            validate_email(email)
        except:
            mess = "Invalid Email !!!"
        #authen = User.lo
        if mess=="":
            user = User.objects.filter(email= email).first()
            if user:
                auth_user= authenticate(username= user.username, password= password)
                if auth_user:
                    print("Utilisateur infos: ", auth_user.username, auth_user.email)
                    login(request, auth_user)
                    
                    return redirect("index")
                else :
                    mess = "Incorrect password"
            else:
                mess = "user does not exist"
            
        messages.info(request, mess)

    return render(request, template_name="login.html")



def deconnexion(request):
         print("Deconnexion")
         logout(request)
         return redirect("index")
    


