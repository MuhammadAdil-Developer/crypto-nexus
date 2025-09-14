import os
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-change-this-in-production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DEBUG', 'True').lower() == 'true'

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '*').split(',')

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    
    # Shared Models
    'shared',
    
    # Custom Apps
    'users',
    'products',
    'orders',
    'vendors',
    'payments',
    'notifications',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'cryptonexus.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'cryptonexus.wsgi.application'

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'cryptonexus'),
        'USER': os.environ.get('DB_USER', 'cryptonexus_user'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'admin@123'),
        'HOST': os.environ.get('DB_HOST', '94.130.201.44'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 8,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),
]

# Media files
MEDIA_URL = 'media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom User Model
AUTH_USER_MODEL = 'users.User'

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FormParser',
    ],
}

# JWT Configuration
from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,
    'JWK_URL': None,
    'LEEWAY': 0,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'USER_AUTHENTICATION_RULE': 'rest_framework_simplejwt.authentication.default_user_authentication_rule',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
    'TOKEN_USER_CLASS': 'rest_framework_simplejwt.models.TokenUser',
    'JTI_CLAIM': 'jti',
    'SLIDING_TOKEN_REFRESH_EXP_CLAIM': 'refresh_exp',
    'SLIDING_TOKEN_LIFETIME': timedelta(minutes=5),
    'SLIDING_TOKEN_REFRESH_LIFETIME': timedelta(days=1),
}

# CORS Configuration
CORS_ALLOW_ALL_ORIGINS = DEBUG
cors_origins = os.environ.get('CORS_ALLOWED_ORIGINS', '')
CORS_ALLOWED_ORIGINS = cors_origins.split(',') if cors_origins else []
CORS_ALLOW_CREDENTIALS = True

# Redis Configuration
REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379')

# Celery Configuration
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

# Logging Configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'cryptonexus.log'),
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'users': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'products': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'orders': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Create logs directory if it doesn't exist
os.makedirs(os.path.join(BASE_DIR, 'logs'), exist_ok=True)

# Create static and media directories
os.makedirs(os.path.join(BASE_DIR, 'static'), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, 'media'), exist_ok=True) 

# Payment System Configuration - REAL INTEGRATION
# BTCPay Server (Real Bitcoin)
BTCPAY_SERVER_URL = os.environ.get('BTCPAY_SERVER_URL', 'http://localhost:23000')
BTCPAY_STORE_ID = os.environ.get('BTCPAY_STORE_ID', 'JEc1gfxx2DXM8RYUwgtcdiBhxVAJtXYCD3LRYfAY4mt')  # From your BTCPay dashboard
BTCPAY_API_KEY = os.environ.get('BTCPAY_API_KEY', 'a10ae0eef075731c4842e3fc493bf0d405c13d02')    # TODO: Add your BTCPay API key here
BTCPAY_WEBHOOK_SECRET = os.environ.get('BTCPAY_WEBHOOK_SECRET', 'cryptonexus_webhook_secret_2024')

# Monero RPC (Real Monero)
MONERO_RPC_URL = os.environ.get('MONERO_RPC_URL', 'http://localhost:18082/json_rpc')
MONERO_RPC_USER = os.environ.get('MONERO_RPC_USER', '')
MONERO_RPC_PASSWORD = os.environ.get('MONERO_RPC_PASSWORD', 'cryptonexus123')
MONERO_WALLET_PASSWORD = os.environ.get('MONERO_WALLET_PASSWORD', 'cryptonexus123')

# Bitcoin Core RPC (for direct Bitcoin operations)
BITCOIN_RPC_URL = os.environ.get('BITCOIN_RPC_URL', 'http://localhost:18332')
BITCOIN_RPC_USER = os.environ.get('BITCOIN_RPC_USER', 'bitcoinuser')
BITCOIN_RPC_PASSWORD = os.environ.get('BITCOIN_RPC_PASSWORD', 'bitcoinpass123')

# Network Configuration
BITCOIN_NETWORK = os.environ.get('BITCOIN_NETWORK', 'testnet')  # testnet for development
MONERO_NETWORK = os.environ.get('MONERO_NETWORK', 'testnet')    # testnet for development

SITE_URL = os.environ.get('SITE_URL', 'http://localhost:8000')
PAYMENT_EXPIRY_HOURS = int(os.environ.get('PAYMENT_EXPIRY_HOURS', '2'))
DEFAULT_ESCROW_FEE_PERCENTAGE = float(os.environ.get('DEFAULT_ESCROW_FEE_PERCENTAGE', '2.0'))

# Blockchain Monitoring
BLOCK_CONFIRMATION_REQUIREMENTS = {
    'BTC': int(os.environ.get('BTC_CONFIRMATIONS', '1')),  # 1 for testnet, 3+ for mainnet
    'XMR': int(os.environ.get('XMR_CONFIRMATIONS', '1')),  # 1 for testnet, 10+ for mainnet
}

# Required confirmations per cryptocurrency
REQUIRED_CONFIRMATIONS = {
    'BTC': int(os.environ.get('BTC_REQUIRED_CONFIRMATIONS', '3')),
    'XMR': int(os.environ.get('XMR_REQUIRED_CONFIRMATIONS', '1')),
} 