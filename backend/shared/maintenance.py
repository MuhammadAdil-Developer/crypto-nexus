from django.core.cache import cache
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

MAINTENANCE_MODE_KEY = 'system_maintenance_mode'
MAINTENANCE_MESSAGE_KEY = 'system_maintenance_message'

class MaintenanceMode:
    """Maintenance mode utility for the application"""
    
    @staticmethod
    def is_enabled():
        """Check if maintenance mode is currently enabled"""
        return cache.get(MAINTENANCE_MODE_KEY, False)
    
    @staticmethod
    def enable(message="We're currently performing scheduled maintenance. We'll be back shortly!"):
        """Enable maintenance mode with custom message"""
        cache.set(MAINTENANCE_MODE_KEY, True, timeout=None)
        cache.set(MAINTENANCE_MESSAGE_KEY, message, timeout=None)
        logger.info("Maintenance mode ENABLED")
        return True
    
    @staticmethod
    def disable():
        """Disable maintenance mode"""
        cache.set(MAINTENANCE_MODE_KEY, False, timeout=None)
        cache.delete(MAINTENANCE_MESSAGE_KEY)
        logger.info("Maintenance mode DISABLED")
        return False
    
    @staticmethod
    def get_message():
        """Get the current maintenance message"""
        return cache.get(
            MAINTENANCE_MESSAGE_KEY, 
            "We're currently performing scheduled maintenance. We'll be back shortly!"
        )
    
    @staticmethod
    def set_message(message):
        """Update maintenance message"""
        cache.set(MAINTENANCE_MESSAGE_KEY, message, timeout=None)
        logger.info(f"Maintenance message updated: {message}")
