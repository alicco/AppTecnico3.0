
import requests

def test_api():
    print("\n--- API TEST (localhost:8000) ---")
    try:
        url = "http://localhost:8000/api/errors?model=C7100&limit=5"
        print(f"Requesting: {url}")
        res = requests.get(url)
        print(f"Status: {res.status_code}")
        if res.status_code == 200:
            data = res.json()
            # print(f"Response data: {data}")
            if data and len(data) > 0:
                 print(f"First item code: {data[0].get('code')}")
                 print(f"Total items returned: {len(data)}")
            else:
                 print("Response is an empty list []")
        else:
            print(f"Error: {res.text}")
    except Exception as e:
        print(f"API Request Failed: {e}")

if __name__ == "__main__":
    test_api()
