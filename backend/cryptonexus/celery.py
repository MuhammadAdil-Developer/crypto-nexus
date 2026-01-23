import os
from celery import Celery
from celery.schedules import crontab
import ssl

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')

app = Celery('cryptonexus')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# SSL Configuration for Redis
app.conf.update(
    broker_use_ssl={
        'ssl_cert_reqs': ssl.CERT_NONE,
        'ssl_ca_certs': None,
        'ssl_certfile': None,
        'ssl_keyfile': None,
    },
    redis_backend_use_ssl={
        'ssl_cert_reqs': ssl.CERT_NONE,
        'ssl_ca_certs': None,
        'ssl_certfile': None,
        'ssl_keyfile': None,
    }
)

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# Beat schedule for periodic tasks
app.conf.beat_schedule = {
    # COMMENTED OUT: Direct payment monitoring (using webhook approach instead)
    # 'monitor-direct-payments': {
    #     'task': 'payments.tasks.check_direct_payment_status',
    #     'schedule': crontab(minute='*/1'),  # Every 1 minute (for testing)
    # },
    'auto-release-escrow': {
        'task': 'payments.tasks.auto_release_escrow_payouts', 
        'schedule': crontab(minute=0, hour='*/1'),  # Every hour
    },
    'auto-cancel-orders': {
        'task': 'orders.tasks.auto_cancel_expired_orders_task',
        'schedule': crontab(minute='*/5'),  # Every 5 minutes
    },
}

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
