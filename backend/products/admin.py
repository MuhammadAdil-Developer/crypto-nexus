from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from django.utils import timezone
from .models import Product, ProductCategory, ProductSubCategory, ProductImage, ProductDocument, ProductTag


@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'parent', 'is_active', 'created_at']
    list_filter = ['is_active', 'parent', 'created_at']
    search_fields = ['name', 'description']
    prepopulated_fields = {'slug': ('name',)}
    ordering = ['name']


@admin.register(ProductSubCategory)
class ProductSubCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'slug', 'is_active', 'created_at']
    list_filter = ['is_active', 'category', 'created_at']
    search_fields = ['name', 'category__name']
    prepopulated_fields = {'slug': ('name',)}
    ordering = ['category__name', 'name']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = [
        'listing_title', 'vendor', 'category', 'price', 'status', 
        'is_featured', 'quantity_available', 'views_count', 'created_at'
    ]
    list_filter = [
        'status', 'is_featured', 'category', 'account_type',
        'verification_level', 'delivery_method', 'created_at'
    ]
    search_fields = ['listing_title', 'vendor__username', 'description', 'tags']
    readonly_fields = [
        'id', 'created_at', 'updated_at', 'views_count', 'favorites_count',
        'rating', 'review_count', 'approved_by', 'approved_at'
    ]
    list_per_page = 25
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('listing_title', 'vendor', 'category', 'sub_category', 'description')
        }),
        ('Account Details', {
            'fields': ('account_type', 'verification_level', 'account_age', 'access_method', 'special_features', 'region_restrictions')
        }),
        ('Pricing & Availability', {
            'fields': ('price', 'discount_percentage', 'quantity_available', 'delivery_method')
        }),
        ('Media & Content', {
            'fields': ('main_images', 'gallery_images', 'documents', 'tags')
        }),
        ('Additional Info', {
            'fields': ('auto_delivery_script', 'notes_for_buyer')
        }),
        ('Status & Approval', {
            'fields': ('status', 'is_featured', 'is_active', 'approval_notes', 'approved_by', 'approved_at')
        }),
        ('Analytics', {
            'fields': ('views_count', 'favorites_count', 'rating', 'review_count')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('vendor', 'category', 'sub_category')
    
    def approve_product(self, request, queryset):
        """Admin action to approve products"""
        updated = queryset.update(
            status='approved',
            approved_by=request.user,
            approved_at=timezone.now()
        )
        self.message_user(request, f'{updated} products approved successfully.')
    
    def reject_product(self, request, queryset):
        """Admin action to reject products"""
        updated = queryset.update(status='rejected')
        self.message_user(request, f'{updated} products rejected.')
    
    def feature_product(self, request, queryset):
        """Admin action to feature products"""
        updated = queryset.update(is_featured=True)
        self.message_user(request, f'{updated} products featured successfully.')
    
    def unfeature_product(self, request, queryset):
        """Admin action to unfeature products"""
        updated = queryset.update(is_featured=False)
        self.message_user(request, f'{updated} products unfeatured successfully.')
    
    actions = [approve_product, reject_product, feature_product, unfeature_product]


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ['product', 'image_preview', 'is_primary', 'order', 'created_at']
    list_filter = ['is_primary', 'created_at']
    search_fields = ['product__listing_title']
    ordering = ['product', 'order']
    
    def image_preview(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="max-height: 50px; max-width: 50px;" />',
                obj.image.url
            )
        return "No Image"
    image_preview.short_description = 'Preview'


@admin.register(ProductDocument)
class ProductDocumentAdmin(admin.ModelAdmin):
    list_display = ['product', 'title', 'file_type', 'file_size_mb', 'created_at']
    list_filter = ['file_type', 'created_at']
    search_fields = ['title', 'product__listing_title']
    ordering = ['-created_at']
    
    def file_size_mb(self, obj):
        return f"{obj.file_size / (1024 * 1024):.2f} MB"
    file_size_mb.short_description = 'File Size'


@admin.register(ProductTag)
class ProductTagAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'usage_count', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name']
    prepopulated_fields = {'slug': ('name',)}
    ordering = ['-usage_count', 'name'] 