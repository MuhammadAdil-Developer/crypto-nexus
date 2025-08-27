from rest_framework import serializers
from .models import VendorApplication
from django.utils import timezone

class VendorApplicationSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    business_type_display = serializers.CharField(source='get_business_type_display', read_only=True)
    years_in_business_display = serializers.CharField(source='get_years_in_business_display', read_only=True)
    preferred_payment_display = serializers.CharField(source='get_preferred_payment_display', read_only=True)
    created_at_formatted = serializers.SerializerMethodField()
    reviewed_at_formatted = serializers.SerializerMethodField()
    
    # File URL fields
    logo_url = serializers.SerializerMethodField()
    documents_url = serializers.SerializerMethodField()
    images_url = serializers.SerializerMethodField()
    
    # Override main fields to return arrays
    logo = serializers.SerializerMethodField()
    documents = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    
    class Meta:
        model = VendorApplication
        fields = [
            'id', 'business_name', 'vendor_username', 'email', 'contact', 'phone',
            'website', 'social_media', 'store_description', 'category', 'category_display',
            'sub_category', 'business_type', 'business_type_display', 'years_in_business',
            'years_in_business_display', 'target_market', 'business_plan',
            'btc_address', 'xmr_address', 'preferred_payment', 'preferred_payment_display',
            'business_address', 'business_license', 'tax_id', 'insurance',
            'documents', 'logo', 'images', 'logo_url', 'documents_url', 'images_url',
            'status', 'status_display', 'admin_notes',
            'reviewed_by', 'reviewed_at', 'reviewed_at_formatted',
            'created_at', 'created_at_formatted', 'updated_at'
        ]
        read_only_fields = ['id', 'status', 'admin_notes', 'reviewed_by', 'reviewed_at', 'created_at', 'updated_at']
    
    def get_created_at_formatted(self, obj):
        if obj.created_at:
            return obj.created_at.strftime('%B %d, %Y at %I:%M %p')
        return None
    
    def get_reviewed_at_formatted(self, obj):
        if obj.reviewed_at:
            return obj.reviewed_at.strftime('%B %d, %Y at %I:%M %p')
        return None
    
    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            if request:
                return [request.build_absolute_uri(obj.logo.url)]  # Return as array
            return [obj.logo.url]  # Return as array
        return []  # Return empty array
    
    def get_documents_url(self, obj):
        if obj.documents:
            request = self.context.get('request')
            if request:
                return [request.build_absolute_uri(obj.documents.url)]  # Return as array
            return [obj.documents.url]  # Return as array
        return []  # Return empty array
    
    def get_images_url(self, obj):
        if obj.images:
            request = self.context.get('request')
            if request:
                return [request.build_absolute_uri(obj.images.url)]  # Return as array
            return [obj.images.url]  # Return as array
        return []  # Return empty array
    
    # Convert single files to arrays for main fields
    def get_logo(self, obj):
        if obj.logo:
            request = self.context.get('request')
            if request:
                return [request.build_absolute_uri(obj.logo.url)]  # Return as array
            return [obj.logo.url]  # Return as array
        return []  # Return empty array
    
    def get_documents(self, obj):
        if obj.documents:
            request = self.context.get('request')
            if request:
                return [request.build_absolute_uri(obj.documents.url)]  # Return as array
            return [obj.documents.url]  # Return as array
        return []  # Return empty array
    
    def get_images(self, obj):
        if obj.images:
            request = self.context.get('request')
            if request:
                return [request.build_absolute_uri(obj.images.url)]  # Return as array
            return [obj.images.url]  # Return as array
        return []  # Return empty array

class VendorApplicationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorApplication
        fields = [
            'business_name', 'vendor_username', 'email', 'contact', 'phone',
            'website', 'social_media', 'store_description', 'category', 'sub_category',
            'business_type', 'years_in_business', 'target_market', 'business_plan',
            'btc_address', 'xmr_address', 'preferred_payment',
            'business_address', 'business_license', 'tax_id', 'insurance',
            'documents', 'logo', 'images'
        ]
    
    def validate_vendor_username(self, value):
        # Check if username is already taken
        if VendorApplication.objects.filter(vendor_username=value).exists():
            raise serializers.ValidationError("This vendor username is already taken.")
        return value
    
    def validate_email(self, value):
        # Check if email is already used
        if VendorApplication.objects.filter(email=value).exists():
            raise serializers.ValidationError("This email is already registered.")
        return value
    
    def create(self, validated_data):
        # Handle file uploads
        documents = self.context['request'].FILES.get('documents')
        logo = self.context['request'].FILES.get('logo')
        images = self.context['request'].FILES.get('images')
        
        if documents:
            validated_data['documents'] = documents
        if logo:
            validated_data['logo'] = logo
        if images:
            validated_data['images'] = images
        
        return super().create(validated_data)

class VendorApplicationUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorApplication
        fields = ['status', 'admin_notes']
    
    def update(self, instance, validated_data):
        # Set reviewed_by and reviewed_at when status changes
        if 'status' in validated_data and validated_data['status'] != instance.status:
            validated_data['reviewed_by'] = self.context['request'].user
            validated_data['reviewed_at'] = timezone.now()
        
        return super().update(instance, validated_data) 