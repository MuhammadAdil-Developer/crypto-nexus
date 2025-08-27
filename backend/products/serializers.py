from rest_framework import serializers
from .models import Product, ProductCategory, ProductSubCategory, ProductImage, ProductDocument, ProductTag
from users.serializers import UserSerializer


class ProductCategorySerializer(serializers.ModelSerializer):
    """Serializer for product categories"""
    
    class Meta:
        model = ProductCategory
        fields = ['id', 'name', 'slug', 'description', 'icon', 'parent', 'is_active', 'created_at']
        read_only_fields = ['id', 'slug', 'created_at']


class ProductSubCategorySerializer(serializers.ModelSerializer):
    """Serializer for product sub-categories"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = ProductSubCategory
        fields = ['id', 'name', 'slug', 'category', 'category_name', 'is_active', 'created_at']
        read_only_fields = ['id', 'slug', 'created_at']


class ProductImageSerializer(serializers.ModelSerializer):
    """Serializer for product images"""
    
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'alt_text', 'is_primary', 'order', 'created_at']
        read_only_fields = ['id', 'created_at']


class ProductDocumentSerializer(serializers.ModelSerializer):
    """Serializer for product documents"""
    
    class Meta:
        model = ProductDocument
        fields = ['id', 'document', 'title', 'description', 'file_type', 'file_size', 'created_at']
        read_only_fields = ['id', 'file_size', 'created_at']


class ProductTagSerializer(serializers.ModelSerializer):
    """Serializer for product tags"""
    
    class Meta:
        model = ProductTag
        fields = ['id', 'name', 'slug', 'usage_count', 'is_active']
        read_only_fields = ['id', 'slug', 'usage_count']


class ProductListSerializer(serializers.ModelSerializer):
    """Serializer for product listing (basic info)"""
    vendor_name = serializers.CharField(source='vendor.username', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    sub_category_name = serializers.CharField(source='sub_category.name', read_only=True)
    final_price = serializers.SerializerMethodField()
    main_image = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'listing_title', 'vendor_name', 'category_name', 'sub_category_name',
            'price', 'final_price', 'discount_percentage', 'quantity_available',
            'rating', 'review_count', 'views_count', 'favorites_count',
            'status', 'is_featured', 'main_image', 'created_at'
        ]
        read_only_fields = ['id', 'rating', 'review_count', 'views_count', 'favorites_count', 'created_at']
    
    def get_final_price(self, obj):
        return obj.get_final_price()
    
    def get_main_image(self, obj):
        if obj.main_images:
            return obj.main_images[0] if len(obj.main_images) > 0 else None
        return None


class ProductDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed product view"""
    vendor = UserSerializer(read_only=True)
    category = ProductCategorySerializer(read_only=True)
    sub_category = ProductSubCategorySerializer(read_only=True)
    final_price = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ['id', 'views_count', 'favorites_count', 'rating', 'review_count', 'created_at', 'updated_at']
    
    def get_final_price(self, obj):
        return obj.get_final_price()


class ProductCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new products"""
    main_images = serializers.ListField(
        child=serializers.FileField(),
        required=False,
        write_only=True
    )
    gallery_images = serializers.ListField(
        child=serializers.FileField(),
        required=False,
        write_only=True
    )
    documents = serializers.ListField(
        child=serializers.FileField(),
        required=False,
        write_only=True
    )
    
    class Meta:
        model = Product
        fields = [
            'listing_title', 'category', 'sub_category', 'description',
            'account_type', 'verification_level', 'account_age', 'access_method',
            'special_features', 'region_restrictions', 'price', 'discount_percentage',
            'quantity_available', 'delivery_method', 'main_images', 'gallery_images',
            'documents', 'tags', 'auto_delivery_script', 'notes_for_buyer'
        ]
    
    def validate(self, data):
        """Custom validation for product creation"""
        # Validate price
        if data.get('price', 0) <= 0:
            raise serializers.ValidationError("Price must be greater than 0")
        
        # Validate discount percentage
        discount = data.get('discount_percentage', 0)
        if discount < 0 or discount > 100:
            raise serializers.ValidationError("Discount percentage must be between 0 and 100")
        
        # Validate quantity
        if data.get('quantity_available', 0) <= 0:
            raise serializers.ValidationError("Quantity available must be greater than 0")
        
        # Validate description length
        if len(data.get('description', '')) > 150:
            raise serializers.ValidationError("Description must not exceed 150 characters")
        
        # Validate special features
        special_features = data.get('special_features', [])
        if not isinstance(special_features, list):
            raise serializers.ValidationError("Special features must be a list")
        
        # Validate tags
        tags = data.get('tags', [])
        if not isinstance(tags, list):
            raise serializers.ValidationError("Tags must be a list")
        
        return data
    
    def create(self, validated_data):
        """Create product with file handling"""
        # Extract file fields
        main_images = validated_data.pop('main_images', [])
        gallery_images = validated_data.pop('gallery_images', [])
        documents = validated_data.pop('documents', [])
        
        # Set vendor from request user
        validated_data['vendor'] = self.context['request'].user
        
        # Process main images - store file URLs
        main_image_urls = []
        for i, image in enumerate(main_images):
            # Save image to media folder and get URL
            image_path = f'products/images/{image.name}'
            with open(f'media/{image_path}', 'wb+') as destination:
                for chunk in image.chunks():
                    destination.write(chunk)
            main_image_urls.append(f'http://localhost:8000/media/{image_path}')
        
        # Process gallery images - store file URLs
        gallery_image_urls = []
        for i, image in enumerate(gallery_images):
            # Save image to media folder and get URL
            image_path = f'products/images/{image.name}'
            with open(f'media/{image_path}', 'wb+') as destination:
                for chunk in image.chunks():
                    destination.write(chunk)
            gallery_image_urls.append(f'http://localhost:8000/media/{image_path}')
        
        # Process documents - store file URLs
        document_urls = []
        for doc in documents:
            # Save document to media folder and get URL
            doc_path = f'products/documents/{doc.name}'
            with open(f'media/{doc_path}', 'wb+') as destination:
                for chunk in doc.chunks():
                    destination.write(chunk)
            document_urls.append({
                'url': f'http://localhost:8000/media/{doc_path}',
                'name': doc.name,
                'size': doc.size,
                'type': doc.content_type
            })
        
        # Set the processed file data
        validated_data['main_images'] = main_image_urls
        validated_data['gallery_images'] = gallery_image_urls
        validated_data['documents'] = document_urls
        
        # Create product
        product = Product.objects.create(**validated_data)
        
        return product


class ProductUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating products"""
    
    class Meta:
        model = Product
        fields = [
            'listing_title', 'category', 'sub_category', 'description',
            'account_type', 'verification_level', 'account_age', 'access_method',
            'special_features', 'region_restrictions', 'price', 'discount_percentage',
            'quantity_available', 'delivery_method', 'tags', 'auto_delivery_script',
            'notes_for_buyer'
        ]
    
    def validate(self, data):
        """Custom validation for product updates"""
        # Validate price
        if 'price' in data and data['price'] <= 0:
            raise serializers.ValidationError("Price must be greater than 0")
        
        # Validate discount percentage
        if 'discount_percentage' in data:
            discount = data['discount_percentage']
            if discount < 0 or discount > 100:
                raise serializers.ValidationError("Discount percentage must be between 0 and 100")
        
        # Validate quantity
        if 'quantity_available' in data and data['quantity_available'] <= 0:
            raise serializers.ValidationError("Quantity available must be greater than 0")
        
        # Validate description length
        if 'description' in data and len(data['description']) > 150:
            raise serializers.ValidationError("Description must not exceed 150 characters")
        
        return data


class ProductSearchSerializer(serializers.Serializer):
    """Serializer for product search"""
    query = serializers.CharField(required=False, allow_blank=True)
    category = serializers.CharField(required=False, allow_blank=True)
    sub_category = serializers.CharField(required=False, allow_blank=True)
    min_price = serializers.DecimalField(required=False, max_digits=20, decimal_places=8)
    max_price = serializers.DecimalField(required=False, max_digits=20, decimal_places=8)
    account_type = serializers.CharField(required=False, allow_blank=True)
    verification_level = serializers.CharField(required=False, allow_blank=True)
    tags = serializers.ListField(child=serializers.CharField(), required=False)
    sort_by = serializers.ChoiceField(
        choices=[
            ('price_low', 'Price: Low to High'),
            ('price_high', 'Price: High to Low'),
            ('newest', 'Newest First'),
            ('rating', 'Highest Rated'),
            ('popular', 'Most Popular')
        ],
        required=False,
        default='newest'
    )
    page = serializers.IntegerField(required=False, default=1, min_value=1)
    page_size = serializers.IntegerField(required=False, default=20, min_value=1, max_value=100) 