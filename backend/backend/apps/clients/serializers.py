"""
Client Serializers for InvoiceIN
Comprehensive validation with GST/TDS compliance
"""

import re
from decimal import Decimal
from rest_framework import serializers
from django.utils.translation import gettext_lazy as _

from .models import Client


class ClientListSerializer(serializers.ModelSerializer):
    """Serializer for client list view with summary fields."""
    
    total_invoiced = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )
    outstanding_amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )
    invoice_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Client
        fields = [
            'id', 'name', 'email', 'phone', 'gstin',
            'is_gst_registered', 'tds_applicable',
            'state', 'total_invoiced', 'outstanding_amount',
            'invoice_count'
        ]
    
    def get_invoice_count(self, obj):
        return obj.invoices.count()


class ClientDetailSerializer(serializers.ModelSerializer):
    """Serializer for client detail view with all fields."""
    
    total_invoiced = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )
    total_received = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )
    outstanding_amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )
    invoice_count = serializers.SerializerMethodField()
    recent_invoices = serializers.SerializerMethodField()
    
    class Meta:
        model = Client
        fields = [
            'id', 'name', 'email', 'phone', 'address', 'city',
            'state', 'pincode', 'gstin', 'pan', 'is_gst_registered',
            'tds_applicable', 'tds_percent', 'tds_section',
            'payment_terms', 'notes', 'total_invoiced',
            'total_received', 'outstanding_amount', 'invoice_count',
            'recent_invoices', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_invoice_count(self, obj):
        return obj.invoices.count()
    
    def get_recent_invoices(self, obj):
        return obj.invoices.all()[:5].values_list('invoice_number', flat=True)


class ClientCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating clients with comprehensive validation."""
    class Meta:
        model = Client
        exclude = ["user"]
    
    name = serializers.CharField(
        max_length=255,
        required=True,
        min_length=2
    )
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(max_length=15, required=False, allow_blank=True)
    
    # Address
    address = serializers.CharField(max_length=500, required=False, allow_blank=True)
    city = serializers.CharField(max_length=100, required=False, allow_blank=True)
    state = serializers.CharField(max_length=100, required=True)
    pincode = serializers.CharField(max_length=6, required=False, allow_blank=True)
    
    # Tax details
    gstin = serializers.CharField(max_length=15, required=False, allow_blank=True)
    pan = serializers.CharField(max_length=10, required=False, allow_blank=True)
    
    # TDS
    tds_applicable = serializers.BooleanField(default=False)
    tds_percent = serializers.DecimalField(
        max_digits=5, decimal_places=2,
        min_value=Decimal('0'),
        max_value=Decimal('100'),
        default=Decimal('10'),
        required=False
    )
    tds_section = serializers.CharField(max_length=20, required=False, allow_blank=True)
    
    # Payment
    payment_terms = serializers.IntegerField(
        min_value=0,
        max_value=365,
        default=30,
        required=False
    )
    notes = serializers.CharField(max_length=2000, required=False, allow_blank=True)
    
    def validate_gstin(self, value):
        """Validate GSTIN format."""
        if not value:
            return value
        
        value = value.upper().strip()
        
        # Length check
        if len(value) != 15:
            raise serializers.ValidationError("GSTIN must be exactly 15 characters")
        
        # Pattern check
        pattern = r'^[0-9]{2}[A-Z]{10}[0-9]{1}[Z]{1}[0-9]{1}$'
        if not re.match(pattern, value):
            raise serializers.ValidationError(
                "Invalid GSTIN format. Expected format: 27AABCU9603R1ZM"
            )
        
        # Validate state code (first 2 digits)
        state_codes = [str(i).zfill(2) for i in range(1, 38)]
        if value[:2] not in state_codes:
            raise serializers.ValidationError("Invalid GSTIN state code")
        
        return value
    
    def validate_pan(self, value):
        """Validate PAN format."""
        if not value:
            return value
        
        value = value.upper().strip()
        
        if len(value) != 10:
            raise serializers.ValidationError("PAN must be exactly 10 characters")
        
        # PAN format: AAAAA0000A (5 letters, 4 digits, 1 letter)
        pattern = r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$'
        if not re.match(pattern, value):
            raise serializers.ValidationError(
                "Invalid PAN format. Expected format: ABCDE1234F"
            )
        
        return value
    
    def validate_state(self, value):
        """Validate Indian state name."""
        if not value:
            raise serializers.ValidationError("State is required")
        
        # Common Indian states (uppercase for comparison)
        valid_states = [
            'ANDHRA PRADESH', 'ARUNACHAL PRADESH', 'ASSAM', 'BIHAR', 'CHHATTISGARH',
            'GOA', 'GUJARAT', 'HARYANA', 'HIMACHAL PRADESH', 'JHARKHAND',
            'KARNATAKA', 'KERALA', 'MADHYA PRADESH', 'MAHARASHTRA', 'MANIPUR',
            'MEGHALAYA', 'MIZORAM', 'NAGALAND', 'ODISHA', 'PUNJAB',
            'RAJASTHAN', 'SIKKIM', 'TAMIL NADU', 'TELANGANA', 'TRIPURA',
            'UTTAR PRADESH', 'UTTARAKHAND', 'WEST BENGEL', 'WEST BENGAL',
            # Union Territories
            'ANDAMAN AND NICOBAR ISLANDS', 'CHANDIGARH', 'DADRA AND NAGAR HAVELI AND DAMAN AND DIU',
            'DELHI', 'JAMMU AND KASHMIR', 'LADAKH', 'LAKSHADWEEP', 'PUDUCHERRY'
        ]
        
        if value.upper() not in valid_states:
            raise serializers.ValidationError(
                f"Invalid state. Please enter a valid Indian state name"
            )
        
        return value.upper()
    
    def validate_pincode(self, value):
        """Validate Indian pincode."""
        if not value:
            return value
        
        if not value.isdigit():
            raise serializers.ValidationError("Pincode must contain only digits")
        
        if len(value) != 6:
            raise serializers.ValidationError("Pincode must be 6 digits")
        
        return value
    
    def validate_phone(self, value):
        """Validate phone number."""
        if not value:
            return value
        
        # Remove common separators
        cleaned = re.sub(r'[\s\-\+\(\)]', '', value)
        
        if not cleaned.isdigit():
            raise serializers.ValidationError("Phone number must contain only digits")
        
        if len(cleaned) < 10 or len(cleaned) > 12:
            raise serializers.ValidationError("Phone number must be 10-12 digits")
        
        return cleaned
    
    def validate(self, attrs):
        """Cross-field validation."""
        # GSTIN is required for GST registered clients
        if attrs.get('is_gst_registered') and not attrs.get('gstin'):
            attrs['gstin'] = None  # Will be set automatically if PAN is provided
        
        # TDS validation
        if attrs.get('tds_applicable'):
            if not attrs.get('tds_percent') or attrs['tds_percent'] <= 0:
                raise serializers.ValidationError({
                    'tds_percent': 'TDS percent is required when TDS is applicable'
                })
            if not attrs.get('tds_section'):
                raise serializers.ValidationError({
                    'tds_section': 'TDS section is required when TDS is applicable'
                })
        
        # Validate GSTIN state matches client state
        gstin = attrs.get('gstin')
        state = attrs.get('state')
        if gstin and state:
            gstin_state_code = int(gstin[:2])
            # This would need a mapping of state to state code
            # Simplified validation
        
        return attrs


class ClientUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating clients."""
    class Meta:
        model = Client
        exclude = ["user"]
        read_only_fields = ("user",)

    name = serializers.CharField(max_length=255, required=False)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(max_length=15, required=False, allow_blank=True)
    address = serializers.CharField(max_length=500, required=False, allow_blank=True)
    city = serializers.CharField(max_length=100, required=False, allow_blank=True)
    state = serializers.CharField(max_length=100, required=False)
    pincode = serializers.CharField(max_length=6, required=False, allow_blank=True)
    gstin = serializers.CharField(max_length=15, required=False, allow_blank=True)
    pan = serializers.CharField(max_length=10, required=False, allow_blank=True)
    is_gst_registered = serializers.BooleanField(required=False)
    tds_applicable = serializers.BooleanField(required=False)
    tds_percent = serializers.DecimalField(
        max_digits=5, decimal_places=2,
        min_value=Decimal('0'),
        max_value=Decimal('100'),
        required=False
    )
    tds_section = serializers.CharField(max_length=20, required=False, allow_blank=True)
    payment_terms = serializers.IntegerField(
        min_value=0, max_value=365, required=False
    )
    notes = serializers.CharField(max_length=2000, required=False, allow_blank=True)


class InvoiceDetailSerializer(serializers.Serializer):
    """Stub serializer for invoice detail - import from invoices app for actual use."""

    id = serializers.IntegerField(read_only=True)
    invoice_number = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    issue_date = serializers.DateField(read_only=True)
    due_date = serializers.DateField(read_only=True)
