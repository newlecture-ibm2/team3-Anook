import requests

url = "http://localhost:8000/api/v1/rag/embed"
payload = {"text": "Hello world"}
headers = {"Content-Type": "application/json"}

try:
    response = requests.post(url, json=payload, headers=headers)
    print("Status Code:", response.status_code)
    if response.status_code == 200:
        data = response.json()
        embedding = data.get("embedding", [])
        print("Embedding length:", len(embedding))
        if embedding:
            print("First 5 values:", embedding[:5])
    else:
        print("Response:", response.text)
except Exception as e:
    print("Error:", e)
