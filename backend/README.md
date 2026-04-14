# CryptoNexus Backend System

A comprehensive microservices-based backend system for a multi-vendor cryptocurrency marketplace built with Django and PostgreSQL.

## 🏗️ Architecture

This backend system follows a **microservices architecture** pattern with the following services:

### Core Services

1. **User Service** (`:8001`) - User management, authentication, and authorization
2. **Marketplace Service** (`:8002`) - Products, categories, and marketplace operations
3. **Order Service** (`:8003`) - Order management and processing
4. **Vendor Service** (`:8004`) - Vendor applications and management
5. **Admin Service** (`:8005`) - Administrative functions and oversight
6. **Notification Service** (`:8006`) - Messaging, alerts, and notifications
7. **Payment Service** (`:8007`) - Crypto payments and payouts

### Infrastructure

- **PostgreSQL** - Primary database
- **Redis** - Caching and message broker
- **API Gateway** (`:8000`) - Central routing and load balancing
- **Docker** - Containerization and orchestration

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Python 3.11+
- PostgreSQL 15+
- Redis 7+

### 1. Clone and Setup

```bash
git clone <repository-url>
cd CryptoNexus/backend
```

### 2. Environment Configuration

Create `.env` file in the root directory:

```env
# Database
DB_NAME=cryptonexus
DB_USER=cryptonexus_user
DB_PASSWORD=cryptonexus_password
DB_HOST=postgres
DB_PORT=5432

# Redis
REDIS_URL=redis://redis:6379

# Security
SECRET_KEY=your-secret-key-here
DEBUG=True

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### 3. Start Services

```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d user_service

# View logs
docker-compose logs -f user_service
```

### 4. Database Migrations

```bash
# Run migrations for all services
docker-compose exec user_service python manage.py migrate
docker-compose exec marketplace_service python manage.py migrate
docker-compose exec order_service python manage.py migrate
docker-compose exec vendor_service python manage.py migrate
docker-compose exec admin_service python manage.py migrate
docker-compose exec notification_service python manage.py migrate
docker-compose exec payment_service python manage.py migrate
```

### 5. Create Superuser

```bash
docker-compose exec user_service python manage.py createsuperuser
```

## 📁 Project Structure

```
backend/
├── shared/                          # Shared models and utilities
│   ├── models.py                   # Database models
│   ├── serializers.py              # DRF serializers
│   └── utils.py                    # Common utilities
├── user_service/                    # User management service
│   ├── users/                      # Users app
│   ├── manage.py
│   ├── requirements.txt
│   └── Dockerfile
├── marketplace_service/             # Marketplace service
│   ├── products/                   # Products app
│   ├── categories/                 # Categories app
│   ├── reviews/                    # Reviews app
│   ├── manage.py
│   ├── requirements.txt
│   └── Dockerfile
├── order_service/                   # Order management service
├── vendor_service/                  # Vendor management service
├── admin_service/                   # Admin functions service
├── notification_service/            # Notification service
├── payment_service/                 # Payment processing service
├── api_gateway/                     # API Gateway service
├── docker-compose.yml              # Service orchestration
└── requirements.txt                 # Main dependencies
```

## 🔐 Authentication & Authorization

### JWT Tokens

- **Access Token**: 1 hour lifetime
- **Refresh Token**: 7 days lifetime
- **Token Rotation**: Enabled for security

### User Types

1. **Buyer** - Can browse, purchase, and review products
2. **Vendor** - Can list products and manage inventory
3. **Admin** - Full system access and oversight

### Permission System

```python
# Check user permissions
from shared.utils import check_permission

if check_permission(user.user_type, 'admin'):
    # Admin-only operations
    pass
