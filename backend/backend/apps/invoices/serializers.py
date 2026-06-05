"""
Invoice Serializers for InvoiceIN
Comprehensive validation for financial data with GST compliance
"""

from decimal import Decimal, InvalidOperation
from rest_framework import serializers
from django.utils.translation import gettext_lazy as _
from django.db import transaction

from .models import Invoice, LineItem, InvoiceActivity
from apps.clients.models import Client


class DecimalField(serializers.Field):
    """Custom decimal field with proper validation."""
    
    def __init__(self, max_digits=12, decimal_places=2, **kwargs):
        self.max_digits = max_digits
        self.decimal_places = decimal_places
        super().__init__(**kwargs)
    
    def to_representation(self, value):
        if value is None:
            return None
        return float(value)
    
    def to_internal_value(self, data):
        try:
            value = Decimal(str(data))
            # Check for negative values
            if value < 0:
                raise serializers.ValidationError("Value cannot be negative")
            return value
        except (InvalidOperation, ValueError, TypeError):
            raise serializers.ValidationError("Invalid decimal value")


class LineItemSerializer(serializers.ModelSerializer):
    """Serializer for line items with validation."""
    
    quantity = DecimalField()
    rate = DecimalField()
    discount_percent = serializers.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0')
    )
    tax_percent = serializers.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('18'),
        min_value=Decimal('0'), max_value=Decimal('100')
    )
    
    class Meta:
        model = LineItem
        fields = [
            'id', 'description', 'hsn_sac', 'quantity', 'rate',
            'discount_percent', 'discount_amount', 'tax_percent',
            'tax_amount', 'total', 'order'
        ]
        read_only_fields = ['id', 'discount_amount', 'tax_amount', 'total', 'order']
    
    def validate_quantity(self, value):
        """Validate quantity is positive."""
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0")
        return value
    
    def validate_rate(self, value):
        """Validate rate is non-negative."""
        if value < 0:
            raise serializers.ValidationError("Rate cannot be negative")
        return value
    
    def validate_hsn_sac(self, value):
        """Validate HSN/SAC code format."""
        if value:
            # Basic validation for HSN (6-8 digits) or SAC (4 digits)
            if not value.isdigit():
                raise serializers.ValidationError(
                    "HSN/SAC code must contain only digits"
                )
            if len(value) < 4 or len(value) > 8:
                raise serializers.ValidationError(
                    "HSN/SAC code must be 4-8 digits"
                )
        return value


class InvoiceListSerializer(serializers.ModelSerializer):
    """Serializer for invoice list view with minimal fields."""
    
    client_name = serializers.CharField(source='client.name', read_only=True)
    client_gstin = serializers.CharField(source='client.gstin', read_only=True)
    overdue_days = serializers.SerializerMethodField()
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'client', 'client_name', 'client_gstin',
            'status', 'issue_date', 'due_date', 'total', 'total_tax',
            'overdue_days', 'created_at'
        ]
    
    def get_overdue_days(self, obj):
        """Calculate days overdue."""
        from django.utils import timezone
        today = timezone.now().date()
        if obj.due_date < today and obj.status in ['sent', 'overdue']:
            return (today - obj.due_date).days
        return 0


class InvoiceDetailSerializer(serializers.ModelSerializer):
    """Serializer for invoice detail view with all fields."""
    
    client_name = serializers.CharField(source='client.name', read_only=True)
    client_email = serializers.CharField(source='client.email', read_only=True)
    client_gstin = serializers.CharField(source='client.gstin', read_only=True)
    client_state = serializers.CharField(source='client.state', read_only=True)
    client_address = serializers.CharField(source='client.address', read_only=True)
    
    line_items = LineItemSerializer(many=True, read_only=True)
    
    # User/seller info
    seller_name = serializers.SerializerMethodField()
    seller_gstin = serializers.SerializerMethodField()
    seller_state = serializers.SerializerMethodField()
    seller_address = serializers.SerializerMethodField()
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'status', 'client', 'client_name',
            'client_email', 'client_gstin', 'client_state', 'client_address',
            'issue_date', 'due_date', 'sent_at', 'paid_at',
            'place_of_supply', 'is_inter_state',
            'subtotal', 'discount_percent', 'discount_amount',
            'taxable_amount', 'cgst_amount', 'sgst_amount',
            'igst_amount', 'total_tax', 'total',
            'tds_applicable', 'tds_percent', 'tds_amount', 'tds_section',
            'notes', 'terms', 'irn', 'is_recurring', 'recurring_schedule',
            'line_items',
            'seller_name', 'seller_gstin', 'seller_state', 'seller_address',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'invoice_number', 'subtotal', 'discount_amount',
            'taxable_amount', 'cgst_amount', 'sgst_amount', 'igst_amount',
            'total_tax', 'total', 'tds_amount', 'is_inter_state',
            'place_of_supply', 'created_at', 'updated_at'
        ]
    
    def get_seller_name(self, obj):
        user = obj.user
        return user.business_name or user.get_full_name()
    
    def get_seller_gstin(self, obj):
        return obj.user.gstin
    
    def get_seller_state(self, obj):
        return obj.user.state
    
    def get_seller_address(self, obj):
        return getattr(obj.user, 'address', '')


