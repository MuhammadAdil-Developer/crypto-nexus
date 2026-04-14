from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0009_alter_user_created_at_alter_user_updated_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='is_on_vacation',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='user',
            name='vacation_mode_note',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='user',
            name='vacation_mode_until',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
