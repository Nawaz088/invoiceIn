"""
Expense Serializers for InvoiceIN
Comprehensive validation for expense tracking with ITC eligibility
"""

from decimal import Decimal, InvalidOperation
from rest_framework import serializers
from django.utils.translation import gettext_lazy as _

from .models import Expense


class ExpenseSerializer(serializers.ModelSerializer):
    """Serializer for expense list and detail views."""
    
    category_display = serializers.CharField(
        source='get_category_display', read_only=True
    )
    payment_mode_display = serializers.CharField(
        source='get_payment_mode_display', read_only=True
    )
    itc_eligible = serializers.SerializerMethodField()
    itc_amount = serializers.SerializerMethodField()
    
    class Meta:
        model = Expense
        fields = [
            'id', 'vendor_name', 'description', 'amount', 'gst_amount',
            'category', 'category_display', 'invoice_date',
            'payment_mode', 'payment_mode_display',
            'reference_number', 'notes', 'itc_eligible', 'itc_amount',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_itc_eligible(self, obj):
        """Check if expense is eligible for Input Tax Credit."""
        itc_eligible_categories = [
            'software', 'equipment', 'professional',
            'rent', 'utilities'
        ]
        return obj.category in itc_eligible_categories
    
    def get_itc_amount(self, obj):
        """Get ITC amount (GST amount for eligible expenses)."""
        if self.get_itc_eligible(obj):
            return float(obj.gst_amount)
        return 0


class ExpenseCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating expenses with validation."""
    class Meta:
        model = Expense
        fields = [
            "id",
            "vendor_name",
            "description",
            "amount",
            "gst_amount",
            "category",
            "invoice_date",
            "payment_mode",
            "reference_number",
            "notes",
        ]
    
    vendor_name = serializers.CharField(max_length=255, required=True)
    description = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    amount = serializers.DecimalField(
        max_digits=12, decimal_places=2,
        min_value=Decimal('0.01'),
        required=True
    )
    gst_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2,
        min_value=Decimal('0'),
        max_value=Decimal('999999999.99'),
        default=Decimal('0'),
        required=False
    )
    category = serializers.ChoiceField(
        choices=Expense.Category.choices,
        default=Expense.Category.OTHER
    )
    invoice_date = serializers.DateField(required=True)
    payment_mode = serializers.ChoiceField(
        choices=Expense.PaymentMode.choices,
        default=Expense.PaymentMode.ONLINE
    )
    reference_number = serializers.CharField(
        max_length=100, required=False, allow_blank=True
    )
    notes = serializers.CharField(max_length=2000, required=False, allow_blank=True)
    
    def validate_amount(self, value):
        """Validate amount is positive."""
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than 0")
        return value
    
    def validate(self, attrs):
        """Cross-field validation."""
        amount = attrs.get('amount', Decimal('0'))
        gst_amount = attrs.get('gst_amount', Decimal('0'))
        
        if gst_amount > 0 and amount <= 0:
            raise serializers.ValidationError({
                'amount': 'Amount is required when GST amount is specified'
            })
        
        max_gst_rate = Decimal('28')
        if gst_amount > amount * max_gst_rate / Decimal('100'):
            raise serializers.ValidationError({
                'gst_amount': 'GST amount seems too high for the given amount'
            })
        
        return attrs


class ExpenseUpdateSerializer(serializers.Serializer):
    """Serializer for updating expenses."""
    class Meta:
        model = Expense
        fields = [
            "id",
            "vendor_name",
            "description",
            "amount",
            "gst_amount",
            "category",
            "invoice_date",
            "payment_mode",
            "reference_number",
            "notes",
        ]
    
    vendor_name = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    amount = serializers.DecimalField(
        max_digits=12, decimal_places=2,
        min_value=Decimal('0.01'),
        required=False
    )
    gst_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2,
        min_value=Decimal('0'),
        required=False
    )
    category = serializers.ChoiceField(
        choices=Expense.Category.choices,
        required=False
    )
    invoice_date = serializers.DateField(required=False)
    payment_mode = serializers.ChoiceField(
        choices=Expense.PaymentMode.choices,
        required=False
    )
    reference_number = serializers.CharField(
        max_length=100, required=False, allow_blank=True
    )
    notes = serializers.CharField(max_length=2000, required=False, allow_blank=True)


class BulkExpenseSerializer(serializers.Serializer):
    """Serializer for bulk expense import."""
    
    expenses = ExpenseCreateSerializer(many=True, required=True)
    
    def validate_expenses(self, value):
        """Validate expenses list."""
        if not value:
            raise serializers.ValidationError("At least one expense is required")
        if len(value) > 100:
            raise serializers.ValidationError("Maximum 100 expenses can be imported at once")
        return value
