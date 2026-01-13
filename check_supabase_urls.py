
import os
from supabase import create_client

SUPABASE_URL = "https://sitxqsefkuaovgqunawa.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpdHhxc2Vma3Vhb3ZncXVuYXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MjI1NTUsImV4cCI6MjA4MjI5ODU1NX0.DBXjNEktVqKVuWQotaDJKa32YNoaS8n-7FqGmzxl3WQ"

BUCKET_NAME = "pdf-pages"
FOLDER = "C7100"

def check_bucket():
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print(f"Listing all top level folders of bucket '{BUCKET_NAME}'...")
    try:
        res = supabase.storage.from_(BUCKET_NAME).list()
        for item in res:
            print(f"- Folder: {item['name']}")
            
        # We don't need the file listing for C7100 again if we are just checking folders
        # But let's check if C7000 is one of them.
        res = supabase.storage.from_(BUCKET_NAME).list(FOLDER)
        if not res:
            print("No files found or error in listing.")
            return

        for item in res:
            filename = item['name']
            public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{FOLDER}/{filename}"
            print(f"- {filename}: {public_url}")
            if res.index(item) > 5:
                print("... (truncated)")
                break
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_bucket()
