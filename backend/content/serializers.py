from rest_framework import serializers
from .models import SupportResource, ForumCategory, ForumPost
from users.serializers import UserSerializer # Assuming this exists

class SupportResourceSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_resource_type_display', read_only=True)
    
    class Meta:
        model = SupportResource
        fields = '__all__'

class ForumCategorySerializer(serializers.ModelSerializer):
    post_count = serializers.IntegerField(source='posts.count', read_only=True)
    
    class Meta:
        model = ForumCategory
        fields = '__all__'

class ForumPostSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.username', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = ForumPost
        fields = '__all__'
        read_only_fields = ['author']
