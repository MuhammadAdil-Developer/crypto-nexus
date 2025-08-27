from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, BasePermission
from django.utils import timezone
from .models import VendorApplication
from .serializers import (
    VendorApplicationSerializer, 
    VendorApplicationCreateSerializer,
    VendorApplicationUpdateSerializer
)


class IsAdminOrSuperUser(BasePermission):
    """
    Custom permission class to check if user is admin or superuser
    Works with JWT authentication
    """
    def has_permission(self, request, view):
        # Check if user is authenticated
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Check if user is superuser (Django's built-in field)
        if request.user.is_superuser:
            return True
        
        # Check if user has admin user_type
        if hasattr(request.user, 'user_type') and request.user.user_type == 'admin':
            return True
        
        return False

class VendorApplicationViewSet(viewsets.ModelViewSet):
    queryset = VendorApplication.objects.all()
    serializer_class = VendorApplicationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return VendorApplicationCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return VendorApplicationUpdateSerializer
        return VendorApplicationSerializer
    
    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy', 'approve', 'reject']:
            return [IsAdminOrSuperUser()]
        elif self.action in ['list', 'create']:
            return []  # Allow public access to list and create for development
        return [IsAuthenticated()]
    
    def create(self, request, *args, **kwargs):
        # Handle file uploads
        data = request.data.copy()
        files = request.FILES
        
        # Process file uploads
        if 'documents' in files:
            data['documents'] = files['documents']
        if 'logo' in files:
            data['logo'] = files['logo']
        if 'images' in files:
            data['images'] = files['images']
        
        serializer = self.get_serializer(data=data)
        if serializer.is_valid():
            # Set initial status
            application = serializer.save(status='pending')
            
            # Return success response
            return Response({
                'message': 'Vendor application submitted successfully!',
                'application_id': application.id,
                'status': 'pending'
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a vendor application"""
        try:
            application = self.get_object()
            
            if application.status != 'pending':
                return Response({
                    'error': 'Application is not in pending status'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Update application status
            application.status = 'approved'
            application.reviewed_by = request.user
            application.reviewed_at = timezone.now()
            application.admin_notes = request.data.get('admin_notes', '')
            application.save()
            
            # TODO: Create vendor account and send approval email
            
            return Response({
                'message': 'Vendor application approved successfully!',
                'status': 'approved'
            }, status=status.HTTP_200_OK)
            
        except VendorApplication.DoesNotExist:
            return Response({
                'error': 'Application not found'
            }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a vendor application"""
        try:
            application = self.get_object()
            
            if application.status != 'pending':
                return Response({
                    'error': 'Application is not in pending status'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Update application status
            application.status = 'rejected'
            application.reviewed_by = request.user
            application.reviewed_at = timezone.now()
            application.admin_notes = request.data.get('admin_notes', '')
            application.save()
            
            # TODO: Send rejection email
            
            return Response({
                'message': 'Vendor application rejected successfully!',
                'status': 'rejected'
            }, status=status.HTTP_200_OK)
            
        except VendorApplication.DoesNotExist:
            return Response({
                'error': 'Application not found'
            }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get all pending applications (admin only)"""
        if not request.user.is_staff:
            return Response({
                'error': 'Access denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        pending_applications = VendorApplication.objects.filter(status='pending')
        serializer = self.get_serializer(pending_applications, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_application(self, request):
        """Get current user's application"""
        try:
            application = VendorApplication.objects.get(email=request.user.email)
            serializer = self.get_serializer(application)
            return Response(serializer.data)
        except VendorApplication.DoesNotExist:
            return Response({
                'error': 'No application found for this user'
            }, status=status.HTTP_404_NOT_FOUND) 