from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SupportResourceViewSet, ForumCategoryViewSet, ForumPostViewSet

router = DefaultRouter()
router.register(r'resources', SupportResourceViewSet)
router.register(r'categories', ForumCategoryViewSet)
router.register(r'posts', ForumPostViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
