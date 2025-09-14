from rest_framework import serializers
from .models import Product, ProductCategory, ProductSubCategory


class ProductCategorySerializer(serializers.ModelSerializer):
    """Serializer for product categories"""
    
    class Meta:
        model = ProductCategory
        fields = ['id', 'name', 'slug', 'description', 'icon']


class ProductSubCategorySerializer(serializers.ModelSerializer):
    """Serializer for product sub-categories"""
    
    class Meta:
        model = ProductSubCategory
        fields = ['id', 'name', 'slug', 'description', 'category']


class ProductSerializer(serializers.ModelSerializer):
    """Basic product serializer for listings"""
    vendor_username = serializers.CharField(source='vendor.username', read_only=True)
    credentials_display = serializers.CharField(source='get_credentials_display', read_only=True)
    vendor = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()
    sub_category = serializers.SerializerMethodField()
    listing_title = serializers.CharField(source='headline', read_only=True)
    
    def get_vendor(self, obj):
        if obj.vendor:
            return {
                'id': obj.vendor.id,
                'username': obj.vendor.username,
                'email': obj.vendor.email
            }
        return None
    
    def get_category(self, obj):
        if obj.category:
            return {
                'id': obj.category.id,
                'name': obj.category.name
            }
        return None
    
    def get_sub_category(self, obj):
        if obj.sub_category:
            return {
                'id': obj.sub_category.id,
                'name': obj.sub_category.name
            }
        return None
    
    class Meta:
        model = Product
        fields = [
            'id', 'headline', 'listing_title', 'website', 'account_type', 'access_type', 
            'account_balance', 'description', 'price', 'additional_info',
            'delivery_time', 'credentials_display', 'main_image', 
            'gallery_images', 'status', 'is_featured', 'views_count',
            'favorites_count', 'rating', 'review_count', 'created_at',
            'vendor_username', 'vendor', 'category', 'sub_category',
            'main_images', 'tags', 'special_features', 'quantity_available', 'escrow_enabled'
        ]
        read_only_fields = [
            'id', 'status', 'is_featured', 'views_count', 'favorites_count',
            'rating', 'review_count', 'created_at', 'vendor_username'
        ]


class ProductDetailSerializer(serializers.ModelSerializer):
    """Detailed product serializer for product pages"""
    vendor_username = serializers.CharField(source='vendor.username', read_only=True)
    credentials_display = serializers.CharField(source='get_credentials_display', read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id', 'headline', 'website', 'account_type', 'access_type',
            'account_balance', 'description', 'price', 'additional_info',
            'delivery_time', 'credentials_display', 'main_image',
            'gallery_images', 'status', 'is_featured', 'views_count',
            'favorites_count', 'rating', 'review_count', 'created_at',
            'vendor_username', 'access_method', 'account_age', 'quantity_available',
            'delivery_method', 'special_features', 'region_restrictions',
            'tags', 'documents', 'main_images', 'auto_delivery_script',
            'notes_for_buyer', 'discount_percentage', 'escrow_enabled'
        ]
        read_only_fields = [
            'id', 'status', 'is_featured', 'views_count', 'favorites_count',
            'rating', 'review_count', 'created_at', 'vendor_username'
        ]


class ProductCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new products"""
    main_image = serializers.ImageField(required=False)
    account_age = serializers.CharField(required=False, allow_blank=True)
    category = serializers.IntegerField(required=False)
    sub_category = serializers.IntegerField(required=False)  # Sub-category ID
    
    class Meta:
        model = Product
        fields = [
            'vendor', 'headline', 'website', 'account_type', 'access_type', 'access_method',
            'account_balance', 'description', 'price', 'discount_percentage',
            'additional_info', 'delivery_time', 'delivery_method', 'credentials',
            'main_image', 'gallery_images', 'main_images', 'documents', 'tags',
            'account_age', 'quantity_available', 'special_features', 
            'region_restrictions', 'auto_delivery_script', 'notes_for_buyer',
            'category', 'sub_category', 'escrow_enabled'
        ]
    
    def validate(self, data):
        """Validate product data"""
        # Client required fields validation
        required_fields = ['headline', 'website', 'account_type', 'access_type', 
                         'description', 'price', 'delivery_time', 'credentials']
        
        for field in required_fields:
            if not data.get(field):
                raise serializers.ValidationError(f"{field} is required")
        
        return data
    
    def create(self, validated_data):
        """Create product with file handling"""
        # Get vendor from context
        vendor = self.context.get('request').user if self.context.get('request') else None
        if not vendor:
            raise serializers.ValidationError("Vendor information is required")
        
        # Set vendor
        validated_data['vendor'] = vendor
        
        # Auto-set listing_title from headline
        if 'headline' in validated_data and not validated_data.get('listing_title'):
            validated_data['listing_title'] = validated_data['headline']
        
        # Set default verification_level if not provided
        if 'verification_level' not in validated_data:
            validated_data['verification_level'] = 'unverified'
        
        # Set default status to pending_approval instead of draft
        if 'status' not in validated_data:
            validated_data['status'] = 'pending_approval'
        
        # Set default category if not provided (use first available category)
        if 'category' not in validated_data or not validated_data['category']:
            try:
                from products.models import ProductCategory
                first_category = ProductCategory.objects.first()
                if first_category:
                    validated_data['category'] = first_category
                else:
                    # Create a default category if none exists
                    default_category = ProductCategory.objects.create(
                        name='General',
                        slug='general',
                        description='General category for products'
                    )
                    validated_data['category'] = default_category
            except Exception as e:
                # Set to None for now, will be handled by database constraint
                validated_data['category'] = None
        
        # Set defaults for required fields
        defaults = {
            'access_method': 'email_password',
            'discount_percentage': 0.00,
            'delivery_method': 'instant',
            'special_features': '',
            'region_restrictions': '',
            'quantity_available': 1,
            'main_images': [],
            'gallery_images': [],
            'documents': [],
            'tags': [],
            'auto_delivery_script': '',
            'notes_for_buyer': '',
            'approval_notes': '',
            'rejection_reason': '',
            'views_count': 0,
            'favorites_count': 0,
            'rating': 0.00,
            'review_count': 0,
        }
        
        for key, default_value in defaults.items():
            if key not in validated_data:
                validated_data[key] = default_value
        
        # Process main image if provided
        main_image = validated_data.pop('main_image', None)
        if main_image:
            validated_data['main_image'] = main_image
        
        # Process account_age - convert string to date if provided
        if 'account_age' in validated_data and validated_data['account_age']:
            try:
                from datetime import datetime
                # Try to parse the date string
                if isinstance(validated_data['account_age'], str):
                    # Try different date formats
                    date_formats = ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%Y-%m-%d %H:%M:%S']
                    parsed_date = None
                    for fmt in date_formats:
                        try:
                            parsed_date = datetime.strptime(validated_data['account_age'], fmt).date()
                            break
                        except ValueError:
                            continue
                    
                    if parsed_date:
                        validated_data['account_age'] = parsed_date
                    else:
                        # If can't parse, set to None
                        validated_data['account_age'] = None
            except Exception as e:
                validated_data['account_age'] = None
        else:
            validated_data['account_age'] = None
        
        # Process JSON fields - ensure they are proper lists
        json_fields = ['gallery_images', 'main_images', 'documents', 'tags', 'special_features']
        for field in json_fields:
            if field in validated_data:
                value = validated_data[field]
                if isinstance(value, str):
                    if value.strip() == '':
                        # Empty string should be empty list
                        validated_data[field] = []
                    else:
                        try:
                            # Try to parse as JSON if it's a string
                            import json
                            parsed_value = json.loads(value)
                            # Ensure it's a list
                            if isinstance(parsed_value, list):
                                validated_data[field] = parsed_value
                            else:
                                validated_data[field] = [parsed_value]
                        except json.JSONDecodeError as e:
                            # If not valid JSON, treat as single item list
                            validated_data[field] = [value] if value else []
                elif not isinstance(value, list):
                    # Convert to list if not already
                    validated_data[field] = [value] if value else []
            else:
                # Set default empty list if field not provided
                validated_data[field] = []
        
        # Create product
        product = Product.objects.create(**validated_data)
        
        return product


class ProductUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating products"""
    main_image = serializers.ImageField(required=False)
    
    class Meta:
        model = Product
        fields = [
            'headline', 'website', 'account_type', 'access_type',
            'account_balance', 'description', 'price', 'additional_info',
            'delivery_time', 'credentials', 'main_image', 'gallery_images'
        ]
    
    def validate(self, data):
        """Custom validation for product updates"""
        # Validate price
        if data.get('price', 0) <= 0:
            raise serializers.ValidationError("Price must be greater than 0")
        
        # Validate description length
        if len(data.get('description', '')) < 10:
            raise serializers.ValidationError("Description must be at least 10 characters long")
        
        return data

    def update(self, instance, validated_data):
        """Update product with file handling"""
        # Process main image if provided
        main_image = validated_data.pop('main_image', None)
        if main_image:
            validated_data['main_image'] = main_image
        
        # Update product
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance


class BulkUploadSerializer(serializers.Serializer):
    """Serializer for bulk upload validation"""
    csv_file = serializers.FileField(required=False)
    lines = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
    
    def validate(self, data):
        """Validate bulk upload data"""
        if not data.get('csv_file') and not data.get('lines'):
            raise serializers.ValidationError("Either CSV file or lines must be provided")
        return data


class CredentialsRevealSerializer(serializers.Serializer):
    """Serializer for revealing credentials after payment"""
    product_id = serializers.IntegerField()
    
    def validate_product_id(self, value):
        """Validate product exists and belongs to user"""
        try:
            product = Product.objects.get(id=value)
            if not product.credentials_visible:
                product.reveal_credentials()
            return value
        except Product.DoesNotExist:
            raise serializers.ValidationError("Product not found") 