from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from decimal import Decimal
import json

from .models import Product, ProductCategory, ProductSubCategory

User = get_user_model()


class ProductModelTest(TestCase):
    """Test Product model functionality"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testvendor',
            email='vendor@test.com',
            password='testpass123',
            user_type='vendor'
        )
        
        self.category = ProductCategory.objects.create(
            name='Exchange Account',
            slug='exchange-account'
        )
        
        self.sub_category = ProductSubCategory.objects.create(
            name='Binance',
            category=self.category
        )
    
    def test_product_creation(self):
        """Test creating a product"""
        product = Product.objects.create(
            vendor=self.user,
            listing_title='Test Binance Account',
            category=self.category,
            sub_category=self.sub_category,
            description='A verified Binance account with KYC',
            account_type='personal',
            verification_level='kyc_verified',
            access_method='username_password',
            price=Decimal('0.001'),
            quantity_available=1,
            delivery_method='instant_auto',
            tags=['binance', 'kyc', 'verified']
        )
        
        self.assertEqual(product.listing_title, 'Test Binance Account')
        self.assertEqual(product.vendor, self.user)
        self.assertEqual(product.status, 'draft')
        self.assertEqual(product.views_count, 0)
    
    def test_product_final_price(self):
        """Test final price calculation with discount"""
        product = Product.objects.create(
            vendor=self.user,
            listing_title='Test Product',
            category=self.category,
            price=Decimal('0.001'),
            quantity_available=1,
            delivery_method='instant_auto',
            discount_percentage=Decimal('10.00')
        )
        
        expected_price = Decimal('0.001') * Decimal('0.9')  # 10% discount
        self.assertEqual(product.get_final_price(), expected_price)
    
    def test_product_validation(self):
        """Test product field validation"""
        # Test negative price
        with self.assertRaises(Exception):
            Product.objects.create(
                vendor=self.user,
                listing_title='Test Product',
                category=self.category,
                price=Decimal('-0.001'),
                quantity_available=1,
                delivery_method='instant_auto'
            )


class ProductAPITest(APITestCase):
    """Test Product API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create test users
        self.vendor = User.objects.create_user(
            username='testvendor',
            email='vendor@test.com',
            password='testpass123',
            user_type='vendor'
        )
        
        self.buyer = User.objects.create_user(
            username='testbuyer',
            email='buyer@test.com',
            password='testpass123',
            user_type='buyer'
        )
        
        # Create test categories
        self.category = ProductCategory.objects.create(
            name='Exchange Account',
            slug='exchange-account'
        )
        
        self.sub_category = ProductSubCategory.objects.create(
            name='Binance',
            category=self.category
        )
        
        # Create test product
        self.product = Product.objects.create(
            vendor=self.vendor,
            listing_title='Test Binance Account',
            category=self.category,
            sub_category=self.sub_category,
            description='A verified Binance account with KYC',
            account_type='personal',
            verification_level='kyc_verified',
            access_method='username_password',
            price=Decimal('0.001'),
            quantity_available=1,
            delivery_method='instant_auto',
            tags=['binance', 'kyc', 'verified'],
            status='approved'
        )
    
    def test_create_product_authenticated(self):
        """Test creating product when authenticated as vendor"""
        self.client.force_authenticate(user=self.vendor)
        
        data = {
            'listing_title': 'New Test Product',
            'category': self.category.id,
            'sub_category': self.sub_category.id,
            'description': 'A new test product',
            'account_type': 'personal',
            'verification_level': 'email_verified',
            'access_method': 'username_password',
            'price': '0.002',
            'quantity_available': 1,
            'delivery_method': 'instant_auto',
            'tags': ['test', 'new'],
            'special_features': ['trading_limits', 'bonuses']
        }
        
        response = self.client.post(reverse('product-create'), data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Product.objects.count(), 2)
        
        # Check that product was created with correct vendor
        new_product = Product.objects.get(listing_title='New Test Product')
        self.assertEqual(new_product.vendor, self.vendor)
        self.assertEqual(new_product.status, 'draft')
    
    def test_create_product_unauthenticated(self):
        """Test creating product when not authenticated"""
        data = {
            'listing_title': 'New Test Product',
            'category': self.category.id,
            'description': 'A new test product',
            'price': '0.002',
            'quantity_available': 1
        }
        
        response = self.client.post(reverse('product-create'), data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_get_product_list(self):
        """Test getting list of products"""
        response = self.client.get(reverse('product-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_get_product_detail(self):
        """Test getting product details"""
        response = self.client.get(reverse('product-detail', kwargs={'id': self.product.id}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['listing_title'], 'Test Binance Account')
    
    def test_update_product_owner(self):
        """Test updating product by owner"""
        self.client.force_authenticate(user=self.vendor)
        
        data = {
            'listing_title': 'Updated Test Product',
            'price': '0.003'
        }
        
        response = self.client.patch(
            reverse('product-update', kwargs={'id': self.product.id}),
            data
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that product was updated
        self.product.refresh_from_db()
        self.assertEqual(self.product.listing_title, 'Updated Test Product')
        self.assertEqual(self.product.price, Decimal('0.003'))
        self.assertEqual(self.product.status, 'pending_approval')
    
    def test_update_product_non_owner(self):
        """Test updating product by non-owner"""
        self.client.force_authenticate(user=self.buyer)
        
        data = {'listing_title': 'Hacked Product'}
        
        response = self.client.patch(
            reverse('product-update', kwargs={'id': self.product.id}),
            data
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_product_search(self):
        """Test product search functionality"""
        response = self.client.get(reverse('product-search'), {
            'query': 'binance',
            'min_price': '0.0005',
            'max_price': '0.002'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_product_categories(self):
        """Test getting product categories"""
        response = self.client.get(reverse('product-categories'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
    
    def test_product_subcategories(self):
        """Test getting product subcategories"""
        response = self.client.get(
            reverse('product-subcategories', kwargs={'category_id': self.category.id})
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)


class ProductValidationTest(APITestCase):
    """Test product validation rules"""
    
    def setUp(self):
        self.client = APIClient()
        
        self.vendor = User.objects.create_user(
            username='testvendor',
            email='vendor@test.com',
            password='testpass123',
            user_type='vendor'
        )
        
        self.category = ProductCategory.objects.create(
            name='Exchange Account',
            slug='exchange-account'
        )
    
    def test_invalid_price(self):
        """Test validation for invalid price"""
        self.client.force_authenticate(user=self.vendor)
        
        data = {
            'listing_title': 'Test Product',
            'category': self.category.id,
            'description': 'A test product',
            'price': '-0.001',  # Negative price
            'quantity_available': 1,
            'delivery_method': 'instant_auto'
        }
        
        response = self.client.post(reverse('product-create'), data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_invalid_discount(self):
        """Test validation for invalid discount percentage"""
        self.client.force_authenticate(user=self.vendor)
        
        data = {
            'listing_title': 'Test Product',
            'category': self.category.id,
            'description': 'A test product',
            'price': '0.001',
            'discount_percentage': '150',  # More than 100%
            'quantity_available': 1,
            'delivery_method': 'instant_auto'
        }
        
        response = self.client.post(reverse('product-create'), data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_invalid_quantity(self):
        """Test validation for invalid quantity"""
        self.client.force_authenticate(user=self.vendor)
        
        data = {
            'listing_title': 'Test Product',
            'category': self.category.id,
            'description': 'A test product',
            'price': '0.001',
            'quantity_available': 0,  # Zero quantity
            'delivery_method': 'instant_auto'
        }
        
        response = self.client.post(reverse('product-create'), data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_long_description(self):
        """Test validation for description length"""
        self.client.force_authenticate(user=self.vendor)
        
        long_description = 'A' * 151  # More than 150 characters
        
        data = {
            'listing_title': 'Test Product',
            'category': self.category.id,
            'description': long_description,
            'price': '0.001',
            'quantity_available': 1,
            'delivery_method': 'instant_auto'
        }
        
        response = self.client.post(reverse('product-create'), data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST) 