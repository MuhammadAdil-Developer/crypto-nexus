from rest_framework import serializers
from .models import Announcement, Notification

class AnnouncementSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = Announcement
        fields = '__all__'
        read_only_fields = ('created_by', 'created_at', 'updated_at')

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
