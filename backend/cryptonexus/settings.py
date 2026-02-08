import os
from pathlib import Path
import environ

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env file
env = environ.Env()
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-change-this-in-production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'

# HTTPS & Proxy Settings
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG

# CORS Configuration - Production settings
CORS_ALLOWED_ORIGINS = [
    "https://accountzclub.com",
    "https://accsclub.cc",
    "https://accountz.club",
    "https://accountz2.club",
    "https://accs.club",
]

CSRF_TRUSTED_ORIGINS = [
    "https://accountzclub.com",
    "https://accsclub.cc",
    "https://accountz.club",
    "https://accountz2.club",
    "https://accs.club",
]

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = False  # Set to False for production security

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')
for host in ['api.accountzclub.com', 'accountzclub.com', 'accsclub.cc', 'accountz.club', 'accountz2.club', 'accs.club']:
    if host not in ALLOWED_HOSTS and host:
        ALLOWED_HOSTS.append(host)

# Allow localhost always (per user request to fix DisallowedHost)
ALLOWED_HOSTS.extend(['localhost', '127.0.0.1', 'localhost:8000'])

# Avoid direct IP access in production to prevent Cloudflare bypass
# ALLOWED_HOSTS.extend(['88.99.143.151', '94.130.201.44'])

# Application definition
INSTALLED_APPS = [
    'daphne',
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
    'content',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'shared.middleware.security.SecurityMiddleware', # Custom Security Middleware
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'shared.middleware.maintenance.MaintenanceModeMiddleware', # Maintenance Mode
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
        'NAME': os.environ.get('DB_NAME', 'accountzclub'),
        'USER': os.environ.get('DB_USER', 'admin'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'OopsDropDB#1'),
        'HOST': os.environ.get('DB_HOST', '88.99.143.151'),
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
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),
]

# Media files
MEDIA_URL = '/media/'
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
    'PAGE_SIZE': 10000,
    'PAGE_SIZE_QUERY_PARAM': 'page_size',
    'MAX_PAGE_SIZE': 10000,
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
    'ACCESS_TOKEN_LIFETIME': timedelta(days=6),  # 6 days default
    'REFRESH_TOKEN_LIFETIME': timedelta(days=20),  # 20 days for remember me
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
    CORS_ALLOWED_ORIGINS = [origin.strip().rstrip('/') for origin in cors_origins.split(',')]
else:
    # Default origins if not set in environment
    CORS_ALLOWED_ORIGINS = [
        "https://accountzclub.com",
        "https://accsclub.cc",
        "https://accountz.club",
        "https://accountz2.club",
        "https://accs.club",
    ]
    # Always add localhost origins for now
    CORS_ALLOWED_ORIGINS.extend([
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ])
CORS_ALLOW_CREDENTIALS = True

# Redis Configuration
REDIS_URL = os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379')

# Celery Configuration
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

# Isolate queue to avoid picking up tasks from other projects sharing this Redis
CELERY_TASK_DEFAULT_QUEUE = 'crypto_nexus_tasks'
CELERY_BROKER_TRANSPORT_OPTIONS = {
    'global_keyprefix': 'crypto_nexus:'
}

# Redis SSL Configuration for Celery
# Only enable SSL requirements if using rediss://
if REDIS_URL.startswith('rediss://'):
    CELERY_REDIS_SSL_CERT_REQS = 'CERT_NONE' 
    CELERY_BROKER_USE_SSL = {'ssl_cert_reqs': 'CERT_NONE'}
    CELERY_REDIS_BACKEND_USE_SSL = {'ssl_cert_reqs': 'CERT_NONE'}
else:
    CELERY_REDIS_SSL_CERT_REQS = None
    CELERY_BROKER_USE_SSL = False
    CELERY_REDIS_BACKEND_USE_SSL = False

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

# Payment System Configuration - INTEGRATION
# Payment System Configuration - INTEGRATION
# BTCPay Server (Bitcoin)
BTCPAY_SERVER_URL = os.environ.get('BTCPAY_SERVER_URL', 'https://pay.accountzclub.com')
BTCPAY_STORE_ID = os.environ.get('BTCPAY_STORE_ID', '')
BTCPAY_API_KEY = os.environ.get('BTCPAY_API_KEY', '')
BTCPAY_WEBHOOK_SECRET = os.environ.get('BTCPAY_WEBHOOK_SECRET', '')

# Monero RPC (Monero)
MONERO_RPC_URL = os.environ.get('MONERO_RPC_URL', 'http://127.0.0.1:18082/json_rpc')
MONERO_RPC_USER = os.environ.get('MONERO_RPC_USER', '')
MONERO_RPC_PASSWORD = os.environ.get('MONERO_RPC_PASSWORD', '')
MONERO_WALLET_PASSWORD = os.environ.get('MONERO_WALLET_PASSWORD', '')

# Admin Wallet Addresses (for direct payments)
ADMIN_BTC_ADDRESS = os.environ.get('ADMIN_BTC_ADDRESS', '')
ADMIN_XMR_ADDRESS = os.environ.get('ADMIN_XMR_ADDRESS', '')

# Bitcoin Core RPC (for direct Bitcoin operations)
BITCOIN_RPC_URL = os.environ.get('BITCOIN_RPC_URL', 'http://88.99.143.151:8332')
BITCOIN_RPC_USER = os.environ.get('BITCOIN_RPC_USER', '')
BITCOIN_RPC_PASSWORD = os.environ.get('BITCOIN_RPC_PASSWORD', '')

# Network Configuration - MAINNET (Production)
BITCOIN_NETWORK = os.environ.get('BITCOIN_NETWORK', 'mainnet')
MONERO_NETWORK = os.environ.get('MONERO_NETWORK', 'mainnet')

SITE_URL = os.environ.get('SITE_URL', 'http://88.99.143.151:8000')
PAYMENT_EXPIRY_HOURS = int(os.environ.get('PAYMENT_EXPIRY_HOURS', '2'))
DEFAULT_ESCROW_FEE_PERCENTAGE = float(os.environ.get('DEFAULT_ESCROW_FEE_PERCENTAGE', '2.0'))

# Blockchain Monitoring
BLOCK_CONFIRMATION_REQUIREMENTS = {
    'BTC': int(os.environ.get('BTC_CONFIRMATIONS', getattr(locals(), 'BTC_CONFIRMATIONS', 1))),
    'XMR': int(os.environ.get('XMR_CONFIRMATIONS', getattr(locals(), 'XMR_CONFIRMATIONS', 1))),
}

# Required confirmations per cryptocurrency
REQUIRED_CONFIRMATIONS = {
    'BTC': int(os.environ.get('BTC_REQUIRED_CONFIRMATIONS', getattr(locals(), 'BTC_CONFIRMATIONS', 1))),
    'XMR': int(os.environ.get('XMR_REQUIRED_CONFIRMATIONS', getattr(locals(), 'XMR_CONFIRMATIONS', 1))),
}

XMR_PAID_THRESHOLD = int(os.environ.get('XMR_PAID_THRESHOLD', 1))

# Channels Configuration
ASGI_APPLICATION = 'cryptonexus.asgi.application'

# Channel Layers Configuration
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379')],
        },
    },
}  


try:
    from .local_settings import *
except ImportError:
    pass
