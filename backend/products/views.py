from rest_framework import status, generics, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, BasePermission
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, Count, Avg, Min, Max
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.core.paginator import Paginator
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Product, ProductCategory, ProductSubCategory, ProductImage, ProductDocument
from .serializers import (
    ProductCreateSerializer, ProductDetailSerializer, ProductListSerializer,
    ProductUpdateSerializer, ProductSearchSerializer, ProductCategorySerializer,
    ProductSubCategorySerializer
)
from users.models import User


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


class ProductPagination(PageNumberPagination):
    """Custom pagination for products"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class ProductCategoryView(generics.ListAPIView):
    """Get all product categories"""
    queryset = ProductCategory.objects.filter(is_active=True)
    serializer_class = ProductCategorySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class ProductSubCategoryView(generics.ListAPIView):
    """Get sub-categories for a specific category"""
    serializer_class = ProductSubCategorySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        category_id = self.kwargs.get('category_id')
        return ProductSubCategory.objects.filter(
            category_id=category_id,
            is_active=True
        )


class ProductCreateView(generics.CreateAPIView):
    """Create a new product listing"""
    serializer_class = ProductCreateSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        """Set vendor and initial status"""
        serializer.save(vendor=self.request.user, status='pending_approval')


class ProductDetailView(generics.RetrieveAPIView):
    """Get detailed information about a specific product"""
    queryset = Product.objects.filter(is_active=True, status='approved')
    serializer_class = ProductDetailSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        """Get product with related data"""
        return Product.objects.filter(
            is_active=True, 
            status='approved'
        ).select_related(
            'vendor', 'category', 'sub_category'
        )
    
    def retrieve(self, request, *args, **kwargs):
        """Custom retrieve with additional data"""
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            data = serializer.data
            
            # Add additional context
            data['full_description'] = instance.description
            data['vendor_info'] = {
                'username': instance.vendor.username,
                'email': instance.vendor.email,
                'date_joined': instance.vendor.date_joined,
                'is_verified': True,  # You can add verification logic here
            }
            
            return Response({
                'success': True,
                'data': data
            })
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Error fetching product: {str(e)}'
            }, status=500)


class ProductUpdateView(generics.UpdateAPIView):
    """Update product information"""
    serializer_class = ProductUpdateSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Only allow vendors to update their own products"""
        return Product.objects.filter(vendor=self.request.user)
    
    def perform_update(self, serializer):
        """Reset status to pending approval after update"""
        serializer.save(status='pending_approval')


class ProductStatusUpdateView(generics.UpdateAPIView):
    """Update only product status (without triggering other updates)"""
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Only allow vendors to update their own products"""
        return Product.objects.filter(vendor=self.request.user)
    
    def patch(self, request, *args, **kwargs):
        """Update only the status field"""
        instance = self.get_object()
        new_status = request.data.get('status')
        
        if new_status and new_status in ['draft', 'pending_approval', 'approved', 'rejected', 'suspended']:
            instance.status = new_status
            instance.save(update_fields=['status'])
            
            return Response({
                'success': True,
                'message': f'Product status updated to {new_status}',
                'status': new_status
            })
        else:
            return Response({
                'success': False,
                'message': 'Invalid status value'
            }, status=400)


class ProductDeleteView(generics.DestroyAPIView):
    """Delete a product (soft delete)"""
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Only allow vendors to delete their own products"""
        return Product.objects.filter(vendor=self.request.user)
    
    def perform_destroy(self, instance):
        """Soft delete by setting is_active to False"""
        instance.is_active = False
        instance.save()


