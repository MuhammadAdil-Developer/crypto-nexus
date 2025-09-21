from django.urls import path
from .views import (
    ConversationListCreateView,
    ConversationDetailView,
    MessageListCreateView,
    create_product_conversation,
    get_conversation_by_product,
    mark_messages_read,
    report_message,
    edit_message,
    delete_message
)

urlpatterns = [
    # Conversations
    path('conversations/', ConversationListCreateView.as_view(), name='conversation-list-create'),
    path('conversations/<uuid:pk>/', ConversationDetailView.as_view(), name='conversation-detail'),
    path('conversations/<uuid:conversation_id>/messages/', MessageListCreateView.as_view(), name='message-list-create'),
    
    # Product-specific conversations
    path('conversations/product/<int:product_id>/', get_conversation_by_product, name='conversation-by-product'),
    path('conversations/create-product/', create_product_conversation, name='create-product-conversation'),
    
    # Message actions
    path('conversations/<uuid:conversation_id>/mark-read/', mark_messages_read, name='mark-messages-read'),
    path('messages/<uuid:message_id>/report/', report_message, name='report-message'),
    path('messages/<uuid:message_id>/edit/', edit_message, name='edit-message'),
    path('messages/<uuid:message_id>/delete/', delete_message, name='delete-message'),
]

