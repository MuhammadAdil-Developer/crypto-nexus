from django.urls import path
from . import views

urlpatterns = [
    path('notifications/', views.list_notifications, name='notifications-list'),
    path('notifications/recent/', views.recent_notifications, name='notifications-recent'),
    path('notifications/unread-count/', views.unread_count, name='notifications-unread-count'),
    path('notifications/mark-all-read/', views.mark_all_read, name='notifications-mark-all-read'),
    path('notifications/<uuid:notification_id>/mark-read/', views.mark_notification_read, name='notifications-mark-read'),
]