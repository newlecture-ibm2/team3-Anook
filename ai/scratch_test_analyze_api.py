import requests
import json

url = "http://localhost:8000/analyze"
payload = {
    "text": "네 이름이 뭐야?",
    "room_no": "101",
    "language": "ko",
    "chat_history": []
}
headers = {"Content-Type": "application/json"}

response = requests.post(url, json=payload, headers=headers)
print("Status Code:", response.status_code)
if response.status_code == 200:
    data = response.json()
    print(json.dumps(data, ensure_ascii=False, indent=2))
else:
    print(response.text)
