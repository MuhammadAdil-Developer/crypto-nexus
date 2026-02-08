from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import SupportResource, ForumCategory, ForumPost
from .serializers import SupportResourceSerializer, ForumCategorySerializer, ForumPostSerializer

class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated and request.user.user_type == 'admin'

class SupportResourceViewSet(viewsets.ModelViewSet):
    queryset = SupportResource.objects.all()
    serializer_class = SupportResourceSerializer
    permission_classes = [IsAdminOrReadOnly]

class ForumCategoryViewSet(viewsets.ModelViewSet):
    queryset = ForumCategory.objects.all()
    serializer_class = ForumCategorySerializer
    permission_classes = [IsAdminOrReadOnly]

class ForumPostViewSet(viewsets.ModelViewSet):
    queryset = ForumPost.objects.all()
    serializer_class = ForumPostSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated()] # Simplified for now, usually needs owner/admin check
        return super().get_permissions()
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def public_posts(self, request):
        posts = ForumPost.objects.filter(is_locked=False).order_by('-created_at')
        serializer = self.get_serializer(posts, many=True)
        return Response(serializer.data)
