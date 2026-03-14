import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexus.settings')
try:
    django.setup()
except:
    os.environ['DJANGO_SETTINGS_MODULE'] = 'cryptonexus.settings'
    django.setup()

def check_and_fix():
    with connection.cursor() as cursor:
        # Check columns in marketplace_order_disputes
        cursor.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'marketplace_order_disputes'")
        columns_data = {row[0]: row[1] for row in cursor.fetchall()}
        columns = list(columns_data.keys())
        print(f"Current columns and types in marketplace_order_disputes: {columns_data}")
        
        # 1. Fix refund_request_id type if it's character
        if 'refund_request_id' in columns and columns_data['refund_request_id'] != 'uuid':
            print(f"Detected wrong type for refund_request_id: {columns_data['refund_request_id']}. Converting to uuid...")
            try:
                # Need to use USING to cast if it's currently character
                cursor.execute("ALTER TABLE marketplace_order_disputes ALTER COLUMN refund_request_id TYPE uuid USING refund_request_id::uuid")
                print("refund_request_id converted to uuid.")
            except Exception as e:
                print(f"Error converting refund_request_id: {e}")
                print("Trying to drop and recreate it instead...")
                try:
                    cursor.execute("ALTER TABLE marketplace_order_disputes DROP COLUMN refund_request_id")
                    cursor.execute("ALTER TABLE marketplace_order_disputes ADD COLUMN refund_request_id uuid UNIQUE")
                    print("refund_request_id recreated as uuid.")
                except Exception as e2:
                    print(f"Failed to fix refund_request_id: {e2}")

        # Helper to add column if missing
        def add_col_if_missing(col_name, col_type, nullable=True, unique=False, default=None, fk_table=None):
            if col_name not in columns:
                print(f"Adding {col_name}...")
                sql = f"ALTER TABLE marketplace_order_disputes ADD COLUMN {col_name} {col_type}"
                if unique: sql += " UNIQUE"
                if default: sql += f" DEFAULT {default}"
                if not nullable: sql += " NOT NULL"
                
                try:
                    cursor.execute(sql)
                    print(f"Column {col_name} added.")
                except Exception as e:
                    print(f"Error adding {col_name}: {e}")
            
            # Try adding/restoring FK if fk_table is provided
            if fk_table:
                try:
                    # Check if FK already exists
                    cursor.execute(f"""
                        SELECT count(*) FROM information_schema.table_constraints 
                        WHERE table_name = 'marketplace_order_disputes' 
                        AND constraint_name = 'fk_disputes_{col_name}'
                    """)
                    if cursor.fetchone()[0] == 0:
                        cursor.execute(f"ALTER TABLE marketplace_order_disputes ADD CONSTRAINT fk_disputes_{col_name} FOREIGN KEY ({col_name}) REFERENCES {fk_table}(id)")
                        print(f"FK for {col_name} to {fk_table} added successfully.")
                    else:
                        print(f"FK for {col_name} already exists.")
                except Exception as e:
                    print(f"Could not add FK for {col_name}: {e}")

        # 1. Ensure refund_request_id column exists (if not already handled above)
        add_col_if_missing('refund_request_id', 'uuid', unique=True, fk_table='refund_requests')

        # 2. Handle initiator_id
        add_col_if_missing('initiator_id', 'uuid', fk_table='users')

        # 3. Handle status
        add_col_if_missing('status', 'varchar(20)', default="'open'")

        # 4. Handle resolution_amount
        add_col_if_missing('resolution_amount', 'decimal(20,8)')

        # 5. Handle admin_notes
        add_col_if_missing('admin_notes', 'text')

        print("\nVerification complete.")

if __name__ == "__main__":
    check_and_fix()