```

## 🗄️ Database Models

### Core Entities

- **User** - Extended user model with crypto-specific fields
- **Product** - Marketplace products with crypto pricing
- **Order** - Purchase orders and transactions
- **Category** - Product categorization
- **Review** - Product reviews and ratings
- **Payment** - Crypto payment processing
- **VendorApplication** - Vendor onboarding process

### Key Features

- **Soft Delete** - Data preservation with `is_deleted` flag
- **Audit Trail** - `created_at`, `updated_at` timestamps
- **UUID Primary Keys** - Secure and scalable identifiers
- **JSON Fields** - Flexible data storage for dynamic content

## 🔌 API Endpoints

### User Service (`/api/v1/`)

```
POST   /auth/register/              # User registration
POST   /auth/login/                 # User login
POST   /auth/logout/                # User logout
POST   /auth/refresh/               # Token refresh
GET    /profile/                    # Get user profile
PUT    /profile/update/             # Update profile
POST   /profile/change-password/    # Change password
GET    /users/                      # List users (admin)
GET    /users/{id}/                 # Get user details
PUT    /users/{id}/update/          # Update user (admin)
DELETE /users/{id}/delete/          # Delete user (admin)
```

### Marketplace Service (`/api/v1/`)

```
GET    /products/                   # List products
GET    /products/{id}/              # Get product details
POST   /products/                   # Create product (vendor)
PUT    /products/{id}/              # Update product (vendor)
DELETE /products/{id}/              # Delete product (vendor)
GET    /categories/                 # List categories
GET    /reviews/                    # List reviews
POST   /reviews/                    # Create review
```

## 🧪 Testing

### Run Tests

```bash
# Test specific service
docker-compose exec user_service python manage.py test

# Test with coverage
docker-compose exec user_service python manage.py test --with-coverage
```

### Test Structure

```
tests/
├── test_models.py                  # Model tests
├── test_views.py                   # View tests
├── test_serializers.py             # Serializer tests
└── test_integration.py             # Integration tests
```

## 📊 Monitoring & Logging

### Logging Configuration

- **Console Logging** - Development and debugging
- **File Logging** - Production audit trails
- **Structured Logs** - JSON format for analysis

### Health Checks

```bash
# Check service health
curl http://localhost:8001/health/
curl http://localhost:8002/health/
```

## 🔒 Security Features

### Data Protection

- **Input Sanitization** - XSS prevention
- **SQL Injection Protection** - Django ORM
- **CSRF Protection** - Built-in Django security
- **Rate Limiting** - Redis-based throttling

### Authentication Security

- **Password Hashing** - Secure password storage
- **Two-Factor Authentication** - Enhanced security
- **JWT Token Security** - Secure API access
- **Session Management** - Secure user sessions

## 🚀 Deployment

### Production Considerations

1. **Environment Variables** - Secure configuration management
2. **Database Security** - Connection encryption and access control
3. **HTTPS** - SSL/TLS encryption
4. **Load Balancing** - Multiple service instances
5. **Monitoring** - Application performance monitoring
6. **Backup Strategy** - Database and file backups

### Docker Production

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d
```

## 🔧 Development

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start development server
python manage.py runserver

# Create superuser
python manage.py createsuperuser
```

### Code Quality

```bash
# Run linting
flake8 .

# Run formatting
black .

# Run type checking
mypy .
```

## 📚 API Documentation

### Swagger/OpenAPI

API documentation is available at:
- **User Service**: `http://localhost:8001/api/docs/`
- **Marketplace Service**: `http://localhost:8002/api/docs/`

### Postman Collection

Import the provided Postman collection for API testing and development.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Code Standards

- Follow PEP 8 Python style guide
- Use meaningful variable and function names
- Add docstrings to all functions and classes
- Write comprehensive tests
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

### Common Issues

1. **Database Connection Errors**
   - Check PostgreSQL service status
   - Verify database credentials
   - Ensure network connectivity

2. **Migration Errors**
   - Check model compatibility
   - Verify database schema
   - Run migrations in order

3. **Service Startup Issues**
   - Check Docker logs
   - Verify environment variables
   - Check port availability

### Getting Help

- **Documentation**: Check this README and inline code comments
- **Issues**: Create GitHub issues for bugs and feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas

## 🔮 Future Enhancements

- **GraphQL API** - Flexible data querying
- **WebSocket Support** - Real-time updates
- **Microservice Communication** - gRPC integration
- **Advanced Caching** - Redis cluster and CDN
- **Analytics Dashboard** - Business intelligence
- **Mobile API** - Native mobile app support
- **Internationalization** - Multi-language support
- **Advanced Search** - Elasticsearch integration

---

**Built with ❤️ for the CryptoNexus community** 