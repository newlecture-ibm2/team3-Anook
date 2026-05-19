import requests
import json

url = "http://localhost:8000/analyze"
payload = {
    "text": "응 택시도 예약해줘",
    "room_no": "101",
    "language": "ko",
    "system_language": "ko",
    "chat_history": [
        {"role": "ai", "content": "치즈버거 1개 15달러입니다. 이대로 주문을 접수해 드릴까요?"}
    ]
}
headers = {'Content-Type': 'application/json'}

response = requests.post(url, json=payload)
print(json.dumps(response.json(), indent=2, ensure_ascii=False))
