#!/usr/bin/env python3
"""
Quick script to check student results in database
"""
import os
from supabase import create_client, Client

# Supabase configuration
supabase_url = os.environ.get('SUPABASE_URL', 'https://uminpkhjsrfogjtwqqfn.supabase.co')
supabase_key = os.environ.get('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_FsA783cALnkTbAKh3bdf_g_trlucKFj')

supabase: Client = create_client(supabase_url, supabase_key)

def check_recent_results():
    """Check most recent test results"""
    try:
        # Get all results ordered by most recent
        response = supabase.table("results").select("*").order("created_at", desc=True).limit(5).execute()
        
        print("📊 Most Recent Test Results:")
        print("=" * 80)
        
        for result in response.data:
            print(f"\n🆔 Result ID: {result.get('id')}")
            print(f"👤 Student ID: {result.get('student_id')}")
            print(f"📝 Level: {result.get('level')}")
            print(f"✅ Result: {result.get('result')}")
            print(f"🎯 Score: {result.get('score')}/10")
            print(f"🔢 Attempts - Easy: {result.get('attempts_easy')}, Medium: {result.get('attempts_medium')}, Hard: {result.get('attempts_hard')}")
            print(f"⏰ Created: {result.get('created_at')}")
            print("-" * 80)
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    check_recent_results()
