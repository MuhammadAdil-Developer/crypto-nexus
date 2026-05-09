import uuid
import re
from rest_framework import serializers
from .models import Product, ProductCategory, ProductSubCategory


def sanitize_input(value):
    """Sanitize user input to prevent XSS attacks"""
    if not value:
        return value
    if not isinstance(value, str):
        return value
    # Remove script tags and event handlers
    sanitized = re.sub(r'<script[^>]*>.*?</script>', '', value, flags=re.IGNORECASE | re.DOTALL)
    sanitized = re.sub(r'javascript:', '', sanitized, flags=re.IGNORECASE)
    sanitized = re.sub(r'on\w+\s*=', '', sanitized, flags=re.IGNORECASE)
    return sanitized

class ProductCategorySerializer(serializers.ModelSerializer):
    """Serializer for product categories"""
    product_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductCategory
        fields = ['id', 'name', 'slug', 'description', 'icon', 'product_count']

    def get_product_count(self, obj):
        return obj.products.filter(status='approved', is_active=True, is_deleted=False, quantity_available__gt=0).count()


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
    gallery_images = serializers.SerializerMethodField()
    documents = serializers.SerializerMethodField()
    is_currently_highlighted = serializers.SerializerMethodField()
    
    main_image = serializers.SerializerMethodField()
    
    def get_is_currently_highlighted(self, obj):
        if hasattr(obj, 'is_currently_highlighted'):
            return obj.is_currently_highlighted
        from django.utils import timezone
        return bool(obj.is_highlighted and obj.highlighted_until and obj.highlighted_until > timezone.now())
    
    def get_vendor(self, obj):
        if obj.vendor:
            return {
                'id': obj.vendor.id,
                'username': obj.vendor.username,
                'email': obj.vendor.email,
                'profile_picture': obj.vendor.profile_picture.url if obj.vendor.profile_picture else None,
                'is_on_vacation': obj.vendor.is_on_vacation,
                'is_on_vacation_active': obj.vendor.is_vacation_mode_active(),
                'vacation_mode_until': obj.vendor.vacation_mode_until,
                'vacation_mode_note': obj.vendor.vacation_mode_note,
            }
        return None
    
    def get_category(self, obj):
        if obj.category:
            return {
                'id': obj.category.id,
                'name': obj.category.name,
                'slug': obj.category.slug
            }
        return None
    
    def get_sub_category(self, obj):
        if obj.sub_category:
            return {
                'id': obj.sub_category.id,
                'name': obj.sub_category.name
            }
        return None
    
    def get_main_image(self, obj):
        """Return absolute URL for main image with fallback to main_images list"""
        url = None
        if obj.main_image:
            try:
                # Check for legacy broken paths (missing 'media/' prefix in Cloudinary setup)
                # Valid items in DB for Cloudinary storage MUST be prefixed with 'media/' 
                path_str = str(obj.main_image).lower()
                is_legacy = any(ext in path_str for ext in ['.jpg', '.png', '.jpeg', '.webp', '.gif']) and not path_str.startswith('media/')
                if is_legacy:
                     # Likely a broken legacy path that exists only in DB, force fallback
                     url = None
                else:
                    url = obj.main_image.url
            except Exception:
                url = None
        
        # Fallback to main_images list if primary field is empty or broken
        if not url and hasattr(obj, 'main_images') and obj.main_images:
            if isinstance(obj.main_images, list) and len(obj.main_images) > 0:
                first_img = str(obj.main_images[0])
                first_img_lower = first_img.lower()
                img_exts = ['.jpg', '.png', '.jpeg', '.webp', '.gif', '.bmp', '.tiff', '.svg']
                # Check if fallback is also a legacy broken path
                is_m_broken = any(ext in first_img_lower for ext in img_exts) and not first_m_lower.startswith('media/') if 'first_m_lower' in locals() else any(ext in first_img_lower for ext in img_exts) and not first_img_lower.startswith('media/')
                if first_img and not is_m_broken:
                    from django.core.files.storage import default_storage
                    try:
                        url = default_storage.url(first_img)
                    except Exception:
                        url = None
        
        if not url:
            return None

        request = self.context.get('request')
        try:
            if request and not str(url).startswith('http'):
                return request.build_absolute_uri(url)
            return url
        except Exception:
            return url

    def get_gallery_images(self, obj):
        """Return absolute URLs for gallery images"""
        if not obj.gallery_images:
            return []
        
        from django.core.files.storage import default_storage
        request = self.context.get('request')
        urls = []
        for path in obj.gallery_images:
            if not path: continue
            try:
                # Use storage.url() which handles cloud vs local automatically
                url = default_storage.url(path)
                if request and not url.startswith('http'):
                    urls.append(request.build_absolute_uri(url))
                else:
                    urls.append(url)
            except Exception:
                urls.append(path)
        return urls
    
    def get_documents(self, obj):
        """Return absolute URLs for documents"""
        if not obj.documents:
            return []
            
        from django.core.files.storage import default_storage
        request = self.context.get('request')
        urls = []
        for path in obj.documents:
            if not path: continue
            try:
                url = default_storage.url(path)
                if request and not url.startswith('http'):
                    urls.append(request.build_absolute_uri(url))
                else:
                    urls.append(url)
            except Exception:
                urls.append(path)
        return urls
    
    class Meta:
        model = Product
        fields = [
            'id', 'headline', 'listing_title', 'website', 'account_type', 'access_type', 
            'account_balance', 'description', 'price', 'additional_info',
            'delivery_time', 'credentials_display', 'credentials', 'main_image', 
            'gallery_images', 'documents', 'status', 'is_featured', 'views_count',
            'favorites_count', 'rating', 'review_count', 'is_highlighted', 'highlighted_until', 
            'highlight_fee_rate', 'is_currently_highlighted', 'created_at',
            'vendor_username', 'vendor', 'category', 'sub_category',
            'main_images', 'tags', 'special_features', 'quantity_available', 'escrow_enabled', 'rejection_reason', 'accepted_crypto', 'is_giveaway'
        ]
        read_only_fields = [
            'id', 'status', 'is_featured', 'views_count', 'favorites_count',
            'rating', 'review_count', 'is_highlighted', 'highlighted_until', 'is_currently_highlighted', 'created_at', 'vendor_username'
        ]

    def to_representation(self, instance):
        """ONLY vendors can see credentials. Admins/Others cannot."""
        rep = super().to_representation(instance)
        request = self.context.get('request')
        user = request.user if request else None
        
        # Only vendor sees their own credentials
        is_vendor = user and user.is_authenticated and instance.vendor == user
        
        if not is_vendor:
            rep.pop('credentials', None)
            
        return rep


