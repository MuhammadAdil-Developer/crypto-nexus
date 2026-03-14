from django.db import connection
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

def check_and_fix():
    with connection.cursor() as cursor:
        # Check columns in marketplace_order_disputes
        cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'marketplace_order_disputes'")
        columns = [row[0] for row in cursor.fetchall()]
        print(f"Current columns in marketplace_order_disputes: {columns}")
        
        if 'refund_request_id' not in columns:
            print("Missing refund_request_id. Attempting to add it...")
            try:
                # The table name for RefundRequest is 'refund_requests' as seen in models.py
                cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_name = 'refund_requests'")
                tbl = cursor.fetchone()
                if tbl:
                    tbl_name = tbl[0]
                    print(f"Found refund table: {tbl_name}")
                    
                    # Check 'id' column type of refund_requests to match it
                    cursor.execute("SELECT data_type FROM information_schema.columns WHERE table_name = 'refund_requests' AND column_name = 'id'")
                    id_type = cursor.fetchone()[0]
                    print(f"ID column type in refund_requests: {id_type}")
                    
                    # Add column
                    cursor.execute(f"ALTER TABLE marketplace_order_disputes ADD COLUMN refund_request_id {id_type} UNIQUE")
                    cursor.execute(f"ALTER TABLE marketplace_order_disputes ADD CONSTRAINT fk_disputes_refund FOREIGN KEY (refund_request_id) REFERENCES {tbl_name}(id)")
                    print("Column and FK added successfully.")
                else:
                    print("Could not find refund_requests table. Adding as generic UUID/UUID-like column.")
                    cursor.execute("ALTER TABLE marketplace_order_disputes ADD COLUMN refund_request_id uuid UNIQUE")
                    print("Column added (uuid type).")
            except Exception as e:
                print(f"Error during column addition: {e}")
                print("Trying fallback to varchar...")
                try:
                    cursor.execute("ALTER TABLE marketplace_order_disputes ADD COLUMN refund_request_id varchar(36) UNIQUE")
                    print("Column added (varchar(36) type).")
                except Exception as e2:
                    print(f"Fallback failed: {e2}")
        else:
            print("Column 'refund_request_id' already exists.")

if __name__ == "__main__":
    check_and_fix()
