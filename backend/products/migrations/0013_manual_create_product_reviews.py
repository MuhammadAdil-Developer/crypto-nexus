from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0012_alter_productcategory_id_alter_productsubcategory_id_and_more"),
    ]

    operations = [
        migrations.RunSQL(
            sql=r"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_name = 'product_reviews'
                    AND table_schema = 'public'
                ) THEN
                    CREATE TABLE public.product_reviews (
                        id uuid PRIMARY KEY,
                        created_at timestamp with time zone NOT NULL,
                        updated_at timestamp with time zone NOT NULL,
                        is_active boolean NOT NULL DEFAULT TRUE,
                        is_deleted boolean NOT NULL DEFAULT FALSE,
                        rating integer NOT NULL,
                        comment text NOT NULL,
                        images jsonb NOT NULL DEFAULT '[]'::jsonb,
                        product_id bigint NOT NULL,
                        user_id uuid NOT NULL,
                        CONSTRAINT product_reviews_product_id_fkey FOREIGN KEY (product_id)
                            REFERENCES public.vendor_products (id) ON DELETE CASCADE,
                        CONSTRAINT product_reviews_user_id_fkey FOREIGN KEY (user_id)
                            REFERENCES public.users (id) ON DELETE CASCADE,
                        CONSTRAINT product_reviews_unique_product_user UNIQUE (product_id, user_id)
                    );
                END IF;
            END
            $$;
            """,
            reverse_sql=r"""
            DROP TABLE IF EXISTS public.product_reviews CASCADE;
            """,
        ),
    ]


