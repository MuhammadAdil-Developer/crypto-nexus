import os
import sys
import subprocess
import time
import requests
import json
from requests.auth import HTTPDigestAuth

def run_launcher():
    print("="*60)
    print("  MONERO RPC DIAGNOSTIC LAUNCHER")
    print("="*60)

    # 1. Check Files
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Detect OS and set correct binary name
    binary_name = "monero-wallet-rpc"
    if sys.platform == "win32":
        binary_name += ".exe"
    
    rpc_exe = os.path.join(base_dir, binary_name)
    wallet_file = os.path.join(base_dir, "nexus_wallet")

    print(f"[*] Working Directory: {base_dir}")
    print(f"[*] Checking for: {rpc_exe}")
    
    if not os.path.exists(rpc_exe):
        print(f"[!] DO NOT FOUND: {rpc_exe}")
        print("    Please download and extract it again!")
        input("Press Enter to exit...")
        return

    print(f"[+] Found executable.")

    # 2. Command Arguments
    cmd = [
        rpc_exe,
        "--wallet-file", "nexus_wallet",
        "--password", "testwallet",
        "--rpc-bind-port", "18082",
        "--rpc-login", "monerouser:moneropass123",
        "--daemon-address", "ravfx.its-a-node.org:18081",
        "--log-level", "2",
        "--confirm-external-bind",
        "--non-interactive"
    ]
    
    print("\n[*] Launching Monero RPC...")
    print(f"    Command: {' '.join(cmd)}")
    print("\n" + "-"*20 + " PROCESS OUTPUT " + "-"*20)

    # 3. Run Subprocess and Print Output
    try:
        process = subprocess.Popen(
            cmd, 
            cwd=base_dir,
            stdout=subprocess.PIPE, 
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )
        
        # Read output line by line
        while True:
            line = process.stdout.readline()
            if not line and process.poll() is not None:
                break
            if line:
                print(line.strip())
                
        rc = process.poll()
        print("-" * 50)
        print(f"[!] Process finished with Exit Code: {rc}")
        
    except Exception as e:
        print(f"[!] CRITICAL ERROR: {e}")
        
    print("\n[FINISHED] You can scroll up to see the error.")
    input("Press Enter to close this window...")

if __name__ == "__main__":
    run_launcher()
