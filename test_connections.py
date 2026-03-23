import requests

def test_render_backend():
    print("=== Testing Render Backend ===")
    try:
        # Health check
        r = requests.get("https://app-tecnico-backend.onrender.com/api/health", timeout=30)
        print(f"Health: {r.status_code} - {r.text[:100]}")
    except Exception as e:
        print(f"Health FAILED: {e}")
    
    try:
        # Printers
        r = requests.get("https://app-tecnico-backend.onrender.com/api/printers", timeout=30)
        print(f"Printers: {r.status_code} - {r.text[:200]}")
    except Exception as e:
        print(f"Printers FAILED: {e}")

    try:
        # Errors
        r = requests.get("https://app-tecnico-backend.onrender.com/api/errors?model=C7100&limit=3", timeout=30)
        print(f"Errors: {r.status_code} - First 200 chars: {r.text[:200]}")
    except Exception as e:
        print(f"Errors FAILED: {e}")

def test_supabase():
    print("\n=== Testing Supabase Direct ===")
    from supabase import create_client, Client
    
    url = "https://sitxqsefkuaovgqunawa.supabase.co"
    key = "sb_publishable_RBe5G9z7TDi_hYTreH86Kw_AhRqK_DW"
    
    try:
        supabase: Client = create_client(url, key)
        # Test query
        result = supabase.table('printers').select('*').limit(5).execute()
        print(f"Supabase Printers: {result.data}")
    except Exception as e:
        print(f"Supabase FAILED: {e}")

if __name__ == "__main__":
    test_render_backend()
    test_supabase()
