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
        # SECURITY/DEV: Never enable maintenance mode in local DEBUG mode
        # This allows developers to work even if DB has maintenance enabled for production
        if settings.DEBUG:
            return False
            
        try:
            # Try cache first for performance
            enabled = cache.get(MAINTENANCE_MODE_KEY)
            if enabled is not None:
                return enabled
        except Exception as e:
            # Fallback for Redis/Cache connection issues
            logger.error(f"Cache connection error in is_enabled: {e}")
            pass
        
        # Fallback to DB
        try:
            from shared.models import SystemConfiguration
            db_val = SystemConfiguration.get_value(MAINTENANCE_MODE_KEY, 'False')
            is_enabled = db_val.lower() == 'true'
            
            # Update cache if possible
            try:
                cache.set(MAINTENANCE_MODE_KEY, is_enabled, timeout=3600)
            except:
                pass
                
            return is_enabled
        except Exception as e:
            logger.error(f"Database fallback failed in is_enabled: {e}")
            return False
    
    @staticmethod
    def enable(message="We're currently performing scheduled maintenance. We'll be back shortly!"):
        """Enable maintenance mode with custom message"""
        from shared.models import SystemConfiguration
        
        # Save to DB
        SystemConfiguration.set_value(MAINTENANCE_MODE_KEY, 'True')
        SystemConfiguration.set_value(MAINTENANCE_MESSAGE_KEY, message)
        
        # Update Cache
        cache.set(MAINTENANCE_MODE_KEY, True, timeout=None)
        cache.set(MAINTENANCE_MESSAGE_KEY, message, timeout=None)
        
        logger.info("Maintenance mode ENABLED (Persistent)")
        return True
    
    @staticmethod
    def disable():
        """Disable maintenance mode"""
        from shared.models import SystemConfiguration
        
        # Update DB
        SystemConfiguration.set_value(MAINTENANCE_MODE_KEY, 'False')
        
        # Update Cache
        cache.set(MAINTENANCE_MODE_KEY, False, timeout=None)
        cache.set(MAINTENANCE_MESSAGE_KEY, "", timeout=1) # Clear message
        
        logger.info("Maintenance mode DISABLED (Persistent)")
        return False
    
    @staticmethod
    def get_message():
        """Get the current maintenance message"""
        # Try cache first
        msg = cache.get(MAINTENANCE_MESSAGE_KEY)
        if msg:
            return msg
            
        # Fallback to DB
        from shared.models import SystemConfiguration
        db_msg = SystemConfiguration.get_value(MAINTENANCE_MESSAGE_KEY)
        
        if db_msg:
            cache.set(MAINTENANCE_MESSAGE_KEY, db_msg, timeout=3600)
            return db_msg
            
        return "We're currently performing scheduled maintenance. We'll be back shortly!"
    
    @staticmethod
    def set_message(message):
        """Update maintenance message"""
        from shared.models import SystemConfiguration
        SystemConfiguration.set_value(MAINTENANCE_MESSAGE_KEY, message)
        cache.set(MAINTENANCE_MESSAGE_KEY, message, timeout=None)
        logger.info(f"Maintenance message updated: {message}")
