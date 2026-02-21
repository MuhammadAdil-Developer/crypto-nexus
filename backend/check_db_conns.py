import os
import django
import psycopg2

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cryptonexus.settings')
django.setup()

from django.db import connection

def check_db_connections():
    with connection.cursor() as cursor:
        cursor.execute("SELECT count(*) FROM pg_stat_activity;")
        count = cursor.fetchone()[0]
        print(f"Total connections in DB: {count}")
        
        cursor.execute("SHOW max_connections;")
        max_conn = cursor.fetchone()[0]
        print(f"Max connections allowed: {max_conn}")
        
        cursor.execute("SELECT state, count(*) FROM pg_stat_activity WHERE datname = 'accountzclub' GROUP BY state;")
        rows = cursor.fetchall()
        print("\nConnection states for 'accountzclub':")
        for row in rows:
            print(f"- {row[0]}: {row[1]}")

        cursor.execute("SELECT application_name, count(*) FROM pg_stat_activity WHERE datname = 'accountzclub' GROUP BY application_name;")
        rows = cursor.fetchall()
        print("\nConnections per application:")
        for row in rows:
            print(f"- {row[0] or 'Unknown'}: {row[1]}")

def kill_idle_connections():
    with connection.cursor() as cursor:
        print("\nAttempting to clear idle connections older than 5 minutes...")
        cursor.execute("""
            SELECT count(*) 
            FROM pg_stat_activity 
            WHERE datname = 'accountzclub' 
              AND state = 'idle' 
              AND state_change < now() - interval '5 minutes';
        """)
        count = cursor.fetchone()[0]
        
        cursor.execute("""
            SELECT pg_terminate_backend(pid) 
            FROM pg_stat_activity 
            WHERE datname = 'accountzclub' 
              AND state = 'idle' 
              AND state_change < now() - interval '5 minutes';
        """)
        print(f"Terminated {count} idle connections.")

if __name__ == "__main__":
    try:
        check_db_connections()
        # Uncomment to actually kill them
        # kill_idle_connections()
    except Exception as e:
        print(f"Error: {e}")
