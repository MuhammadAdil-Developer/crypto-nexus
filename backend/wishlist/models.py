from django.db import models
from django.conf import settings
from products.models import Product


class Wishlist(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='wishlist_items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='wishlist_entries')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['user', 'product']
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.product.headline}"


class WishlistNotification(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='wishlist_notifications')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='wishlist_notifications')
    notification_type = models.CharField(
        max_length=20,
        choices=[
            ('price_drop', 'Price Drop'),
            ('back_in_stock', 'Back in Stock'),
            ('vendor_message', 'Vendor Message'),
        ]
    )
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.product.headline} - {self.notification_type}"


