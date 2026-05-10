from app.core.emergency_engine import run_emergency_agent
import traceback

try:
    res = run_emergency_agent("피가 나요 구급상자 좀 주세요")
    print(res)
except Exception as e:
    traceback.print_exc()
