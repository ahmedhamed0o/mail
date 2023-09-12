import json
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.db import IntegrityError
from django.http import JsonResponse, HttpResponse, HttpResponseRedirect
from django.shortcuts import render
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt
from .models import User, Email

def index(request):
    if request.user.is_authenticated:
        return render(request, "mail/inbox.html")
    return HttpResponseRedirect(reverse("login"))

@csrf_exempt
@login_required
def compose(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    data = json.loads(request.body)
    emails = [e.strip() for e in data.get("recipients").split(",")]

    if not emails or emails == [""]:
        return JsonResponse({"error": "At least one recipient required."}, status=400)

    recipients = []
    for email in emails:
        try:
            recipients.append(User.objects.get(email=email))
        except User.DoesNotExist:
            return JsonResponse({"error": f"User with email {email} does not exist."}, status=400)

    subject = data.get("subject", "")
    body = data.get("body", "")

    users = {request.user, *recipients}
    for user in users:
        email = Email(user=user, sender=request.user, subject=subject, body=body, read=user == request.user)
        email.save()
        email.recipients.set(recipients)
        email.save()

    return JsonResponse({"message": "Email sent successfully."}, status=201)

@login_required
def mailbox(request, mailbox):
    user_emails = Email.objects.filter(user=request.user)

    if mailbox == "inbox":
        emails = user_emails.filter(recipients=request.user, archived=False)
    elif mailbox == "sent":
        emails = user_emails.filter(sender=request.user)
    elif mailbox == "archive":
        emails = user_emails.filter(recipients=request.user, archived=True)
    else:
        return JsonResponse({"error": "Invalid mailbox."}, status=400)

    emails = emails.order_by("-timestamp")
    return JsonResponse([e.serialize() for e in emails], safe=False)

@csrf_exempt
@login_required
def email(request, email_id):
    try:
        email = Email.objects.get(user=request.user, pk=email_id)
    except Email.DoesNotExist:
        return JsonResponse({"error": "Email not found."}, status=404)

    if request.method == "GET":
        return JsonResponse(email.serialize())

    if request.method == "PUT":
        data = json.loads(request.body)
        email.read = data.get("read", email.read)
        email.archived = data.get("archived", email.archived)
        email.save()
        return HttpResponse(status=204)

    return JsonResponse({"error": "GET or PUT request required."}, status=400)

def login_view(request):
    if request.method == "POST":
        email, password = request.POST["email"], request.POST["password"]
        user = authenticate(request, username=email, password=password)
        if user:
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        return render(request, "mail/login.html", {"message": "Invalid email and/or password."})
    return render(request, "mail/login.html")

def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))

def register(request):
    if request.method == "POST":
        email, password, confirmation = request.POST["email"], request.POST["password"], request.POST["confirmation"]
        if password != confirmation:
            return render(request, "mail/register.html", {"message": "Passwords must match."})
        try:
            user = User.objects.create_user(email, email, password)
            user.save()
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        except IntegrityError:
            return render(request, "mail/register.html", {"message": "Email address already taken."})
    return render(request, "mail/register.html")
