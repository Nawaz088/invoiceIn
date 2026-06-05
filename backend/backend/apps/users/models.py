from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):
    """Custom user model for InvoiceIN"""
    
    class BusinessType(models.TextChoices):
        INDIVIDUAL = 'individual', _('Individual / Sole Proprietor')
        PROPRIETORSHIP = 'proprietorship', _('Proprietorship')
        PARTNERSHIP = 'partnership', _('Partnership')
        PRIVATE_LIMITED = 'private_limited', _('Private Limited')
        LLP = 'llp', _('LLP')
    
    class Plan(models.TextChoices):
        FREE = 'free', _('Free')
        STARTER = 'starter', _('Starter')
        PRO = 'pro', _('Pro')
        BUSINESS = 'business', _('Business')
    
    phone = models.CharField(max_length=15, blank=True)
    business_name = models.CharField(max_length=255, blank=True)
    business_type = models.CharField(
        max_length=20,
        choices=BusinessType.choices,
        default=BusinessType.INDIVIDUAL
    )
    state = models.CharField(max_length=100, blank=True)
    gstin = models.CharField(max_length=15, blank=True, unique=True, null=True)
    pan = models.CharField(max_length=10, blank=True)
    logo = models.ImageField(upload_to='logos/', blank=True, null=True)
    brand_color = models.CharField(max_length=7, default='#E07A29')
    plan = models.CharField(
        max_length=20,
        choices=Plan.choices,
        default=Plan.FREE
    )
    is_gst_registered = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.business_name or self.email
    
    @property
    def is_gst_threshold_warning(self):
        """Check if user is approaching GST registration threshold"""
        # This would calculate based on invoice totals for the financial year
        return False


class TeamMember(models.Model):
    """Team members with role-based access"""
    
    class Role(models.TextChoices):
        OWNER = 'owner', _('Owner')
        ADMIN = 'admin', _('Admin')
        ACCOUNTANT = 'accountant', _('Accountant')
        VIEWER = 'viewer', _('Viewer')
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='team_memberships')
    business = models.ForeignKey(User, on_delete=models.CASCADE, related_name='team_members')
    email = models.EmailField()
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.VIEWER)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['business', 'email']
    
    def __str__(self):
        return f"{self.email} - {self.business.business_name}"
