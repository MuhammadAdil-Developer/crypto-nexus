from django.urls import path
from .views import (
    TicketListCreateView,
    TicketDetailView,
    TicketMessageListCreateView,
    update_ticket_status,
    assign_ticket,
    close_ticket,
    get_ticket_statistics,
    TicketTemplateListCreateView,
    TicketTemplateDetailView
)

urlpatterns = [
    # Tickets
    path('', TicketListCreateView.as_view(), name='ticket-list-create'),
    path('<uuid:pk>/', TicketDetailView.as_view(), name='ticket-detail'),
    path('<uuid:pk>/messages/', TicketMessageListCreateView.as_view(), name='ticket-messages'),
    path('<uuid:pk>/status/', update_ticket_status, name='ticket-status'),
    path('<uuid:pk>/assign/', assign_ticket, name='ticket-assign'),
    path('<uuid:pk>/close/', close_ticket, name='ticket-close'),
    
    # Statistics
    path('statistics/', get_ticket_statistics, name='ticket-statistics'),
    
    # Templates
    path('templates/', TicketTemplateListCreateView.as_view(), name='ticket-templates'),
    path('templates/<int:pk>/', TicketTemplateDetailView.as_view(), name='ticket-template-detail'),
]
