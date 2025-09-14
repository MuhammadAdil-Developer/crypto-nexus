from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from django.utils import timezone
from .models import Product, ProductCategory, ProductSubCategory


@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'is_active', 'sort_order']
    list_filter = ['is_active']
    search_fields = ['name', 'description']
    prepopulated_fields = {'slug': ('name',)}
    ordering = ['sort_order', 'name']


@admin.register(ProductSubCategory)
class ProductSubCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'slug', 'is_active', 'sort_order']
    list_filter = ['is_active', 'category']
    search_fields = ['name', 'description']
    prepopulated_fields = {'slug': ('name',)}
    ordering = ['sort_order', 'name']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = [
        'headline', 'vendor', 'website', 'account_type', 'access_type', 
        'price', 'status', 'is_featured', 'views_count', 'created_at'
    ]
    list_filter = [
        'status', 'is_featured', 'account_type', 'access_type',
        'delivery_time', 'created_at'
    ]
    search_fields = ['headline', 'vendor__username', 'description', 'website']
    readonly_fields = [
        'id', 'created_at', 'updated_at', 'views_count', 'favorites_count',
        'rating', 'review_count', 'approved_by', 'approved_at'
    ]
    list_per_page = 25
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('headline', 'vendor', 'website', 'description')
        }),
        ('Account Details', {
            'fields': ('account_type', 'access_type', 'account_balance', 'additional_info')
        }),
        ('Pricing & Delivery', {
            'fields': ('price', 'delivery_time')
        }),
        ('Media & Content', {
            'fields': ('main_image', 'gallery_images')
        }),
        ('Credentials', {
            'fields': ('credentials', 'credentials_visible'),
            'classes': ('collapse',)
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
        return super().get_queryset(request).select_related('vendor')
    
    def approve_product(self, request, queryset):
        """Approve selected products"""
        updated = queryset.update(status='approved')
        self.message_user(request, f'{updated} products were successfully approved.')
    approve_product.short_description = "Approve selected products"
    
    def reject_product(self, request, queryset):
        """Reject selected products"""
        updated = queryset.update(status='rejected')
        self.message_user(request, f'{updated} products were successfully rejected.')
    reject_product.short_description = "Reject selected products"
    
    actions = [approve_product, reject_product] 