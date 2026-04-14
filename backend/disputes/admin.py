from django.contrib import admin
from .models import Dispute, DisputeMessage, DisputeTimeline


@admin.register(Dispute)
class DisputeAdmin(admin.ModelAdmin):
    list_display = ['dispute_id', 'title', 'buyer', 'vendor', 'status', 'priority', 'category', 'created_at', 'assigned_admin']
    list_filter = ['status', 'priority', 'category', 'created_at', 'assigned_admin']
    search_fields = ['dispute_id', 'title', 'buyer__username', 'vendor__username']
    readonly_fields = ['dispute_id', 'created_at', 'updated_at']
    fieldsets = (
        ('Basic Information', {
            'fields': ('dispute_id', 'order', 'product', 'buyer', 'vendor', 'title', 'description')
        }),
        ('Dispute Details', {
            'fields': ('category', 'priority', 'status', 'evidence_files')
        }),
        ('Resolution', {
            'fields': ('resolution', 'resolution_notes', 'refund_amount', 'assigned_admin', 'resolved_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(DisputeMessage)
class DisputeMessageAdmin(admin.ModelAdmin):
    list_display = ['dispute', 'sender', 'created_at', 'is_internal']
    list_filter = ['is_internal', 'created_at']
    search_fields = ['dispute__dispute_id', 'sender__username', 'message']
    readonly_fields = ['created_at']


@admin.register(DisputeTimeline)
class DisputeTimelineAdmin(admin.ModelAdmin):
    list_display = ['dispute', 'action', 'user', 'created_at']
    list_filter = ['action', 'created_at']
    search_fields = ['dispute__dispute_id', 'action', 'user__username']
    readonly_fields = ['created_at']

