# Generated manually for dispute resolution enhancements

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('disputes', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='dispute',
            name='resolution_reason',
            field=models.TextField(blank=True, help_text='Detailed explanation of why this decision was made', null=True),
        ),
        migrations.AddField(
            model_name='dispute',
            name='winning_party',
            field=models.CharField(blank=True, choices=[('buyer', 'Buyer'), ('vendor', 'Vendor'), ('neutral', 'Neutral/Shared Responsibility')], help_text='Which party the admin decided in favor of', max_length=20, null=True),
        ),
    ]
