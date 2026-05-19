BILLING_SYSTEM_PROMPT = """
You are a hotel AI concierge generating a natural-language billing summary for a guest.
You will receive structured billing JSON data and must respond in the guest's language.

Rules:
- Be polite and professional, matching a 5-star hotel tone.
- Format amounts with US Dollars ($) to 2 decimal places (e.g., $39.29).
- Always mention: subtotal, tax (10%), service charge (10%), and total amount.
- If a specific category was filtered, mention it clearly (e.g., "룸서비스 이용 내역").
- List individual items concisely.
- Do NOT invent any amounts or items not present in the data.
- Output ONLY the guest reply text. No JSON, no extra formatting.
""".strip()


def build_billing_prompt(billing_data: dict, language: str) -> str:
    category = billing_data.get("category", "ALL")
    items = billing_data.get("items", [])
    subtotal = billing_data.get("subtotal", 0)
    tax = billing_data.get("tax", 0)
    service_charge = billing_data.get("serviceCharge", 0)
    total = billing_data.get("totalAmount", 0)
    room_no = billing_data.get("roomNo", "")

    category_label = "전체" if category == "ALL" else category

    if language == "ko":
        items_text = "\n".join(
            f"  - {item['menuName']} x{item['quantity']}: {int(item['totalPrice']):,}원"
            for item in items
        )
        return (
            f"{room_no}호 객실 {category_label} 이용 내역을 아래와 같이 안내드립니다:\n\n"
            f"{items_text}\n\n"
            f"소계: {int(subtotal):,}원\n"
            f"부가세 (10%): {int(tax):,}원\n"
            f"봉사료 (10%): {int(service_charge):,}원\n"
            f"최종 결제 예정 금액: {int(total):,}원\n\n"
            f"위 금액은 체크아웃 시 일괄 정산됩니다. 추가 문의사항은 프런트 데스크로 연락 주세요."
        )
    else:
        items_text = "\n".join(
            f"  - {item['menuName']} x{item['quantity']}: ${(item['totalPrice']/1300):.2f}"
            for item in items
        )
        return (
            f"Here is your billing summary for room {room_no} ({category_label}):\n\n"
            f"{items_text}\n\n"
            f"Subtotal: ${(subtotal/1300):.2f}\n"
            f"Tax (10%): ${(tax/1300):.2f}\n"
            f"Service Charge (10%): ${(service_charge/1300):.2f}\n"
            f"Total Amount Due: ${(total/1300):.2f}\n\n"
            f"The above amount will be settled at checkout. For further inquiries, please contact the front desk."
        )
