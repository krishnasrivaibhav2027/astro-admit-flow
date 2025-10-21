#!/usr/bin/env python3
"""
Fix the pending result by manually triggering evaluation
"""
import os
import requests
from supabase import create_client, Client

# Supabase configuration
supabase_url = os.environ.get('SUPABASE_URL', 'https://uminpkhjsrfogjtwqqfn.supabase.co')
supabase_key = os.environ.get('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_FsA783cALnkTbAKh3bdf_g_trlucKFj')

supabase: Client = create_client(supabase_url, supabase_key)

# Get the pending result
response = supabase.table("results").select("*").eq("result", "pending").order("created_at", desc=True).limit(1).execute()

if response.data:
    result = response.data[0]
    result_id = result['id']
    student_id = result['student_id']
    
    print(f"📋 Found pending result:")
    print(f"   Result ID: {result_id}")
    print(f"   Student ID: {student_id}")
    print(f"   Level: {result['level']}")
    
    # Check if there are any questions/answers for this result
    questions = supabase.table("questions").select("*").eq("result_id", result_id).execute()
    
    if questions.data:
        print(f"\n✅ Found {len(questions.data)} questions for this result")
        
        # Check if there are student answers
        for q in questions.data:
            answers = supabase.table("student_answers").select("*").eq("question_id", q['id']).execute()
            if answers.data:
                print(f"   Question {q['id'][:8]}... has answer: {answers.data[0].get('student_answer',  '')[:50]}...")
        
        print(f"\n🔧 This result needs to be evaluated!")
        print(f"   The frontend should have called /api/evaluate-answers")
        print(f"   But the result is still 'pending'")
        print(f"\nPossible issues:")
        print(f"   1. Evaluation endpoint failed silently")
        print(f"   2. Database update failed")
        print(f"   3. Frontend didn't wait for evaluation to complete")
        
    else:
        print(f"\n❌ No questions found for this result!")
        print(f"   This means the test was never properly set up")
else:
    print("✅ No pending results found")
