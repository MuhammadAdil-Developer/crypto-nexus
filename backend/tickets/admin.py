from django.contrib import admin
from .models import Ticket, TicketMessage, TicketTemplate


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = [
        'ticket_id', 'subject', 'user', 'category', 'priority', 
        'status', 'assigned_to', 'created_at', 'response_count'
    ]
    list_filter = ['status', 'priority', 'category', 'user_type', 'assigned_to', 'created_at']
    search_fields = ['ticket_id', 'subject', 'user__username', 'user__email']
    readonly_fields = ['ticket_id', 'created_at', 'updated_at', 'response_count']
    raw_id_fields = ['user', 'assigned_to']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('ticket_id', 'user', 'user_type', 'subject', 'description')
        }),
        ('Classification', {
            'fields': ('category', 'priority', 'status')
        }),
        ('Assignment', {
            'fields': ('assigned_to',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'last_response_at', 'resolved_at', 'closed_at'),
            'classes': ('collapse',)
        }),
        ('Statistics', {
            'fields': ('response_count', 'is_urgent'),
            'classes': ('collapse',)
        }),
    )


@admin.register(TicketMessage)
class TicketMessageAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'ticket', 'sender', 'sender_type', 'created_at', 'is_internal'
    ]
    list_filter = ['sender_type', 'is_internal', 'created_at']
    search_fields = ['ticket__ticket_id', 'sender__username', 'message']
    readonly_fields = ['id', 'created_at', 'updated_at']
    raw_id_fields = ['ticket', 'sender']


@admin.register(TicketTemplate)
class TicketTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'subject', 'is_active', 'created_at']
    list_filter = ['category', 'is_active', 'created_at']
    search_fields = ['name', 'subject', 'content']
    readonly_fields = ['created_at', 'updated_at']
