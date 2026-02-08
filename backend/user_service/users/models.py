import sys
import os

# Add the shared models to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))
from models import User

# Re-export the User model
__all__ = ['User'] 