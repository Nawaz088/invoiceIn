from django.urls import path
from .views import (
    RegisterView,
    LoginView,
    ProfileView,
    GSTINVerificationView,
    RefreshTokenView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('refresh/', RefreshTokenView.as_view(), name='refresh'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('verify-gstin/', GSTINVerificationView.as_view(), name='verify-gstin'),
]
