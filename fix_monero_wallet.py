import os
import sys
import glob

def fix_wallet():
    print("="*60)
    print("  MONERO WALLET CORRUPTION FIXER")
    print("="*60)
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    print(f"[*] Working Directory: {base_dir}")
    
    # 1. Identify files
    wallet_keys = os.path.join(base_dir, "nexus_wallet.keys")
    wallet_cache = os.path.join(base_dir, "nexus_wallet")
    wallet_unportable = os.path.join(base_dir, "nexus_wallet.unportable")
    
    # Check if keys exist (DO NOT DELETE THIS)
    if not os.path.exists(wallet_keys):
        print(f"[!] ERROR: Keys file not found at {wallet_keys}")
        print("    Cannot repair without keys. Do you have a backup?")
        return
        
    print(f"[+] Found keys file: {wallet_keys} (SAFE)")
    
    # 2. Delete corrupt cache files
    files_to_remove = [wallet_cache, wallet_unportable]
    
    # Also look for any 'nexus_wallet' file that isn't .keys or .backup or .address
    # Just to be safe, typically deleting 'nexus_wallet' (no extension) is enough.
    
    print("\n[*] Removing corrupted cache files...")
    for f in files_to_remove:
        if os.path.exists(f):
            try:
                os.remove(f)
                print(f"    [DELETED] {os.path.basename(f)}")
            except Exception as e:
                print(f"    [FAILED] Could not delete {os.path.basename(f)}: {e}")
        else:
            print(f"    [NOT FOUND] {os.path.basename(f)} (Already gone?)")
            
    print("\n[+] Validation")
    if not os.path.exists(wallet_cache):
        print("    Cache file removed successfully.")
        print("    The wallet RPC will rebuild it from the daemon on next launch.")
        print("    This may take a few minutes depending on blockchain height.")
    else:
        print("    [!] WARNING: Cache file still exists.")

    print("\n" + "="*60)
    print("FIX COMPLETE. Now run: python3 check_monero_status.py")
    print("="*60)

if __name__ == "__main__":
    fix_wallet()