class LineItemCreateSerializer(serializers.Serializer):
    """Serializer for creating/updating line items within invoice."""
    
    id = serializers.IntegerField(required=False)
    description = serializers.CharField(max_length=500, required=True)
    hsn_sac = serializers.CharField(max_length=10, required=False, default='9999')
    quantity = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=Decimal('0.01')
    )
    rate = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=Decimal('0')
    )
    discount_percent = serializers.DecimalField(
        max_digits=5, decimal_places=2, min_value=Decimal('0'),
        max_value=Decimal('100'), default=Decimal('0')
    )
    tax_percent = serializers.DecimalField(
        max_digits=5, decimal_places=2, min_value=Decimal('0'),
        max_value=Decimal('100'), default=Decimal('18')
    )
    
    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0")
        return value
    
    def validate_rate(self, value):
        if value < 0:
            raise serializers.ValidationError("Rate cannot be negative")
        return value
    
    def validate_discount_percent(self, value):
        if value < 0:
            raise serializers.ValidationError("Discount cannot be negative")
        if value > 100:
            raise serializers.ValidationError("Discount cannot exceed 100%")
        return value


class InvoiceCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating invoices with nested line items."""
    line_items = LineItemCreateSerializer(many=True, required=True)
    class Meta:
        model = Invoice
        exclude = (
            "id",
            "user",
            "subtotal",
            "discount_amount",
            "taxable_amount",
            "cgst_amount",
            "sgst_amount",
            "igst_amount",
            "total_tax",
            "total",
            "tds_amount",
            "place_of_supply",
            "is_inter_state",
            "created_at",
            "updated_at",
            "sent_at",
            "paid_at",
            "irn",
        )
        read_only_fields = (
            "invoice_number",  # if generated automatically
        )

    client = serializers.PrimaryKeyRelatedField(
        queryset=Client.objects.all()
    )
    invoice_number = serializers.CharField(max_length=50, required=False)
    issue_date = serializers.DateField(required=True)
    due_date = serializers.DateField(required=True)
    discount_percent = serializers.DecimalField(
        max_digits=5, decimal_places=2, min_value=Decimal('0'),
        max_value=Decimal('100'), default=Decimal('0'), required=False
    )
    notes = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    terms = serializers.CharField(max_length=2000, required=False, allow_blank=True)
    tds_applicable = serializers.BooleanField(default=False)
    tds_percent = serializers.DecimalField(
        max_digits=5, decimal_places=2, min_value=Decimal('0'),
        max_value=Decimal('100'), default=Decimal('0'), required=False
    )
    tds_section = serializers.CharField(max_length=20, required=False, allow_blank=True)
    line_items = LineItemCreateSerializer(many=True, required=True)
    
    def validate_client(self, value):
        """Validate client belongs to the user."""
        user = self.context['request'].user
        if value.user != user:
            raise serializers.ValidationError("Invalid client selected")
        return value
    
    def validate_line_items(self, value):
        """Validate at least one line item exists."""
        if not value:
            raise serializers.ValidationError("At least one line item is required")
        return value
    
    def validate_due_date(self, value):
        """Validate due date is not before issue date."""
        issue_date = self.initial_data.get('issue_date')
        if issue_date and value:
            from datetime import datetime
            if isinstance(issue_date, str):
                issue_date = datetime.strptime(issue_date, '%Y-%m-%d').date()
            if value < issue_date:
                raise serializers.ValidationError(
                    "Due date cannot be before issue date"
                )
        return value
    
    def validate(self, attrs):
        """Cross-field validation."""
        # Validate TDS if applicable
        if attrs.get('tds_applicable'):
            if not attrs.get('tds_percent') or attrs['tds_percent'] <= 0:
                raise serializers.ValidationError({
                    'tds_percent': 'TDS percent is required when TDS is applicable'
                })
            if not attrs.get('tds_section'):
                raise serializers.ValidationError({
                    'tds_section': 'TDS section is required when TDS is applicable'
                })
        
        return attrs


class InvoiceUpdateSerializer(serializers.Serializer):
    """Serializer for updating invoices."""
    
    client = serializers.PrimaryKeyRelatedField(
        queryset=Client.objects.all(), required=False
    )
    issue_date = serializers.DateField(required=False)
    due_date = serializers.DateField(required=False)
    discount_percent = serializers.DecimalField(
        max_digits=5, decimal_places=2, min_value=Decimal('0'),
        max_value=Decimal('100'), required=False
    )
    notes = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    terms = serializers.CharField(max_length=2000, required=False, allow_blank=True)
    tds_applicable = serializers.BooleanField(required=False)
    tds_percent = serializers.DecimalField(
        max_digits=5, decimal_places=2, min_value=Decimal('0'),
        max_value=Decimal('100'), required=False
    )
    tds_section = serializers.CharField(max_length=20, required=False, allow_blank=True)
    line_items = LineItemCreateSerializer(many=True, required=True)
    
    def validate_line_items(self, value):
        """Validate at least one line item exists."""
        if not value:
            raise serializers.ValidationError("At least one line item is required")
        return value


class InvoiceActivitySerializer(serializers.ModelSerializer):
    """Serializer for invoice activity/audit log."""
    
    class Meta:
        model = InvoiceActivity
        fields = ['id', 'activity_type', 'description', 'ip_address', 'created_at']
        read_only_fields = ['id', 'created_at']
