from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'user_type', 'is_verified', 'two_factor_enabled', 'is_active', 'date_joined')
    list_filter = ('user_type', 'is_verified', 'two_factor_enabled', 'is_active', 'date_joined')
    search_fields = ('username',)
    ordering = ('-date_joined',)
    
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Account Settings', {'fields': ('user_type', 'is_verified', 'two_factor_enabled', 'is_active')}),
        ('Permissions', {'fields': ('is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'password1', 'password2', 'user_type'),
        }),
    ) 
    
    readonly_fields = ('date_joined', 'last_login') 