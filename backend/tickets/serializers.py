from rest_framework import serializers
from .models import Ticket, TicketMessage, TicketTemplate


class TicketSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_user_type = serializers.CharField(source='user.user_type', read_only=True)
    assigned_to_username = serializers.CharField(source='assigned_to.username', read_only=True)
    
    class Meta:
        model = Ticket
        fields = [
            'id', 'ticket_id', 'user', 'user_type', 'subject', 'description',
            'category', 'priority', 'status', 'assigned_to', 'created_at',
            'updated_at', 'last_response_at', 'resolved_at', 'closed_at',
            'response_count', 'is_urgent', 'user_username', 'user_email',
            'user_user_type', 'assigned_to_username'
        ]
        read_only_fields = [
            'id', 'ticket_id', 'created_at', 'updated_at', 'last_response_at',
            'resolved_at', 'closed_at', 'response_count', 'is_urgent'
        ]


class TicketCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = ['subject', 'description', 'category', 'priority']
    
    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['user'] = user
        validated_data['user_type'] = user.user_type
        return super().create(validated_data)


class TicketMessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    sender_email = serializers.CharField(source='sender.email', read_only=True)
    
    class Meta:
        model = TicketMessage
        fields = [
            'id', 'ticket', 'sender', 'sender_type', 'message', 'is_internal',
            'attachments', 'created_at', 'updated_at', 'sender_username', 'sender_email'
        ]
        read_only_fields = ['id', 'ticket', 'sender', 'sender_type', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['sender'] = user
        validated_data['sender_type'] = user.user_type
        return super().create(validated_data)


class TicketStatisticsSerializer(serializers.Serializer):
    total_tickets = serializers.IntegerField()
    open_tickets = serializers.IntegerField()
    in_progress_tickets = serializers.IntegerField()
    resolved_tickets = serializers.IntegerField()
    closed_tickets = serializers.IntegerField()
    waiting_response_tickets = serializers.IntegerField()
    urgent_tickets = serializers.IntegerField()
    high_priority_tickets = serializers.IntegerField()
    tickets_by_category = serializers.DictField()
    tickets_by_status = serializers.DictField()
    avg_response_time = serializers.FloatField()


class TicketTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketTemplate
        fields = ['id', 'name', 'category', 'subject', 'content', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
