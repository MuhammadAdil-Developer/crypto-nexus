from django.core.management.base import BaseCommand
from shared.models import CryptoCurrency


class Command(BaseCommand):
    help = 'Populate cryptocurrency records for BTC and XMR'

    def handle(self, *args, **options):
        # Bitcoin
        btc, created = CryptoCurrency.objects.get_or_create(
            symbol='BTC',
            defaults={
                'name': 'Bitcoin',
                'logo_url': 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
                'current_price': 50000.00,  # Placeholder price
                'market_cap': 1000000000000.00,  # Placeholder market cap
                'volume_24h': 50000000000.00,  # Placeholder volume
                'price_change_24h': 0.00,
                'is_active': True
            }
        )
        
        if created:
            self.stdout.write(
                self.style.SUCCESS(f'Created Bitcoin (BTC) cryptocurrency record')
            )
        else:
            self.stdout.write(
                self.style.WARNING(f'Bitcoin (BTC) cryptocurrency record already exists')
            )

        # Monero
        xmr, created = CryptoCurrency.objects.get_or_create(
            symbol='XMR',
            defaults={
                'name': 'Monero',
                'logo_url': 'https://cryptologos.cc/logos/monero-xmr-logo.png',
                'current_price': 150.00,  # Placeholder price
                'market_cap': 30000000000.00,  # Placeholder market cap
                'volume_24h': 500000000.00,  # Placeholder volume
                'price_change_24h': 0.00,
                'is_active': True
            }
        )
        
        if created:
            self.stdout.write(
                self.style.SUCCESS(f'Created Monero (XMR) cryptocurrency record')
            )
        else:
            self.stdout.write(
                self.style.WARNING(f'Monero (XMR) cryptocurrency record already exists')
            )

        self.stdout.write(
            self.style.SUCCESS('Cryptocurrency population completed successfully!')
        )
