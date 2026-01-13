"""
Upload PDF page images to Supabase Storage using direct HTTP API.
"""
import os
import requests

# Supabase credentials
SUPABASE_URL = "https://sitxqsefkuaovgqunawa.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpdHhxc2Vma3Vhb3ZncXVuYXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MjI1NTUsImV4cCI6MjA4MjI5ODU1NX0.DBXjNEktVqKVuWQotaDJKa32YNoaS8n-7FqGmzxl3WQ"

BUCKET_NAME = "pdf-pages"
LOCAL_DIR = r"c:\Users\forza\Gemini\AppTecnico3.0\pdf_images\C7100"
REMOTE_PREFIX = "C7100"

def upload_file(file_path, remote_path, content_type):
    """Upload a single file to Supabase Storage."""
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET_NAME}/{remote_path}"
    
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "apikey": SUPABASE_KEY,
        "Content-Type": content_type,
        "x-upsert": "true"
    }
    
    with open(file_path, 'rb') as f:
        response = requests.post(url, headers=headers, data=f.read())
    
    return response

def main():
    print("Starting upload to Supabase Storage...")
    
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
            response = upload_file(local_path, remote_path, content_type)
            
            if response.status_code in [200, 201]:
                print(f"OK: {filename}")
                uploaded += 1
            else:
                print(f"FAIL {response.status_code}: {filename} - {response.text[:100]}")
                errors += 1
                
        except Exception as e:
            print(f"ERROR: {filename} - {e}")
            errors += 1
    
    print(f"\nDone! Uploaded {uploaded} files, {errors} errors.")
    
    if uploaded > 0:
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{REMOTE_PREFIX}/P5.webp"
        print(f"\nExample public URL: {public_url}")

if __name__ == "__main__":
    main()
