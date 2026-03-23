
import requests

# ... (existing imports)

def test_api():
    print("\n--- API TEST (localhost:8000) ---")
    try:
        url = "http://127.0.0.1:8000/api/errors?model=C7100&limit=5"
        print(f"Requesting: {url}")
        res = requests.get(url)
        print(f"Status: {res.status_code}")
        if res.status_code == 200:
            data = res.json()
            print(f"Response (First item): {data[0] if data else 'Empty List'}")
            print(f"Total items returned: {len(data)}")
        else:
            print(f"Error: {res.text}")
    except Exception as e:
        print(f"API Request Failed: {e}")

if __name__ == "__main__":
    if not DATABASE_URL:
        print("DATABASE_URL not found!")
    else:
        asyncio.run(analyze_db())
        test_api()
