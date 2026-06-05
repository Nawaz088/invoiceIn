"""
URL configuration for InvoiceIN project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

def health_check(request):
    """Health check endpoint for monitoring."""
    return JsonResponse({
        'status': 'healthy',
        'service': 'InvoiceIN API',
        'version': '1.0.0'
    })

urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', health_check, name='health_check'),
    path('api/auth/', include('apps.users.urls')),
    path('api/invoices/', include('apps.invoices.urls')),
    path('api/clients/', include('apps.clients.urls')),
    path('api/expenses/', include('apps.expenses.urls')),
    path('api/reports/', include('apps.reports.urls')),
    path('api/payments/', include('apps.payments.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