class ProductDetailSerializer(serializers.ModelSerializer):
    """Detailed product serializer for product pages"""
    vendor_username = serializers.CharField(source='vendor.username', read_only=True)
    credentials_display = serializers.CharField(source='get_credentials_display', read_only=True)
    gallery_images = serializers.SerializerMethodField()
    documents = serializers.SerializerMethodField()
    final_price = serializers.SerializerMethodField()
    main_image = serializers.SerializerMethodField()
    vendor = serializers.SerializerMethodField()
    is_currently_highlighted = serializers.SerializerMethodField()

    def get_is_currently_highlighted(self, obj):
        if hasattr(obj, 'is_currently_highlighted'):
            return obj.is_currently_highlighted
        from django.utils import timezone
        return bool(obj.is_highlighted and obj.highlighted_until and obj.highlighted_until > timezone.now())

    def get_vendor(self, obj):
        if obj.vendor:
            return {
                'id': obj.vendor.id,
                'username': obj.vendor.username,
                'email': obj.vendor.email,
                'profile_picture': obj.vendor.profile_picture.url if obj.vendor.profile_picture else None,
                'is_on_vacation': obj.vendor.is_on_vacation,
                'is_on_vacation_active': obj.vendor.is_vacation_mode_active(),
                'vacation_mode_until': obj.vendor.vacation_mode_until,
                'vacation_mode_note': obj.vendor.vacation_mode_note,
            }
        return None

    def get_final_price(self, obj):
        """Calculate final price after discount"""
        if obj.discount_percentage:
            discount = obj.price * (obj.discount_percentage / 100)
            return obj.price - discount
        return obj.price
    
    def get_main_image(self, obj):
        """Return absolute URL for main image with fallback to main_images list"""
        url = None
        if obj.main_image:
            try:
                # Check for legacy broken paths (missing 'media/' prefix)
                path_str = str(obj.main_image).lower()
                img_exts = ['.jpg', '.png', '.jpeg', '.webp', '.gif', '.bmp', '.tiff', '.svg']
                if any(ext in path_str for ext in img_exts) and not path_str.startswith('media/'):
                     # Likely a broken legacy path, force fallback
                     url = None
                else:
                    url = obj.main_image.url
            except Exception:
                url = None
        
        # Fallback to main_images list if primary field is empty or broken
        if not url and hasattr(obj, 'main_images') and obj.main_images:
            if isinstance(obj.main_images, list) and len(obj.main_images) > 0:
                first_img = str(obj.main_images[0])
                first_img_lower = first_img.lower()
                img_exts = ['.jpg', '.png', '.jpeg', '.webp', '.gif', '.bmp', '.tiff', '.svg']
                is_m_broken = any(ext in first_img_lower for ext in img_exts) and not first_img_lower.startswith('media/')
                if first_img and not is_m_broken:
                    from django.core.files.storage import default_storage
                    try:
                        url = default_storage.url(first_img)
                    except Exception:
                        url = None
        
        if not url:
            return None

        request = self.context.get('request')
        try:
            if request and not str(url).startswith('http'):
                return request.build_absolute_uri(url)
            return url
        except Exception:
            return url
    
    def get_gallery_images(self, obj):
        """Return absolute URLs for gallery images"""
        if not obj.gallery_images:
            return []
        
        from django.core.files.storage import default_storage
        request = self.context.get('request')
        urls = []
        for path in obj.gallery_images:
            if not path: continue
            try:
                url = default_storage.url(path)
                if request and not url.startswith('http'):
                    urls.append(request.build_absolute_uri(url))
                else:
                    urls.append(url)
            except Exception:
                urls.append(path)
        return urls
    
    def get_documents(self, obj):
        """Return absolute URLs for documents"""
        if not obj.documents:
            return []
            
        from django.core.files.storage import default_storage
        request = self.context.get('request')
        urls = []
        for path in obj.documents:
            if not path: continue
            try:
                url = default_storage.url(path)
                if request and not url.startswith('http'):
                    urls.append(request.build_absolute_uri(url))
                else:
                    urls.append(url)
            except Exception:
                urls.append(path)
        return urls
    
    class Meta:
        model = Product
        fields = [
            'id', 'headline', 'website', 'account_type', 'access_type',
            'account_balance', 'description', 'price', 'additional_info',
            'delivery_time', 'credentials_display', 'main_image',
            'gallery_images', 'status', 'is_featured', 'views_count',
            'favorites_count', 'rating', 'review_count', 'is_highlighted', 'highlighted_until', 
            'highlight_fee_rate', 'is_currently_highlighted', 'created_at',
            'vendor_username', 'access_method', 'account_age', 'quantity_available',
            'delivery_method', 'special_features', 'region_restrictions',
            'tags', 'documents', 'main_images', 'auto_delivery_script',
            'notes_for_buyer', 'discount_percentage', 'escrow_enabled', 'accepted_crypto',
            'final_price', 'credentials', 'is_giveaway', 'vendor'
        ]
        read_only_fields = [
            'id', 'status', 'is_featured', 'views_count', 'favorites_count',
            'rating', 'review_count', 'is_highlighted', 'highlighted_until', 'is_currently_highlighted', 'created_at', 'vendor_username'
        ]
        
    def to_representation(self, instance):
        """Custom logic to hide credentials for non-owners/non-buyers"""
        # Logic to expose credentials if user is the vendor
        rep = super().to_representation(instance)
        request = self.context.get('request')
        user = request.user if request else None
        
        # Only show credentials if user is the vendor or if credentials_visible is True (handled by model/other logic)
        # The model field 'credentials_visible' is boolean toggle for public/buyer visibility after purchase
        # But we want the vendor to always see it in the API response when editing/viewing details
        if user and user.is_authenticated and instance.vendor == user:
            pass # Keep credentials
        elif not instance.credentials_visible: 
             # Hide credentials for everyone else unless visible flag is strictly True
             rep.pop('credentials', None)
             
        return rep


class ProductCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new products"""
    vendor = serializers.UUIDField(required=False)  # Make vendor optional for bulk uploads - UUID field
    main_image = serializers.ImageField(required=False)
    # Note: gallery_images and documents are handled manually in create() method
    # They are excluded from Meta fields to avoid validation issues with multiple file uploads
    account_age = serializers.CharField(required=False, allow_blank=True)
    category = serializers.PrimaryKeyRelatedField(queryset=ProductCategory.objects.all(), required=False, allow_null=True)
    sub_category = serializers.PrimaryKeyRelatedField(queryset=ProductSubCategory.objects.all(), required=False, allow_null=True)
    
    class Meta:
        model = Product
        fields = [
            'vendor', 'headline', 'website', 'account_type', 'access_type', 'access_method',
            'account_balance', 'description', 'price', 'discount_percentage',
            'additional_info', 'delivery_time', 'delivery_method', 'credentials',
            'main_image', 'main_images', 'tags',
            'account_age', 'quantity_available', 'special_features', 
            'region_restrictions', 'auto_delivery_script', 'notes_for_buyer',
            'category', 'sub_category', 'escrow_enabled', 'accepted_crypto', 'is_giveaway'
        ]
    
    def validate(self, data):
        """Validate and sanitize product data"""
        # Sanitize text fields that could contain XSS
        text_fields = ['headline', 'description', 'additional_info', 'special_features',
                       'region_restrictions', 'auto_delivery_script', 'notes_for_buyer',
                       'account_age', 'access_method']
        for field in text_fields:
            if field in data and data[field]:
                data[field] = sanitize_input(data[field])

        request = self.context.get('request')
        requester = request.user if request else None

        # Identify the vendor - if admin is creating for someone else, use that vendor
        vendor = None
        vendor_id = data.get('vendor')
        
        from users.models import User
        if vendor_id:
            try:
                if isinstance(vendor_id, User):
                    vendor = vendor_id
                else:
                    vendor = User.objects.get(id=vendor_id)
            except (User.DoesNotExist, ValueError, TypeError):
                vendor = requester
        else:
            vendor = requester
        
        # Check if vendor has payout addresses configured for the coins being accepted
        if vendor and not self.instance:  # Only for new listings
            is_vendor = getattr(vendor, 'user_type', None) == 'vendor'
            if is_vendor:
                # Determine what coins are accepted
                import json
                accepted_crypto = data.get('accepted_crypto', [])
                if isinstance(accepted_crypto, str) and accepted_crypto:
                    try:
                        accepted_crypto = json.loads(accepted_crypto)
                    except json.JSONDecodeError:
                        accepted_crypto = [accepted_crypto]
                
                if not isinstance(accepted_crypto, list):
                    accepted_crypto = [accepted_crypto]
                
                accepted_crypto = [str(c).upper() for c in accepted_crypto]
                
                missing = []
                if 'BTC' in accepted_crypto and not vendor.btc_payout_address:
                    missing.append("Bitcoin (BTC)")
                if 'XMR' in accepted_crypto and not vendor.xmr_payout_address:
                    missing.append("Monero (XMR)")
                
                if missing:
                    raise serializers.ValidationError({
                        "payout_address": f"You are accepting {', '.join(missing)} for this listing, but you haven't configured the payout address in your settings."
                    })

        # Client required fields validation - only for creation, not updates
        if not self.instance:  # Creating new product
            required_fields = ['headline', 'website', 'account_type', 'access_type', 
                             'description', 'price', 'delivery_time']
            
            errors = {}
            for field in required_fields:
                if field not in data or data[field] is None:
                    errors[field] = f"{field} is required"
                elif isinstance(data[field], str) and not data[field].strip():
                    errors[field] = f"{field} cannot be empty"
            
            if errors:
                raise serializers.ValidationError(errors)

        # Tag Validation - Maximum 3 tags
        tags = data.get('tags', [])
        if tags:
            # If tags is a string (e.g. from form-data), try to parse it
            if isinstance(tags, str):
                try:
                    import json
                    tags = json.loads(tags)
                except (json.JSONDecodeError, ValueError):
                    # Fallback to comma separation
                    tags = [t.strip() for t in tags.split(',') if t.strip()]
            
            if not isinstance(tags, list):
                tags = [tags]
            
            # Clean and filter tags
            clean_tags = [str(t).strip() for t in tags if str(t).strip()][:3]  # Enforce MAX 3 logic
            
            if len(tags) > 3:
                # Optionally warn or strictly error, user asked for restriction
                # We will truncate to 3 as requested, but we can also raise validation error
                data['tags'] = clean_tags
            else:
                data['tags'] = clean_tags

        return data
    
    def create(self, validated_data):
        """Create product with file handling"""
        # Always ensure 'vendor' is a User instance
        request = self.context.get('request') if self.context else None
        vendor_from_context = getattr(request, 'user', None) if request else None

        if 'vendor' in validated_data and validated_data['vendor']:
            # Convert UUID to actual User instance if needed
            from users.models import User
            vendor_value = validated_data['vendor']
            if not isinstance(vendor_value, User):
                try:
                    validated_data['vendor'] = User.objects.get(id=vendor_value)
                except User.DoesNotExist:
                    raise serializers.ValidationError("Vendor not found")
        elif vendor_from_context:
            validated_data['vendor'] = vendor_from_context
        else:
            raise serializers.ValidationError("Vendor information is required")
        
        # Ensure category and sub_category are instances if they are UUIDs
        if 'category' in validated_data and validated_data['category']:
            from .models import ProductCategory
            if isinstance(validated_data['category'], (uuid.UUID, str)) and not isinstance(validated_data['category'], ProductCategory):
                try:
                    category_id = validated_data['category']
                    if isinstance(category_id, str):
                        category_id = uuid.UUID(category_id)
                    validated_data['category'] = ProductCategory.objects.get(id=category_id)
                except (ProductCategory.DoesNotExist, ValueError):
                    pass

        if 'sub_category' in validated_data and validated_data['sub_category']:
            from .models import ProductSubCategory
            if isinstance(validated_data['sub_category'], (uuid.UUID, str)) and not isinstance(validated_data['sub_category'], ProductSubCategory):
                try:
                    sub_id = validated_data['sub_category']
                    if isinstance(sub_id, str):
                        sub_id = uuid.UUID(sub_id)
                    validated_data['sub_category'] = ProductSubCategory.objects.get(id=sub_id)
                except (ProductSubCategory.DoesNotExist, ValueError):
                    pass

        # Auto-set listing_title from headline
        if 'headline' in validated_data and not validated_data.get('listing_title'):
            validated_data['listing_title'] = validated_data['headline']
        
        # Set default verification_level if not provided
        if 'verification_level' not in validated_data:
            validated_data['verification_level'] = 'unverified'
        
        # Set default status to approved instead of draft
        if 'status' not in validated_data:
            validated_data['status'] = 'approved'
        
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
        
        # Process gallery images and documents - handle file uploads from request.FILES if not in validated_data
        gallery_images = []
        documents = []
        
        # Check request.FILES if available (multipart/form-data)
        request = self.context.get('request') if self.context else None
        if request and hasattr(request, 'FILES'):
            gallery_images = request.FILES.getlist('gallery_images', [])
            documents = request.FILES.getlist('documents', [])
        
        # Also check validated_data as fallback
        if 'gallery_images' in validated_data:
            validated_gallery = validated_data.pop('gallery_images', [])
            if not gallery_images:
                gallery_images = validated_gallery
        
        if 'documents' in validated_data:
            validated_docs = validated_data.pop('documents', [])
            if not documents:
                documents = validated_docs
        
        gallery_image_paths = []
        document_paths = []
        
        # Process gallery images
        if gallery_images and len(gallery_images) > 0:
            for image in gallery_images:
                if hasattr(image, 'name'):  # It's a file upload
                    from django.core.files.storage import default_storage
                    path = default_storage.save(f'products/gallery/{image.name}', image)
                    gallery_image_paths.append(path)
                elif isinstance(image, str) and image.strip():  # It's already a path
                    gallery_image_paths.append(image)
        
        # Process documents
        if documents and len(documents) > 0:
            for doc in documents:
                if hasattr(doc, 'name'):  # It's a file upload
                    from django.core.files.storage import default_storage
                    path = default_storage.save(f'products/documents/{doc.name}', doc)
                    document_paths.append(path)
                elif isinstance(doc, str) and doc.strip():  # It's already a path
                    document_paths.append(doc)
        
        # Set the processed file paths (always set, even if empty lists)
        validated_data['gallery_images'] = gallery_image_paths
        validated_data['documents'] = document_paths
        
        # Process JSON fields - ensure they are proper lists
        json_fields = ['main_images', 'tags', 'special_features', 'accepted_crypto']
        for field in json_fields:
            if field in validated_data:
                value = validated_data[field]
                if isinstance(value, str):
                    if value.strip() == '':  # Empty string should be empty list
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
    category = serializers.PrimaryKeyRelatedField(queryset=ProductCategory.objects.all(), required=False, allow_null=True)
    sub_category = serializers.PrimaryKeyRelatedField(queryset=ProductSubCategory.objects.all(), required=False, allow_null=True)
    
    class Meta:
        model = Product
        fields = [
            'headline', 'website', 'account_type', 'access_type', 'access_method',
            'account_balance', 'description', 'price', 'discount_percentage',
            'additional_info', 'delivery_time', 'delivery_method', 'credentials',
            'main_image', 'main_images', 'tags', 'status',
            'account_age', 'quantity_available', 'special_features', 
            'region_restrictions', 'auto_delivery_script', 'notes_for_buyer',
            'escrow_enabled', 'accepted_crypto', 'is_giveaway', 'category', 'sub_category'
        ]
    
    def validate(self, data):
        """Custom validation for product updates"""
        # Sanitize text fields that could contain XSS
        text_fields = ['headline', 'description', 'additional_info', 'special_features',
                       'region_restrictions', 'auto_delivery_script', 'notes_for_buyer',
                       'account_age', 'access_method']
        for field in text_fields:
            if field in data and data[field]:
                data[field] = sanitize_input(data[field])

        # Tag Validation - Maximum 3 tags
        tags = data.get('tags', [])
        if tags:
            if isinstance(tags, str):
                try:
                    import json
                    tags = json.loads(tags)
                except:
                    tags = [t.strip() for t in tags.split(',') if t.strip()]
            
            if isinstance(tags, list):
                data['tags'] = [str(t).strip() for t in tags if str(t).strip()][:3]
        
        # Accepted Crypto validation
        accepted_crypto = data.get('accepted_crypto')
        if accepted_crypto:
            if isinstance(accepted_crypto, str):
                try:
                    import json
                    data['accepted_crypto'] = json.loads(accepted_crypto)
                except:
                    pass

        return data

    def update(self, instance, validated_data):
        """Update product with file handling"""
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
