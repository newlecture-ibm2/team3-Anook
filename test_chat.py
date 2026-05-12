import requests
import time

login_res = requests.post("http://localhost:8080/auth/guest", json={"roomNo": "999"})
if login_res.status_code == 200:
    token = login_res.cookies.get("accessToken")
    print("Logged in!")
    chat_res = requests.post(
        "http://localhost:8080/chat/999/messages",
        json={"content": "수건 좀 갖다주세요"},
        headers={"Cookie": f"accessToken={token}"}
    )
    print("Chat status:", chat_res.status_code)
    print(chat_res.text)
else:
    print(login_res.text)
