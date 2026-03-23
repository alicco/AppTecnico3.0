
import requests
import json

def test(q):
    try:
        url = f"http://localhost:8000/api/parts?q={q}"
        res = requests.get(url)
        data = res.json()
        print(f"Query: '{q}' -> Results: {len(data)}")
        if data:
            print(f"   Sample: {data[0]['part_code']} - {data[0]['name']}")
    except Exception as e:
        print(f"Query: '{q}' -> Failed: {e}")

print("--- Testing Backend Search Patterns ---")
test("A0V")
test("a0v")
test("A0VDM50500")
test("Thermistor")
test("thermistor")
test("ROLLER")
test("roller")
