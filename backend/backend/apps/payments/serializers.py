"""
Payment Serializers for InvoiceIN
Validation for payment records and Razorpay integration
"""

from decimal import Decimal
from rest_framework import serializers
from django.utils.translation import gettext_lazy as _

from .models import PaymentRecord
from apps.invoices.models import Invoice


class PaymentRecordSerializer(serializers.ModelSerializer):
    """Serializer for payment records."""

    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)
    client_name = serializers.CharField(source='invoice.client.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)

    class Meta:
        model = PaymentRecord
        fields = [
            'id', 'invoice', 'invoice_number', 'client_name',
            'amount', 'payment_method', 'payment_method_display',
            'razorpay_payment_id', 'razorpay_order_id', 'razorpay_payment_link_id',
            'status', 'status_display', 'is_verified',
            'refund_id', 'refund_amount', 'refund_status',
            'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'razorpay_payment_id', 'razorpay_order_id',
            'razorpay_payment_link_id', 'is_verified',
            'refund_id', 'refund_amount', 'refund_status',
            'created_at', 'updated_at'
        ]


class PaymentCreateSerializer(serializers.Serializer):
    """Serializer for creating payment records manually."""

    invoice = serializers.PrimaryKeyRelatedField(queryset=Invoice.objects.all())
    amount = serializers.DecimalField(
        max_digits=12, decimal_places=2,
        min_value=Decimal('0.01')
    )
    payment_method = serializers.ChoiceField(
        choices=PaymentRecord.PaymentMethod.choices,
        required=False,
        default=PaymentRecord.PaymentMethod.ONLINE
    )
    transaction_id = serializers.CharField(max_length=100, required=False, allow_blank=True)
    notes = serializers.CharField(max_length=500, required=False, allow_blank=True)

    def validate_amount(self, value):
        """Validate amount is positive."""
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than 0")
        return value


class RefundSerializer(serializers.Serializer):
    """Serializer for refund requests."""

    amount = serializers.DecimalField(
        max_digits=12, decimal_places=2,
        min_value=Decimal('0.01'),
        required=False,
        help_text="Amount to refund. Leave empty for full refund."
    )
    speed = serializers.ChoiceField(
        choices=['normal', 'optimum'],
        default='normal',
        required=False
    )
    reason = serializers.CharField(max_length=500, required=False, allow_blank=True)


class WebhookSerializer(serializers.Serializer):
    """Serializer for Razorpay webhook payload."""

    event = serializers.CharField()
    payload = serializers.DictField()

    def validate_event(self, value):
        """Validate webhook event type."""
        valid_events = [
            'payment.captured',
            'payment.failed',
            'order.paid',
            'refund.created',
            'refund.processed'
        ]
        if value not in valid_events:
            raise serializers.ValidationError(f"Invalid webhook event: {value}")
        return value
