from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='is_giveaway',
            field=models.BooleanField(default=False),
        ),
    ]
