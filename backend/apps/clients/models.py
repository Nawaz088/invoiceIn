"""
Clients App - Client management with GST/TDS tracking
"""

from django.db import models
from django.conf import settings


class Client(models.Model):
    """Client model with GSTIN and TDS tracking"""
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='clients'
    )
    
    name = models.CharField(max_length=255)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=15, blank=True)
    
    # Address
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=6, blank=True)
    
    # Tax details
    gstin = models.CharField(max_length=15, blank=True)
    pan = models.CharField(max_length=10, blank=True)
    is_gst_registered = models.BooleanField(default=False)
    
    # TDS
    tds_applicable = models.BooleanField(default=False)
    tds_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=10,
        help_text="TDS rate percentage"
    )
    tds_section = models.CharField(
        max_length=20,
        blank=True,
        help_text="e.g., 194J for professional services"
    )
    
    # Payment info
    payment_terms = models.PositiveIntegerField(
        default=30,
        help_text="Payment terms in days"
    )
    
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Clients'
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if self.gstin:
            self.gstin = self.gstin.upper()
            self.is_gst_registered = True
        if self.pan:
            self.pan = self.pan.upper()
        super().save(*args, **kwargs)
    
    @property
    def total_invoiced(self):
        """Total amount invoiced to this client"""
        return sum(
            invoice.total for invoice in self.invoices.all()
        )
    
    @property
    def total_received(self):
        """Total amount received from this client"""
        return sum(
            invoice.total for invoice in self.invoices.filter(status='paid')
        )
    
    @property
    def outstanding_amount(self):
        """Outstanding amount from this client"""
        return sum(
            invoice.total for invoice in self.invoices.filter(
                status__in=['sent', 'overdue']
            )
        )
