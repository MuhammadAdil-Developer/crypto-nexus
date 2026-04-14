from django.urls import path
from . import views

urlpatterns = [
    # Dispute CRUD
    path('create/', views.create_dispute, name='create_dispute'),
    path('list/', views.list_disputes, name='list_disputes'),
    path('<int:dispute_id>/', views.get_dispute_detail, name='get_dispute_detail'),
    
    # Dispute Messages
    path('<int:dispute_id>/messages/', views.send_dispute_message, name='send_dispute_message'),
    
    # Dispute Resolution
    path('<int:dispute_id>/close/', views.close_dispute, name='close_dispute'),
    path('<int:dispute_id>/resolve/', views.resolve_dispute, name='resolve_dispute'),
    
    # Statistics
    path('statistics/', views.get_dispute_statistics, name='get_dispute_statistics'),
]

