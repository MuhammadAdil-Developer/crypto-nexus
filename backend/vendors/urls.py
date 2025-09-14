from django.urls import path
from . import views

urlpatterns = [
    # Vendor application endpoints
    path('applications/', views.list_applications, name='list_applications'),
    path('applications/create/', views.create_application, name='create_application'),
    path('applications/<int:application_id>/approve/', views.approve_application, name='approve_application'),
    path('applications/<int:application_id>/reject/', views.reject_application, name='reject_application'),
    path('applications/check/<str:username>/', views.check_application_status, name='check_application_status'),
] 