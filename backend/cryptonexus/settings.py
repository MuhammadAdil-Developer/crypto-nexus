import os
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-change-this-in-production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DEBUG', 'True').lower() == 'true'

# CORS Configuration - Production settings
CORS_ALLOWED_ORIGINS = [
    "http://94.130.201.44:5000",
    "http://localhost:5000",
    "http://localhost:3000",
    "http://127.0.0.1:5000",
    "http://127.0.0.1:3000",
]

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = False  # Set to False for production security

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
    'channels',
    
    # Shared Models
    'shared',
    
    # Custom Apps
    'users',
    'products',
    'orders',
    'vendors',
    'payments',
    'notifications',
    'messaging',
    'disputes',
    'tickets',
    'wishlist',
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
        'NAME': os.environ.get('DB_NAME', 'defaultdb'),
        'USER': os.environ.get('DB_USER', 'avnadmin'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'AVNS_MVpDJ4Ocg3gpXxYEydM'),
        'HOST': os.environ.get('DB_HOST', 'pg-34e6acea-adilinbox4-8b41.k.aivencloud.com'),
        'PORT': os.environ.get('DB_PORT', '28770'),
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

# CORS Configuration - Environment-based
CORS_ALLOW_ALL_ORIGINS = DEBUG
cors_origins = os.environ.get('CORS_ALLOWED_ORIGINS', '')
if cors_origins:
    CORS_ALLOWED_ORIGINS = cors_origins.split(',')
else:
    # Default origins if not set in environment
    CORS_ALLOWED_ORIGINS = [
        "http://94.130.201.44:5000",
        "http://localhost:5000",
        "http://localhost:3000",
        "http://127.0.0.1:5000",
        "http://127.0.0.1:3000",
    ]
CORS_ALLOW_CREDENTIALS = True

# Redis Configuration
REDIS_URL = os.environ.get('REDIS_URL', 'rediss://default:AU7zAAIncDI2YjYzZDY3NTc1MmQ0NGI1OGNmNjI0OTAzNWMxN2Y2YXAyMjAyMTE@integral-spider-20211.upstash.io:6379')

# Celery Configuration
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

# Redis SSL Configuration for Celery
CELERY_REDIS_SSL_CERT_REQS = 'CERT_NONE'  # For Upstash Redis
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True
CELERY_BROKER_CONNECTION_RETRY = True
CELERY_BROKER_CONNECTION_MAX_RETRIES = 10

# Windows-specific Celery configuration
CELERY_WORKER_POOL = 'solo'  # Use solo pool for Windows to avoid multiprocessing issues
CELERY_WORKER_CONCURRENCY = 1

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
BTCPAY_SERVER_URL = os.environ.get('BTCPAY_SERVER_URL', 'http://88.99.143.151:23000')
BTCPAY_STORE_ID = os.environ.get('BTCPAY_STORE_ID', 'C7x377KvvYorCvnjtXAzbrtQY7Jj8a4Ly4ZZ3BRdUXkp')  # Correct Store ID from BTCPay dashboard
BTCPAY_API_KEY = os.environ.get('BTCPAY_API_KEY', '74bf19502aeed4a1da5669182d015d2b269cc2bb')    # Working Greenfield API key
BTCPAY_WEBHOOK_SECRET = os.environ.get('BTCPAY_WEBHOOK_SECRET', '3CZB3qpXXhoDWqVxg5KjypRPf1ui')

# Monero RPC (Real Monero)
MONERO_RPC_URL = os.environ.get('MONERO_RPC_URL', 'http://88.99.143.151:28083/json_rpc')
MONERO_RPC_USER = os.environ.get('MONERO_RPC_USER', 'monerouser')
MONERO_RPC_PASSWORD = os.environ.get('MONERO_RPC_PASSWORD', 'moneropass123')
MONERO_WALLET_PASSWORD = os.environ.get('MONERO_WALLET_PASSWORD', 'testwallet')

# Admin Wallet Addresses (for direct payments)
ADMIN_BTC_ADDRESS = os.environ.get('ADMIN_BTC_ADDRESS', 'tb1quyfk5rtvttyzmz7k9eepdlkmg9uxh8n48kch9c')
ADMIN_XMR_ADDRESS = os.environ.get('ADMIN_XMR_ADDRESS', '4AdUndXHHZ6cFd8VZJ3x4L9eDz3r7gHhKkLmNnPpQqRrSsTtUuVvWwXxYyZz')

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

# Channels Configuration
ASGI_APPLICATION = 'cryptonexus.asgi.application'

# Channel Layers Configuration
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [os.environ.get('REDIS_URL', 'rediss://default:AU7zAAIncDI2YjYzZDY3NTc1MmQ0NGI1OGNmNjI0OTAzNWMxN2Y2YXAyMjAyMTE@integral-spider-20211.upstash.io:6379')],
        },
    },
}  

