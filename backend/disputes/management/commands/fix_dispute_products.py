from django.core.management.base import BaseCommand
from disputes.models import Dispute


class Command(BaseCommand):
    help = 'Fix disputes that are missing product information'

    def handle(self, *args, **options):
        # Find disputes without product information
        disputes_without_product = Dispute.objects.filter(product__isnull=True)
        
        self.stdout.write(f'Found {disputes_without_product.count()} disputes without product information')
        
        fixed_count = 0
        for dispute in disputes_without_product:
            if dispute.order and dispute.order.product:
                dispute.product = dispute.order.product
                dispute.save()
                fixed_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Fixed dispute {dispute.id}: set product to {dispute.product.id}')
                )
            else:
                self.stdout.write(
                    self.style.ERROR(f'Could not fix dispute {dispute.id}: order or order.product is null')
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully fixed {fixed_count} disputes')
        )
