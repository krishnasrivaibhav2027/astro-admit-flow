import os
import requests
import sys
from dotenv import load_dotenv

# Load env vars
load_dotenv()

def verify_token():
    print("🔍 Diagnostic: Verifying HuggingFace Token...")
    
    hf_token = os.getenv("HF_TOKEN")
    if not hf_token:
        print("❌ CRITICAL: HF_TOKEN is MISSING from environment.")
        return False
        
    print(f"🔑 Token Found: {hf_token[:4]}...{hf_token[-4:]} (Length: {len(hf_token)})")
    
    # 1. Check WhoAmI (Basic Auth Check)
    print("\n1. Checking Basic Authentication (WhoAmI)...")
    try:
        resp = requests.get(
            "https://huggingface.co/api/whoami-v2", 
            headers={"Authorization": f"Bearer {hf_token}"}
        )
        
        if resp.status_code == 200:
            data = resp.json()
            user = data.get('name', 'Unknown')
            print(f"✅ SUCCESS: Token is valid for user '{user}'")
            print(f"   Scopes: {data.get('auth', {}).get('accessToken', {}).get('role', 'Unknown role')}")
            
            # 2. Check Use in Router (Model Access)
            print("\n2. Checking Router Access (Qwen/Qwen2.5-0.5B-Instruct)...")
            router_url = "https://router.huggingface.co/v1/chat/completions"
            payload = {
                "model": "Qwen/Qwen2.5-0.5B-Instruct",
                "messages": [{"role": "user", "content": "Hi"}],
                "max_tokens": 10
            }
            
            resp2 = requests.post(
                router_url,
                headers={
                    "Authorization": f"Bearer {hf_token}",
                    "Content-Type": "application/json"
                },
                json=payload
            )
            
            if resp2.status_code == 200:
                 print("✅ SUCCESS: Router API is accessible and working!")
                 return True
            else:
                 print(f"❌ FAILURE: Router API returned {resp2.status_code}")
                 print(f"   Response: {resp2.text}")
                 return False

        elif resp.status_code == 401:
            print("❌ FAILURE: Token is INVALID (401 Unauthorized).")
            print("   Please generate a new 'Inference' token at: https://huggingface.co/settings/tokens")
            return False
        else:
            print(f"⚠️ WARNING: Unexpected status {resp.status_code}")
            print(f"   Response: {resp.text}")
            return False
            
    except Exception as e:
        print(f"❌ EXCEPTION: {e}")
        return False

if __name__ == "__main__":
    verify_token()
