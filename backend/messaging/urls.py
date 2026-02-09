from django.urls import path
from .views import (
    ConversationListCreateView,
    ConversationDetailView,
    MessageListCreateView,
    create_product_conversation,
    get_conversation_by_product,
    mark_messages_read,
    lock_conversation,
    report_message,
    edit_message,
    delete_message,
    get_recent_messages,
    get_unread_count,
    get_recent_activity,
    get_all_conversations_admin,
    block_user,
    unblock_user,
    get_blocked_users,
    report_user,
    get_user_attachments,
    get_user_reports,
    update_report_status
)
from .moderation import (
    blocked_keywords_list_create,
    delete_blocked_keyword,
    moderation_settings_list_update,
    get_flagged_messages,
    resolve_flagged_message
)

urlpatterns = [
    # Content Moderation
    path('moderation/keywords/', blocked_keywords_list_create, name='blocked-keywords-list-create'),
    path('moderation/keywords/<uuid:keyword_id>/', delete_blocked_keyword, name='delete-blocked-keyword'),
    path('moderation/settings/', moderation_settings_list_update, name='moderation-settings'),
    path('moderation/flagged/', get_flagged_messages, name='get-flagged-messages'),
    path('moderation/flagged/<uuid:message_id>/resolve/', resolve_flagged_message, name='resolve-flagged-message'),

    # Conversations
    path('conversations/', ConversationListCreateView.as_view(), name='conversation-list-create'),
    path('conversations/admin/', get_all_conversations_admin, name='conversation-list-admin'),
    path('conversations/<uuid:pk>/', ConversationDetailView.as_view(), name='conversation-detail'),
    path('conversations/<uuid:conversation_id>/messages/', MessageListCreateView.as_view(), name='message-list-create'),
    
    # Product-specific conversations
    path('conversations/product/<int:product_id>/', get_conversation_by_product, name='conversation-by-product'),
    path('conversations/create-product/', create_product_conversation, name='create-product-conversation'),
    
    # Message actions
    path('conversations/<uuid:conversation_id>/mark-read/', mark_messages_read, name='mark-messages-read'),
    path('conversations/<uuid:conversation_id>/lock/', lock_conversation, name='conversation-lock'),
    path('messages/<uuid:message_id>/report/', report_message, name='report-message'),
    path('messages/<uuid:message_id>/edit/', edit_message, name='edit-message'),
    path('messages/<uuid:message_id>/delete/', delete_message, name='delete-message'),
    
    # Home page notifications
    path('recent-messages/', get_recent_messages, name='recent-messages'),
    path('unread-count/', get_unread_count, name='unread-count'),
    path('recent-activity/', get_recent_activity, name='recent-activity'),
    
    # User blocking and reporting
    path('users/<uuid:user_id>/block/', block_user, name='block-user'),
    path('users/<uuid:user_id>/unblock/', unblock_user, name='unblock-user'),
    path('users/blocked/', get_blocked_users, name='blocked-users'),
    path('users/report/', report_user, name='report-user'),
    path('users/reports/', get_user_reports, name='get-user-reports'),
    path('users/reports/<uuid:report_id>/', update_report_status, name='update-report-status'),
    path('users/<uuid:user_id>/attachments/', get_user_attachments, name='user-attachments'),
]

