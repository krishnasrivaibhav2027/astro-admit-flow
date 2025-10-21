#!/usr/bin/env python3
"""
Directly fix the stuck result in database
"""
import os
from supabase import create_client, Client
from datetime import datetime

# Supabase configuration
supabase_url = os.environ.get('SUPABASE_URL', 'https://uminpkhjsrfogjtwqqfn.supabase.co')
supabase_key = os.environ.get('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_FsA783cALnkTbAKh3bdf_g_trlucKFj')

supabase: Client = create_client(supabase_url, supabase_key)

result_id = "5d38b727-cfa9-4e12-970d-8a6b027df1ea"

print(f"🔧 Fixing result: {result_id}")

# Update the result directly
response = supabase.table("results").update({
    "score": 8.08,
    "result": "pass",
    "concession": 0,
    "updated_at": datetime.utcnow().isoformat()
}).eq("id", result_id).execute()

print(f"✅ Result fixed!")
print(f"   Score: 8.08/10")
print(f"   Result: pass")

# Verify
check = supabase.table("results").select("*").eq("id", result_id).single().execute()
print(f"\n📊 Verification:")
print(f"   Result: {check.data.get('result')}")
print(f"   Score: {check.data.get('score')}/10")
