import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

HF_ROUTER_BASE = "https://router.huggingface.co/v1"
MODEL_ID = "Qwen/Qwen2.5-0.5B-Instruct:fireworks-ai"


def test_qwen():
    log_file = "test_result.txt"

    with open(log_file, "w", encoding="utf-8") as f:
        f.write("🔍 QWEN 0.5B DIAGNOSTIC REPORT\n")
        f.write("================================\n")

        hf_token = os.getenv("HF_TOKEN")
        if not hf_token:
            f.write("❌ HF_TOKEN not found in environment\n")
            return

        f.write(f"🔑 Token Found: {hf_token[:4]}...{hf_token[-4:]} (len={len(hf_token)})\n")

        # -------------------------------------------------
        # STEP 1: TOKEN VALIDATION
        # -------------------------------------------------
        f.write("\nSTEP 1: Token Validation\n")

        resp = requests.get(
            "https://huggingface.co/api/whoami-v2",
            headers={"Authorization": f"Bearer {hf_token}"}
        )

        if resp.status_code != 200:
            f.write(f"❌ Token invalid ({resp.status_code})\n")
            f.write(resp.text + "\n")
            return

        f.write(f"✅ Token valid. User: {resp.json().get('name')}\n")

        # -------------------------------------------------
        # STEP 2: RAW HF ROUTER CHAT COMPLETION
        # -------------------------------------------------
        f.write("\nSTEP 2: Raw HF Router Chat Completion\n")

        payload = {
            "model": MODEL_ID,
            "messages": [
                {"role": "user", "content": "What is the capital of France?"}
            ],
            "max_tokens": 20,
            "temperature": 0.1
        }

        resp = requests.post(
            f"{HF_ROUTER_BASE}/chat/completions",
            headers={
                "Authorization": f"Bearer {hf_token}",
                "Content-Type": "application/json"
            },
            json=payload,
            timeout=30
        )

        if resp.status_code != 200:
            f.write(f"❌ Raw call failed ({resp.status_code})\n")
            f.write(resp.text + "\n")
            return

        result = resp.json()
        answer = result["choices"][0]["message"]["content"]
        f.write(f"✅ Raw call success. Response: {answer}\n")

        # -------------------------------------------------
        # STEP 3: LANGCHAIN VERIFICATION
        # -------------------------------------------------
        f.write("\nSTEP 3: LangChain Integration\n")

        try:
            from langchain_openai import ChatOpenAI
            from langchain_core.messages import HumanMessage

            llm = ChatOpenAI(
                model=MODEL_ID,
                openai_api_key=hf_token,
                base_url=HF_ROUTER_BASE,
                temperature=0.1
            )

            response = llm.invoke([
                HumanMessage(content="What is the capital of France?")
            ])

            f.write(f"✅ LangChain success. Response: {response.content}\n")
            f.write("\n🎉 ALL CHECKS PASSED — QWEN 0.5B READY FOR USE\n")

        except Exception as e:
            f.write(f"❌ LangChain failure: {str(e)}\n")


if __name__ == "__main__":
    test_qwen()
