from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class Expense(models.Model):
    """Expense model for tracking business expenses and ITC"""

    class Category(models.TextChoices):
        SOFTWARE = 'software', _('Software & SaaS')
        EQUIPMENT = 'equipment', _('Equipment')
        TRAVEL = 'travel', _('Travel')
        MEALS = 'meals', _('Meals & Entertainment')
        OFFICE = 'office', _('Office Supplies')
        RENT = 'rent', _('Rent')
        UTILITIES = 'utilities', _('Utilities')
        PROFESSIONAL = 'professional', _('Professional Services')
        MARKETING = 'marketing', _('Marketing')
        OTHER = 'other', _('Other')

    class PaymentMode(models.TextChoices):
        ONLINE = 'online', _('Online')
        CASH = 'cash', _('Cash')
        CHEQUE = 'cheque', _('Cheque')
        CARD = 'card', _('Card')
        BANK_TRANSFER = 'bank_transfer', _('Bank Transfer')

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='expenses'
    )

    vendor_name = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    amount = models.DecimalField(max_digits=12, decimal_places=2)
    gst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0) # type: ignore
    cgst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0) # type: ignore
    sgst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0) # type: ignore
    igst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0) # type: ignore

    category = models.CharField(
        max_length=20,
        choices=Category.choices,
        default=Category.OTHER
    )

    invoice_date = models.DateField()
    payment_mode = models.CharField(
        max_length=20,
        choices=PaymentMode.choices,
        default=PaymentMode.ONLINE
    )
    reference_number = models.CharField(max_length=100, blank=True)

    # GST details
    vendor_gstin = models.CharField(max_length=15, blank=True)
    is_igst = models.BooleanField(default=False)

    # Vendor details
    vendor_address = models.TextField(blank=True)
    vendor_state = models.CharField(max_length=100, blank=True)

    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-invoice_date']
        verbose_name_plural = 'Expenses'

    def __str__(self):
        return f"{self.vendor_name} - {self.amount}"

    @property
    def total_with_gst(self):
        """Total amount including GST"""
        return self.amount + self.gst_amount

    @property
    def input_tax_credit(self):
        """ITC that can be claimed"""
        return self.gst_amount
