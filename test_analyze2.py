import requests
import json

url = "http://localhost:8000/analyze"
payload = {
    "text": "응 둘 다 접수해줘",
    "room_no": "101",
    "language": "ko",
    "system_language": "ko",
    "chat_history": [
        {"role": "ai", "content": "치즈버거 1개 15달러입니다. 접수할까요?"},
        {"role": "ai", "content": "3시에 강남역으로 가는 택시 예약입니다. 이대로 접수할까요?"}
    ]
}
headers = {'Content-Type': 'application/json'}

response = requests.post(url, json=payload)
print(json.dumps(response.json(), indent=2, ensure_ascii=False))
