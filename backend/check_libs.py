try:
    import cloudinary
    import cloudinary_storage
    print("SUCCESS: Cloudinary libraries are installed.")
except ImportError as e:
    print(f"FAILURE: {e}")
except Exception as e:
    print(f"ERROR: {e}")