class ProductListView(generics.ListAPIView):
    """Get list of approved products with filtering and search"""
    serializer_class = ProductListSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = ProductPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'sub_category', 'account_type', 'verification_level', 'delivery_method']
    search_fields = ['listing_title', 'description', 'tags']
    ordering_fields = ['price', 'created_at', 'rating', 'views_count']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter queryset based on request parameters"""
        queryset = Product.objects.filter(
            is_active=True,
            status='approved'
        ).select_related('vendor', 'category', 'sub_category')
        
        # Apply additional filters
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)
        
        return queryset


class VendorProductListView(generics.ListAPIView):
    """Get products for a specific vendor"""
    serializer_class = ProductListSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = ProductPagination
    
    def get_queryset(self):
        """Get products for specific vendor"""
        vendor_id = self.kwargs.get('vendor_id')
        return Product.objects.filter(
            vendor_id=vendor_id,
            is_active=True,
            status='approved'
        ).select_related('vendor', 'category', 'sub_category')


class MyProductsView(generics.ListAPIView):
    """Get current user's products"""
    serializer_class = ProductListSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = ProductPagination
    
    def get_queryset(self):
        """Get current user's products"""
        return Product.objects.filter(
            vendor=self.request.user,
            is_active=True
        ).select_related('category', 'sub_category').order_by('-created_at')


