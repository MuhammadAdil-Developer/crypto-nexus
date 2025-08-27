from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from django.conf import settings
from .models import VendorApplication

@admin.register(VendorApplication)
class VendorApplicationAdmin(admin.ModelAdmin):
    list_display = [
        'business_name', 'vendor_username', 'email', 'category', 
        'status_badge', 'created_at', 'reviewed_at', 'actions'
    ]
    list_filter = ['status', 'category', 'created_at', 'reviewed_at']
    search_fields = ['business_name', 'vendor_username', 'email', 'contact']
    readonly_fields = ['created_at', 'updated_at', 'reviewed_at', 'reviewed_by']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('business_name', 'vendor_username', 'email', 'contact')
        }),
        ('Store Information', {
            'fields': ('store_description', 'category')
        }),
        ('Payment Information', {
            'fields': ('btc_address', 'xmr_address'),
            'classes': ('collapse',)
        }),
        ('Documents & Media', {
            'fields': ('documents', 'logo'),
            'classes': ('collapse',)
        }),
        ('Application Status', {
            'fields': ('status', 'admin_notes', 'reviewed_by', 'reviewed_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def status_badge(self, obj):
        """Display status as a colored badge"""
        colors = {
            'pending': 'orange',
            'approved': 'green',
            'rejected': 'red',
            'under_review': 'blue'
        }
        
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def actions(self, obj):
        """Display action buttons for pending applications"""
        if obj.status == 'pending':
            approve_url = reverse('admin:vendor_application_approve', args=[obj.id])
            reject_url = reverse('admin:vendor_application_reject', args=[obj.id])
            
            return format_html(
                '<a href="{}" class="button" style="background-color: #28a745; color: white; padding: 4px 8px; border-radius: 4px; text-decoration: none; margin-right: 8px;">✓ Approve</a>'
                '<a href="{}" class="button" style="background-color: #dc3545; color: white; padding: 4px 8px; border-radius: 4px; text-decoration: none;">✗ Reject</a>',
                approve_url,
                reject_url
            )
        return '-'
    actions.short_description = 'Actions'
    
    def get_queryset(self, request):
        """Custom queryset with additional info"""
        return super().get_queryset(request).select_related('reviewed_by')
    
    def save_model(self, request, obj, form, change):
        """Custom save logic"""
        if change and 'status' in form.changed_data:
            obj.reviewed_by = request.user
            obj.reviewed_at = timezone.now()
        
        super().save_model(request, obj, form, change)
    
    def has_add_permission(self, request):
        """Only allow viewing and editing, not creating new applications"""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Prevent deletion of applications"""
        return False
    
    # Custom admin actions
    actions = ['approve_selected', 'reject_selected']
    
    def approve_selected(self, request, queryset):
        """Approve selected applications"""
        updated = queryset.filter(status='pending').update(
            status='approved',
            reviewed_by=request.user,
            reviewed_at=timezone.now()
        )
        self.message_user(request, f'{updated} applications were successfully approved.')
    approve_selected.short_description = "Approve selected applications"
    
    def reject_selected(self, request, queryset):
        """Reject selected applications"""
        updated = queryset.filter(status='pending').update(
            status='rejected',
            reviewed_by=request.user,
            reviewed_at=timezone.now()
        )
        self.message_user(request, f'{updated} applications were successfully rejected.')
    reject_selected.short_description = "Reject selected applications"
    
    # Custom admin views for approval/rejection
    def get_urls(self):
        from django.urls import path
        urls = super().get_urls()
        custom_urls = [
            path(
                '<int:application_id>/approve/',
                self.admin_site.admin_view(self.approve_application),
                name='vendor_application_approve',
            ),
            path(
                '<int:application_id>/reject/',
                self.admin_site.admin_view(self.reject_application),
                name='vendor_application_reject',
            ),
        ]
        return custom_urls + urls
    
    def approve_application(self, request, application_id):
        """Custom view for approving applications"""
        try:
            application = VendorApplication.objects.get(id=application_id)
            application.status = 'approved'
            application.reviewed_by = request.user
            application.reviewed_at = timezone.now()
            application.save()
            
            self.message_user(request, f'Application for {application.business_name} has been approved.')
            
        except VendorApplication.DoesNotExist:
            self.message_user(request, 'Application not found.', level='ERROR')
        
        return self.response_post_save_change(request, application)
    
    def reject_application(self, request, application_id):
        """Custom view for rejecting applications"""
        try:
            application = VendorApplication.objects.get(id=application_id)
            application.status = 'rejected'
            application.reviewed_by = request.user
            application.reviewed_at = timezone.now()
            application.save()
            
            self.message_user(request, f'Application for {application.business_name} has been rejected.')
            
        except VendorApplication.DoesNotExist:
            self.message_user(request, 'Application not found.', level='ERROR')
        
        return self.response_post_save_change(request, application) 