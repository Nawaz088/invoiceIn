from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import TeamMember

User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = [
            'email', 'phone', 'password', 'password_confirm',
            'business_name', 'business_type', 'state', 'gstin', 'pan'
        ]
        extra_kwargs = {
            'email': {'required': True},
            'business_name': {'required': True},
            'state': {'required': True},
        }
    
    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password_confirm'):
            raise serializers.ValidationError({"password": "Passwords don't match"})
        
        # Validate GSTIN format if provided
        if attrs.get('gstin'):
            gstin = attrs['gstin'].upper()
            if len(gstin) != 15:
                raise serializers.ValidationError({"gstin": "Invalid GSTIN format"})
            attrs['gstin'] = gstin
            attrs['is_gst_registered'] = True
        
        return attrs
    
    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            password=validated_data['password'],
            phone=validated_data.get('phone', ''),
            business_name=validated_data.get('business_name', ''),
            business_type=validated_data.get('business_type', 'individual'),
            state=validated_data.get('state', ''),
            gstin=validated_data.get('gstin', ''),
            pan=validated_data.get('pan', ''),
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user profile"""
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'phone', 'business_name', 'business_type',
            'state', 'gstin', 'pan', 'logo', 'brand_color', 'plan',
            'is_gst_registered', 'is_gst_threshold_warning'
        ]
        read_only_fields = ['id', 'email', 'plan']


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile"""
    
    class Meta:
        model = User
        fields = [
            'phone', 'business_name', 'business_type', 'state',
            'gstin', 'pan', 'logo', 'brand_color'
        ]
    
    def validate_gstin(self, value):
        if value:
            value = value.upper()
            if len(value) != 15:
                raise serializers.ValidationError("Invalid GSTIN format")
        return value


class TeamMemberSerializer(serializers.ModelSerializer):
    """Serializer for team members"""
    
    class Meta:
        model = TeamMember
        fields = ['id', 'email', 'role', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']
