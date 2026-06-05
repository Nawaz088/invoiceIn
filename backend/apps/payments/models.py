"""
Payment Records Model for InvoiceIN
Tracks all payment transactions and integrates with Razorpay
"""

from decimal import Decimal
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class PaymentRecord(models.Model):
    """
    Payment record model for tracking all payment transactions.
    Integrates with Razorpay for online payments.
    """

    class Status(models.TextChoices):
        PENDING = 'pending', _('Pending')
        COMPLETED = 'completed', _('Completed')
        FAILED = 'failed', _('Failed')
        REFUNDED = 'refunded', _('Refunded')
        PARTIALLY_REFUNDED = 'partially_refunded', _('Partially Refunded')

    class PaymentMethod(models.TextChoices):
        ONLINE = 'online', _('Online')
        BANK_TRANSFER = 'bank_transfer', _('Bank Transfer')
        UPI = 'upi', _('UPI')
        CARD = 'card', _('Card')
        CASH = 'cash', _('Cash')
        CHEQUE = 'cheque', _('Cheque')
        OTHER = 'other', _('Other')

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='payment_records'
    )

    invoice = models.ForeignKey(
        'invoices.Invoice',
        on_delete=models.CASCADE,
        related_name='payments'
    )

    # Amount
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='INR')

    # Payment method
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.ONLINE
    )
    transaction_id = models.CharField(max_length=100, blank=True)

    # Razorpay integration
    razorpay_order_id = models.CharField(max_length=100, blank=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True)
    razorpay_payment_link_id = models.CharField(max_length=100, blank=True)

    # Status
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    is_verified = models.BooleanField(default=False)

    # Refund info
    refund_id = models.CharField(max_length=100, blank=True)
    refund_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    refund_status = models.CharField(max_length=20, blank=True)
    refund_reason = models.TextField(blank=True)

    # Timestamps
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Notes
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Payment Records'

    def __str__(self):
        return f"Payment {self.id} - {self.invoice.invoice_number} - {self.amount}"

    @property
    def is_refundable(self):
        """Check if payment can be refunded."""
        return (
            self.status == self.Status.COMPLETED and
            not self.refund_id and
            self.razorpay_payment_id
        )

    @property
    def pending_refund_amount(self):
        """Get pending refund amount."""
        if self.refund_id:
            return self.amount - self.refund_amount
        return Decimal('0')
