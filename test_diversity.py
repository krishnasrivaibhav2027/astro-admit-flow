#!/usr/bin/env python3
"""
Test Question Generation Diversity System
"""

import requests
import json
import time

# Configuration
BASE_URL = "https://admitest-pro.preview.emergentagent.com/api"
FIREBASE_TOKEN = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjlkMjEzMGZlZjAyNTg3ZmQ4ODYxODg2OTgyMjczNGVmNzZhMTExNjUiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vYWktYWRtaXNzaW9uLTI2YzI3IiwiYXVkIjoiYWktYWRtaXNzaW9uLTI2YzI3IiwiYXV0aF90aW1lIjoxNzYxMDcxNjc4LCJ1c2VyX2lkIjoiUU1maDNhSnJBVldJNXhpUzZQcWJsN3A1UUFlMiIsInN1YiI6IlFNZmgzYUpyQVZXSTV4aVM2UHFibDdwNVFBZTIiLCJpYXQiOjE3NjEwNzE2NzgsImV4cCI6MTc2MTA3NTI3OCwiZW1haWwiOiJ0ZXN0dXNlckBleGFtcGxlLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6eyJlbWFpbCI6WyJ0ZXN0dXNlckBleGFtcGxlLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6InBhc3N3b3JkIn19.S_POlzZIlfi_je42wMK-vkSrWHq87eG4iY2vY7pomP1VFPqjg94DFFSfRE9daWVo8raR8UarTmU30Wj6AG83dABjA7uUu3euwjsOAMhphSGM-t8qb04mRjeLK9IQ_COz4a229W-g51FFgollW4ZaHbwNBoBE4BgxTKeyvMyGjkLxknGyy7h9lWq_pAeBtYyJXG0Ax3yQJ2hyb3MMLQgU8UMH4xfS0cwdOaS7UG5GjegsNKpvzRJAr8uc3CA54tWtaXcWfQw3SbSzUJf0q8jM5RHZqzSpD6utI8hkNwQ1nQ1_UBNwkikNC5noJuTqNuJ8dvlgG4Z6z2d20t9d8pZNaQ"

def test_question_diversity():
    """Test question generation diversity"""
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {FIREBASE_TOKEN}"
    }
    
    request_data = {"level": "easy", "num_questions": 5}
    
    print("🔍 Testing Question Generation Diversity System")
    print("=" * 60)
    
    # Test 1: First attempt
    print("\n📝 Test 1: Generate Easy Questions - First Attempt")
    try:
        response1 = requests.post(f"{BASE_URL}/generate-questions", json=request_data, headers=headers)
        
        if response1.status_code == 200:
            data1 = response1.json()
            questions1 = data1["questions"]
            
            print(f"✅ SUCCESS: Generated {len(questions1)} questions")
            print("📋 First Attempt Questions:")
            for i, q in enumerate(questions1, 1):
                print(f"   {i}. {q['question'][:80]}...")
            
            # Test 2: Second attempt immediately
            print(f"\n📝 Test 2: Generate Easy Questions - Second Attempt (Immediately After)")
            
            response2 = requests.post(f"{BASE_URL}/generate-questions", json=request_data, headers=headers)
            
            if response2.status_code == 200:
                data2 = response2.json()
                questions2 = data2["questions"]
                
                print(f"✅ SUCCESS: Generated {len(questions2)} questions")
                print("📋 Second Attempt Questions:")
                for i, q in enumerate(questions2, 1):
                    print(f"   {i}. {q['question'][:80]}...")
                
                # Analyze diversity
                print(f"\n🔍 Diversity Analysis:")
                first_questions = [q["question"] for q in questions1]
                second_questions = [q["question"] for q in questions2]
                
                identical_questions = []
                for q1 in first_questions:
                    for q2 in second_questions:
                        if q1 == q2:
                            identical_questions.append(q1)
                
                unique_questions = len(set(first_questions + second_questions))
                total_questions = len(first_questions) + len(second_questions)
                diversity_percentage = (unique_questions / total_questions) * 100
                
                print(f"   📊 Total questions generated: {total_questions}")
                print(f"   📊 Unique questions: {unique_questions}")
                print(f"   📊 Identical questions: {len(identical_questions)}")
                print(f"   📊 Diversity percentage: {diversity_percentage:.1f}%")
                
                if len(identical_questions) == 0:
                    print(f"   ✅ EXCELLENT: 100% unique questions - diversity system working perfectly!")
                elif len(identical_questions) <= 1:
                    print(f"   ✅ GOOD: High diversity with only {len(identical_questions)} identical question(s)")
                else:
                    print(f"   ❌ POOR: Low diversity with {len(identical_questions)} identical questions")
                
                return len(identical_questions) <= 1
                
            else:
                print(f"❌ FAILED: Second attempt failed with status {response2.status_code}")
                print(f"   Response: {response2.text}")
                return False
        else:
            print(f"❌ FAILED: First attempt failed with status {response1.status_code}")
            print(f"   Response: {response1.text}")
            return False
            
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")
        return False

def test_health_check():
    """Test basic health check"""
    print("\n🏥 Test 4: Basic Health Check")
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ SUCCESS: {data}")
            return True
        else:
            print(f"❌ FAILED: Status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")
        return False

if __name__ == "__main__":
    print("🚀 Question Generation Diversity Testing")
    
    # Run tests
    health_ok = test_health_check()
    diversity_ok = test_question_diversity()
    
    print("\n" + "=" * 60)
    print("📊 FINAL RESULTS:")
    print(f"   Health Check: {'✅ PASS' if health_ok else '❌ FAIL'}")
    print(f"   Diversity Test: {'✅ PASS' if diversity_ok else '❌ FAIL'}")
    
    if health_ok and diversity_ok:
        print("\n🎉 ALL TESTS PASSED - Question diversity system is working correctly!")
    else:
        print("\n⚠️  SOME TESTS FAILED - Review the results above")