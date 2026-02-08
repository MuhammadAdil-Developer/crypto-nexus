import sys
import os

# Add the shared serializers to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))
from serializers import UserSerializer, UserDetailSerializer

# Re-export the serializers
__all__ = ['UserSerializer', 'UserDetailSerializer'] 