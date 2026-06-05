from django.db import models
from django.conf import settings
from apps.clients.models import Client
from django.utils.translation import gettext_lazy as _

class Invoice(models.Model):
    """Invoice model with automatic GST calculation"""
    
    class Status(models.TextChoices):
        DRAFT = 'draft', _('Draft')
        SENT = 'sent', _('Sent')
        PAID = 'paid', _('Paid')
        OVERDUE = 'overdue', _('Overdue')
        CANCELLED = 'cancelled', _('Cancelled')
    
    class RecurringSchedule(models.TextChoices):
        WEEKLY = 'weekly', _('Weekly')
        MONTHLY = 'monthly', _('Monthly')
        QUARTERLY = 'quarterly', _('Quarterly')
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='invoices'
    )
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name='invoices'
    )
    
    invoice_number = models.CharField(max_length=50, unique=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT
    )
    
    # Dates
    issue_date = models.DateField()
    due_date = models.DateField()
    sent_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    
    # Supply details
    place_of_supply = models.CharField(max_length=100)
    is_inter_state = models.BooleanField(default=False)
    
    # Financial fields
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    taxable_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cgst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sgst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    igst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_tax = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # TDS
    tds_applicable = models.BooleanField(default=False)
    tds_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tds_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tds_section = models.CharField(max_length=20, blank=True)
    
    # Notes
    notes = models.TextField(blank=True)
    terms = models.TextField(blank=True)
    
    # E-invoicing
    irn = models.CharField(max_length=64, blank=True)
    qr_code = models.ImageField(upload_to='qr_codes/', blank=True, null=True)
    
    # Recurring
    is_recurring = models.BooleanField(default=False)
    recurring_schedule = models.CharField(
        max_length=20,
        choices=RecurringSchedule.choices,
        blank=True
    )
    parent_invoice = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='recurring_invoices'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.invoice_number} - {self.client.name}"
    
    def calculate_gst(self):
        """Calculate CGST/SGST or IGST based on states"""
        self.is_inter_state = self.user.state != self.client.state
        
        if self.is_inter_state:
            self.igst_amount = self.taxable_amount * 18 / 100
            self.cgst_amount = 0
            self.sgst_amount = 0
        else:
            self.cgst_amount = self.taxable_amount * 9 / 100
            self.sgst_amount = self.taxable_amount * 9 / 100
            self.igst_amount = 0
        
        self.total_tax = self.cgst_amount + self.sgst_amount + self.igst_amount
        self.total = self.taxable_amount + self.total_tax
    
    def calculate_tds(self):
        """Calculate TDS if applicable"""
        if self.tds_applicable and self.client.tds_applicable:
            self.tds_amount = self.total * (self.tds_percent / 100)
        else:
            self.tds_amount = 0
    
    def save(self, *args, **kwargs):
        self.place_of_supply = self.client.state
        self.calculate_gst()
        self.calculate_tds()
        super().save(*args, **kwargs)


class LineItem(models.Model):
    """Line items for invoices"""
    
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='line_items'
    )
    
    description = models.CharField(max_length=500)
    hsn_sac = models.CharField(max_length=10)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    rate = models.DecimalField(max_digits=12, decimal_places=2)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_percent = models.DecimalField(max_digits=5, decimal_places=2, default=18)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    order = models.PositiveIntegerField(default=0)
    
    def __str__(self):
        return f"{self.description[:30]}..."
    
    def save(self, *args, **kwargs):
        base_amount = self.quantity * self.rate
        self.discount_amount = base_amount * (self.discount_percent / 100)
        taxable = base_amount - self.discount_amount
        self.tax_amount = taxable * (self.tax_percent / 100)
        self.total = taxable + self.tax_amount
        super().save(*args, **kwargs)


class InvoiceActivity(models.Model):
    """Track invoice activities for audit"""
    
    class ActivityType(models.TextChoices):
        CREATED = 'created', _('Created')
        VIEWED = 'viewed', _('Viewed')
        SENT = 'sent', _('Sent')
        PAID = 'paid', _('Paid')
        REMINDER_SENT = 'reminder_sent', _('Reminder Sent')
        EDITED = 'edited', _('Edited')
        DELETED = 'deleted', _('Deleted')
    
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='activities'
    )
    activity_type = models.CharField(
        max_length=20,
        choices=ActivityType.choices
    )
    description = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.invoice.invoice_number} - {self.activity_type}"
