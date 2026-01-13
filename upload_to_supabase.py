"""
Upload PDF page images to Supabase Storage.
Creates bucket 'pdf-pages' and uploads all WebP images + metadata.json
"""
import os
from supabase import create_client

# Supabase credentials
SUPABASE_URL = "https://sitxqsefkuaovgqunawa.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpdHhxc2Vma3Vhb3ZncXVuYXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MjI1NTUsImV4cCI6MjA4MjI5ODU1NX0.DBXjNEktVqKVuWQotaDJKa32YNoaS8n-7FqGmzxl3WQ"

BUCKET_NAME = "pdf-pages"
LOCAL_DIR = r"c:\Users\forza\Gemini\AppTecnico3.0\pdf_images\C7100"
REMOTE_PREFIX = "C7100"

def main():
    print("Connecting to Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Check if bucket exists, create if not
    print(f"Checking bucket '{BUCKET_NAME}'...")
    try:
        buckets = supabase.storage.list_buckets()
        bucket_names = [b.name for b in buckets]
        
        if BUCKET_NAME not in bucket_names:
            print(f"Creating bucket '{BUCKET_NAME}'...")
            supabase.storage.create_bucket(BUCKET_NAME, options={"public": True})
            print("Bucket created.")
        else:
            print("Bucket already exists.")
    except Exception as e:
        print(f"Bucket check/create error: {e}")
        print("Continuing with upload attempt...")
    
    # Upload files
    files = os.listdir(LOCAL_DIR)
    uploaded = 0
    errors = 0
    
    for filename in files:
        local_path = os.path.join(LOCAL_DIR, filename)
        if not os.path.isfile(local_path):
            continue
            
        remote_path = f"{REMOTE_PREFIX}/{filename}"
        
        # Determine content type
        if filename.endswith('.webp'):
            content_type = 'image/webp'
        elif filename.endswith('.json'):
            content_type = 'application/json'
        else:
            content_type = 'application/octet-stream'
        
        try:
            with open(local_path, 'rb') as f:
                file_data = f.read()
            
            result = supabase.storage.from_(BUCKET_NAME).upload(
                remote_path,
                file_data,
                file_options={"content-type": content_type, "upsert": "true"}
            )
            
            print(f"Uploaded: {filename}")
            uploaded += 1
            
        except Exception as e:
            print(f"Error uploading {filename}: {e}")
            errors += 1
    
    print(f"\nDone! Uploaded {uploaded} files, {errors} errors.")
    
    # Print public URL example
    public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{REMOTE_PREFIX}/P5.webp"
    print(f"\nExample public URL: {public_url}")

if __name__ == "__main__":
    main()
