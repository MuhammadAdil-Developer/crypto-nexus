# payment_monitor_launcher.py
import os
import time
import subprocess
import sys

while True:
    print("Starting direct payment monitor...")
    # Adjust the path to your manage.py
    subprocess.run([sys.executable, "backend/manage.py", "run_direct_payment_monitor"])
    print("Monitor finished cycle. Sleeping for 60 seconds...")
    time.sleep(60)