class ProductSearchView(generics.ListAPIView):
    """Advanced product search with multiple filters"""
    serializer_class = ProductListSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = ProductPagination
    
    def get_queryset(self):
        """Build complex search queryset"""
        queryset = Product.objects.filter(
            is_active=True,
            status='approved'
        ).select_related('vendor', 'category', 'sub_category')
        
        # Get search parameters
        query = self.request.query_params.get('query', '')
        category = self.request.query_params.get('category', '')
        sub_category = self.request.query_params.get('sub_category', '')
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        account_type = self.request.query_params.get('account_type', '')
        verification_level = self.request.query_params.get('verification_level', '')
        tags = self.request.query_params.getlist('tags')
        sort_by = self.request.query_params.get('sort_by', 'newest')
        
        # Apply text search
        if query:
            queryset = queryset.filter(
                Q(listing_title__icontains=query) |
                Q(description__icontains=query) |
                Q(tags__contains=[query])
            )
        
        # Apply filters
        if category:
            queryset = queryset.filter(category__name__iexact=category)
        
        if sub_category:
            queryset = queryset.filter(sub_category__name__iexact=sub_category)
        
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        
        if max_price:
            queryset = queryset.filter(price__lte=max_price)
        
        if account_type:
            queryset = queryset.filter(account_type=account_type)
        
        if verification_level:
            queryset = queryset.filter(verification_level=verification_level)
        
        if tags:
            for tag in tags:
                queryset = queryset.filter(tags__contains=[tag])
        
        # Apply sorting
        if sort_by == 'price_low':
            queryset = queryset.order_by('price')
        elif sort_by == 'price_high':
            queryset = queryset.order_by('-price')
        elif sort_by == 'rating':
            queryset = queryset.order_by('-rating', '-review_count')
        elif sort_by == 'popular':
            queryset = queryset.order_by('-views_count', '-favorites_count')
        else:  # newest
            queryset = queryset.order_by('-created_at')
        
        return queryset


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_product_favorite(request, product_id):
    """Toggle product favorite status for current user"""
    try:
        product = get_object_or_404(Product, id=product_id, is_active=True, status='approved')
        
        # Check if user has already favorited this product
        if hasattr(request.user, 'favorites') and product in request.user.favorites.all():
            request.user.favorites.remove(product)
            product.favorites_count = max(0, product.favorites_count - 1)
            product.save()
            message = "Product removed from favorites"
        else:
            request.user.favorites.add(product)
            product.favorites_count += 1
            product.save()
            message = "Product added to favorites"
        
        return Response({
            'success': True,
            'message': message,
            'favorites_count': product.favorites_count
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticatedOrReadOnly])
def get_product_stats(request):
    """Get marketplace statistics"""
    try:
        total_products = Product.objects.filter(is_active=True, status='approved').count()
        total_vendors = User.objects.filter(user_type='vendor', is_active=True).count()
        total_categories = ProductCategory.objects.filter(is_active=True).count()
        
        # Get top categories
        top_categories = Product.objects.filter(
            is_active=True, 
            status='approved'
        ).values('category__name').annotate(
            count=Count('id')
        ).order_by('-count')[:5]
        
        # Get price range
        price_stats = Product.objects.filter(
            is_active=True, 
            status='approved'
        ).aggregate(
            avg_price=Avg('price'),
            min_price=Avg('price'),
            max_price=Avg('price')
        )
        
        return Response({
            'success': True,
            'data': {
                'total_products': total_products,
                'total_vendors': total_vendors,
                'total_categories': total_categories,
                'top_categories': top_categories,
                'price_stats': price_stats
            }
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_update_products(request):
    """Bulk update multiple products"""
    try:
        product_ids = request.data.get('product_ids', [])
        update_data = request.data.get('update_data', {})
        
        if not product_ids:
            return Response({
                'success': False,
                'message': 'No product IDs provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get products that belong to current user
        products = Product.objects.filter(
            id__in=product_ids,
            vendor=request.user,
            is_active=True
        )
        
        # Update products
        updated_count = products.update(**update_data)
        
        return Response({
            'success': True,
            'message': f'{updated_count} products updated successfully'
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


# ===== ADMIN VIEWS FOR PRODUCT APPROVAL =====

class AdminPendingProductsView(generics.ListAPIView):
    """Get all products pending admin approval"""
    serializer_class = ProductDetailSerializer
    permission_classes = [IsAdminOrSuperUser]
    pagination_class = ProductPagination
    
    def get_queryset(self):
        """Get products pending approval"""
        return Product.objects.filter(
            status__in=['pending_approval', 'draft'],
            is_active=True
        ).select_related(
            'vendor', 'category', 'sub_category'
        ).prefetch_related(
            'product_images', 'product_documents'
        ).order_by('-created_at')


class AdminAllProductsView(generics.ListAPIView):
    """Get all products for admin filtering and management"""
    serializer_class = ProductDetailSerializer
    permission_classes = [IsAdminOrSuperUser]
    pagination_class = ProductPagination
    
    def get_queryset(self):
        """Get all products for admin management"""
        return Product.objects.filter(
            is_active=True
        ).select_related(
            'vendor', 'category', 'sub_category'
        ).prefetch_related(
            'product_images', 'product_documents'
        ).order_by('-created_at')


class AdminApproveProductView(generics.UpdateAPIView):
    """Approve a product listing"""
    serializer_class = ProductDetailSerializer
    permission_classes = [IsAdminOrSuperUser]
    lookup_field = 'id'
    
    def get_queryset(self):
        """Only allow admins to approve products"""
        return Product.objects.filter(status__in=['pending_approval', 'draft'])
    
    def perform_update(self, serializer):
        """Approve the product and set approved_by"""
        serializer.save(
            status='approved',
            approved_by=self.request.user,
            approved_at=timezone.now()
        )


class AdminRejectProductView(generics.UpdateAPIView):
    """Reject a product listing"""
    serializer_class = ProductDetailSerializer
    permission_classes = [IsAdminOrSuperUser]
    lookup_field = 'id'
    
    def get_queryset(self):
        """Only allow admins to reject products"""
        return Product.objects.filter(status__in=['pending_approval', 'draft'])
    
    def perform_update(self, serializer):
        """Reject the product and set rejection reason"""
        rejection_reason = self.request.data.get('rejection_reason', 'Admin rejected')
        serializer.save(
            status='rejected',
            rejection_reason=rejection_reason,
            rejected_by=self.request.user,
            rejected_at=timezone.now()
        )


class BuyerListingsView(generics.ListAPIView):
    """Get all approved products for buyers with search, filter, and sorting"""
    serializer_class = ProductDetailSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = ProductPagination
    
    def get_queryset(self):
        """Get only approved and active products for buyers"""
        try:
            queryset = Product.objects.filter(
                status='approved',
                is_active=True
            ).select_related(
                'vendor', 'category', 'sub_category'
            )
            print(f"✅ Found {queryset.count()} approved products")
            return queryset
        except Exception as e:
            print(f"❌ Error in get_queryset: {e}")
            return Product.objects.none() 