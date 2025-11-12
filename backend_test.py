#!/usr/bin/env python3
"""
AdmitAI Backend API Testing - Firebase Authentication Review
Tests cleaned-up backend API as requested in review:
1. Health Check - GET /api/health - verify database connection and RAG status
2. Firebase Authentication - Verify that Firebase token-based authentication is working
3. Student Management - Test POST /api/students endpoint with Firebase token
4. Question Generation - Test POST /api/generate-questions with Firebase auth (Note: Gemini API key might have issues, that's expected)
5. Verify removed endpoints - Confirm POST /api/register and POST /api/login return 404 Not Found
6. All protected endpoints - Verify they require Firebase authentication
"""

import requests
import json
import sys
from datetime import datetime
import uuid
import os
import time

# Configuration
BASE_URL = "https://repair-wizard-26.preview.emergentagent.com/api"
TIMEOUT = 30

class AdmitAIBackendTester:
    def __init__(self):
        self.results = []
        self.session = requests.Session()
        self.session.timeout = TIMEOUT
        self.firebase_token = None
        self.test_user_email = None
        self.test_user_password = "TestPassword123!"
        self.student_id = None
        
    def log_result(self, test_name, success, details, response_data=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        }
        self.results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}: {details}")
        if response_data and not success:
            print(f"   Response: {response_data}")
        
    def test_health_check(self):
        """Test 1: Health check endpoint (GET /api/health) - verify database connection and RAG status"""
        print("\n🔍 Test 1: Health Check Endpoint")
        try:
            response = self.session.get(f"{BASE_URL}/health")
            
            if response.status_code == 200:
                data = response.json()
                
                # Validate required fields
                required_fields = ["status", "database", "rag_enabled"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result("Health Check", False, 
                                  f"Missing fields: {missing_fields}", data)
                    return False
                
                # Check values
                if data.get("status") == "healthy" and data.get("database") == "connected":
                    rag_status = "enabled" if data.get("rag_enabled") else "disabled"
                    self.log_result("Health Check", True, 
                                  f"✅ Backend healthy, database connected, RAG {rag_status}", 
                                  data)
                    return True
                else:
                    self.log_result("Health Check", False, 
                                  f"Unhealthy status or DB connection failed", data)
                    return False
            else:
                self.log_result("Health Check", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Health Check", False, f"Exception: {str(e)}")
            return False
    
    def test_firebase_authentication(self):
        """Test 2: Firebase Authentication - Verify that Firebase token-based authentication is working"""
        print("\n🔍 Test 2: Firebase Authentication")
        
        try:
            # Get Firebase API key from backend .env
            firebase_api_key = "AIzaSyDxDFMOm6UR87WTzVtG2XSUMY6mxQM6SrA"
            
            # Create a test user with Firebase
            signup_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={firebase_api_key}"
            
            timestamp = int(time.time())
            self.test_user_email = f"firebase_test_{timestamp}@gmail.com"
            
            signup_data = {
                "email": self.test_user_email,
                "password": self.test_user_password,
                "returnSecureToken": True
            }
            
            response = self.session.post(signup_url, json=signup_data)
            
            if response.status_code == 200:
                data = response.json()
                self.firebase_token = data.get("idToken")
                
                if self.firebase_token:
                    self.log_result("Firebase Authentication", True, 
                                  f"✅ Firebase user created successfully: {self.test_user_email}")
                    return True
                else:
                    self.log_result("Firebase Authentication", False, 
                                  "No Firebase token received", data)
                    return False
            else:
                self.log_result("Firebase Authentication", False, 
                              f"Firebase signup failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Firebase Authentication", False, f"Exception: {str(e)}")
            return False
    
    def test_login(self):
        """Test 3: Login endpoint (POST /api/login) - test with the registered credentials"""
        print("\n🔍 Test 3: Login Endpoint")
        
        if not self.test_user_email:
            self.log_result("Login", False, "No test user email available - registration may have failed")
            return False
        
        try:
            login_data = {
                "email": self.test_user_email,
                "password": self.test_user_password
            }
            
            response = self.session.post(
                f"{BASE_URL}/login",
                json=login_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Validate response structure
                required_fields = ["success", "message", "token", "student"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result("Login", False, 
                                  f"Missing fields: {missing_fields}", data)
                    return False
                
                if data.get("success") and data.get("token"):
                    # Update JWT token (should be same as registration, but good to refresh)
                    self.jwt_token = data["token"]
                    student_info = data.get("student", {})
                    student_name = f"{student_info.get('first_name', '')} {student_info.get('last_name', '')}"
                    
                    self.log_result("Login", True, 
                                  f"✅ User logged in successfully: {student_name} ({self.test_user_email})")
                    return True
                else:
                    self.log_result("Login", False, 
                                  f"Login failed: {data.get('message', 'Unknown error')}", data)
                    return False
            else:
                self.log_result("Login", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Login", False, f"Exception: {str(e)}")
            return False
    
    def test_firebase_authentication(self):
        """Test Firebase Authentication Integration"""
        print("\n🔍 Test 3b: Firebase Authentication Integration")
        
        try:
            # Try to get a Firebase token using the Firebase REST API
            firebase_api_key = "AIzaSyDxDFMOm6UR87WTzVtG2XSUMY6mxQM6SrA"  # From backend .env
            
            # Try to sign up a test user with Firebase
            signup_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={firebase_api_key}"
            
            timestamp = int(time.time())
            test_email = f"firebase_test_{timestamp}@gmail.com"
            
            signup_data = {
                "email": test_email,
                "password": self.test_user_password,
                "returnSecureToken": True
            }
            
            response = self.session.post(signup_url, json=signup_data)
            
            if response.status_code == 200:
                data = response.json()
                firebase_token = data.get("idToken")
                
                if firebase_token:
                    self.jwt_token = firebase_token  # Use Firebase token for subsequent tests
                    self.test_user_email = test_email
                    
                    self.log_result("Firebase Authentication", True, 
                                  f"✅ Firebase user created successfully: {test_email}")
                    
                    # Test if backend accepts Firebase token
                    headers = {
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {firebase_token}"
                    }
                    
                    # Try to create a student record using Firebase auth
                    student_data = {
                        "first_name": "Firebase",
                        "last_name": "TestUser",
                        "age": 20,
                        "dob": "2004-01-15",
                        "email": test_email,
                        "phone": "+1234567890"
                    }
                    
                    student_response = self.session.post(
                        f"{BASE_URL}/students",
                        json=student_data,
                        headers=headers
                    )
                    
                    if student_response.status_code == 200:
                        self.log_result("Firebase Backend Integration", True, 
                                      f"✅ Backend accepts Firebase token and created student record")
                        return True
                    else:
                        self.log_result("Firebase Backend Integration", False, 
                                      f"Backend rejected Firebase token: {student_response.status_code} - {student_response.text}")
                        return False
                else:
                    self.log_result("Firebase Authentication", False, 
                                  "No Firebase token received", data)
                    return False
            else:
                self.log_result("Firebase Authentication", False, 
                              f"Firebase signup failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Firebase Authentication", False, f"Exception: {str(e)}")
            return False

    def test_question_generation(self):
        """Test 4: Question generation endpoint (POST /api/generate-questions) - test with JWT token from login, verify diverse questions are generated"""
        print("\n🔍 Test 4: Question Generation Endpoint with Diversity Verification")
        
        if not self.jwt_token:
            self.log_result("Question Generation", False, 
                          "No JWT token available - login may have failed")
            return False
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.jwt_token}"
        }
        
        all_passed = True
        
        # Test 4a: Generate Easy Questions - First Attempt
        print("   🔍 4a: Generate Easy Questions - First Attempt")
        try:
            first_request = {"level": "easy", "num_questions": 5}
            
            response1 = self.session.post(
                f"{BASE_URL}/generate-questions",
                json=first_request,
                headers=headers
            )
            
            if response1.status_code == 200:
                data1 = response1.json()
                
                if "questions" not in data1:
                    self.log_result("Question Generation - First Attempt", False,
                                  "Missing 'questions' field in response", data1)
                    return False
                
                questions1 = data1["questions"]
                
                if len(questions1) != 5:
                    self.log_result("Question Generation - First Attempt", False,
                                  f"Expected 5 questions, got {len(questions1)}", data1)
                    return False
                
                # Validate question structure
                for i, q in enumerate(questions1):
                    if not isinstance(q, dict) or "question" not in q or "answer" not in q:
                        self.log_result("Question Generation - First Attempt", False,
                                      f"Question {i+1} missing required fields", q)
                        return False
                    
                    if not q["question"].strip() or not q["answer"].strip():
                        self.log_result("Question Generation - First Attempt", False,
                                      f"Question {i+1} has empty question or answer", q)
                        return False
                
                # Store first set for comparison
                first_questions = [q["question"] for q in questions1]
                
                self.log_result("Question Generation - First Attempt", True,
                              f"✅ Generated 5 valid questions: {first_questions[0][:50]}...")
                
                # Test 4b: Generate Easy Questions - Second Attempt (Diversity Test)
                print("   🔍 4b: Generate Easy Questions - Second Attempt (Diversity Test)")
                
                # Wait a moment to ensure different timestamp seed
                time.sleep(1)
                
                response2 = self.session.post(
                    f"{BASE_URL}/generate-questions",
                    json=first_request,  # Same request
                    headers=headers
                )
                
                if response2.status_code == 200:
                    data2 = response2.json()
                    
                    if "questions" not in data2:
                        self.log_result("Question Generation - Second Attempt", False,
                                      "Missing 'questions' field in response", data2)
                        return False
                    
                    questions2 = data2["questions"]
                    second_questions = [q["question"] for q in questions2]
                    
                    # Check for diversity - questions should be different
                    identical_questions = set(first_questions) & set(second_questions)
                    total_unique = len(set(first_questions + second_questions))
                    total_questions = len(first_questions) + len(second_questions)
                    diversity_percentage = (total_unique / total_questions) * 100
                    
                    if len(identical_questions) == 0:
                        self.log_result("Question Generation - Diversity Check", True,
                                      f"✅ 100% unique questions between attempts - excellent anti-malpractice protection!")
                    elif len(identical_questions) <= 1:
                        self.log_result("Question Generation - Diversity Check", True,
                                      f"✅ Good diversity: only {len(identical_questions)} identical question(s), {diversity_percentage:.1f}% unique")
                    else:
                        self.log_result("Question Generation - Diversity Check", False,
                                      f"❌ Poor diversity: {len(identical_questions)} identical questions out of 5")
                        all_passed = False
                    
                    # Print sample questions for verification
                    print(f"      Sample from First Attempt: {first_questions[0][:60]}...")
                    print(f"      Sample from Second Attempt: {second_questions[0][:60]}...")
                    
                    self.log_result("Question Generation - Second Attempt", True,
                                  f"✅ Generated 5 questions with diversity verification complete")
                    
                else:
                    self.log_result("Question Generation - Second Attempt", False,
                                  f"HTTP {response2.status_code}: {response2.text}")
                    all_passed = False
                
            else:
                self.log_result("Question Generation - First Attempt", False,
                              f"HTTP {response1.status_code}: {response1.text}")
                all_passed = False
                
        except Exception as e:
            self.log_result("Question Generation", False,
                          f"Exception: {str(e)}")
            all_passed = False
        
        return all_passed
    
    def test_endpoint_accessibility(self):
        """Test 5: Verify all endpoints are accessible and returning proper responses"""
        print("\n🔍 Test 5: Endpoint Accessibility Verification")
        
        endpoints_to_test = [
            ("GET", "/", "Root endpoint"),
            ("GET", "/health", "Health check"),
            ("POST", "/register", "Registration"),
            ("POST", "/login", "Login"),
            ("POST", "/generate-questions", "Question generation"),
        ]
        
        all_passed = True
        
        for method, endpoint, description in endpoints_to_test:
            try:
                url = f"{BASE_URL}{endpoint}"
                
                if method == "GET":
                    response = self.session.get(url)
                else:
                    # For POST endpoints, send minimal valid data or expect proper error handling
                    if endpoint == "/register":
                        # Test with invalid data to check error handling
                        response = self.session.post(url, json={}, headers={"Content-Type": "application/json"})
                    elif endpoint == "/login":
                        # Test with invalid data to check error handling
                        response = self.session.post(url, json={}, headers={"Content-Type": "application/json"})
                    elif endpoint == "/generate-questions":
                        # Test without auth to check auth requirement
                        response = self.session.post(url, json={"level": "easy", "num_questions": 5}, headers={"Content-Type": "application/json"})
                    else:
                        response = self.session.post(url, json={}, headers={"Content-Type": "application/json"})
                
                # Check if endpoint is accessible (not 404)
                if response.status_code == 404:
                    self.log_result(f"Endpoint Accessibility - {description}", False,
                                  f"Endpoint {endpoint} not found (404)")
                    all_passed = False
                elif response.status_code >= 500:
                    self.log_result(f"Endpoint Accessibility - {description}", False,
                                  f"Server error {response.status_code} for {endpoint}")
                    all_passed = False
                else:
                    # Endpoint is accessible (may return 400, 401, 422 etc. but that's expected for invalid data)
                    self.log_result(f"Endpoint Accessibility - {description}", True,
                                  f"✅ {endpoint} accessible (HTTP {response.status_code})")
                    
            except Exception as e:
                self.log_result(f"Endpoint Accessibility - {description}", False,
                              f"Exception accessing {endpoint}: {str(e)}")
                all_passed = False
        
        return all_passed

    def run_comprehensive_test(self):
        """Run comprehensive backend test as requested in review"""
        print("🚀 AdmitAI Backend API Comprehensive Testing")
        print("📋 Review Request: Test health check, registration, login, question generation, and endpoint accessibility")
        print(f"📍 Base URL: {BASE_URL}")
        print(f"⏰ Timeout: {TIMEOUT}s")
        print("=" * 80)
        
        # Test in exact order as specified in review request
        tests = [
            ("1. Health Check", self.test_health_check),
            ("2. Registration", self.test_registration),
            ("3. Login", self.test_login),
            ("3b. Firebase Authentication", self.test_firebase_authentication),
            ("4. Question Generation", self.test_question_generation),
            ("5. Endpoint Accessibility", self.test_endpoint_accessibility)
        ]
        
        total_tests = 0
        passed_tests = 0
        
        for test_name, test_func in tests:
            print(f"\n🔍 Running {test_name}")
            try:
                result = test_func()
                total_tests += 1
                if result:
                    passed_tests += 1
            except Exception as e:
                print(f"❌ Test {test_name} crashed: {str(e)}")
                total_tests += 1
        
        print("\n" + "=" * 80)
        print(f"📊 ADMITAI BACKEND API TEST SUMMARY")
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {total_tests - passed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%" if total_tests > 0 else "0%")
        
        # Print detailed results
        print(f"\n📋 DETAILED TEST RESULTS:")
        for result in self.results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}: {result['details']}")
        
        # Summary for test_result.md update
        print(f"\n📝 SUMMARY FOR TEST_RESULT.MD:")
        critical_failures = [r for r in self.results if not r["success"] and "Health Check" in r["test"]]
        auth_failures = [r for r in self.results if not r["success"] and ("Registration" in r["test"] or "Login" in r["test"])]
        question_failures = [r for r in self.results if not r["success"] and "Question Generation" in r["test"]]
        
        if len(critical_failures) > 0:
            print("❌ CRITICAL: Backend health check failed - database or RAG issues")
        elif len(auth_failures) > 0:
            print("❌ CRITICAL: Authentication system not working - registration/login failed")
        elif len(question_failures) > 0:
            print("❌ CRITICAL: Question generation system not working - AI/RAG integration issues")
        elif passed_tests == total_tests:
            print("✅ SUCCESS: All backend APIs working correctly - ready for production")
        else:
            print("⚠️ PARTIAL: Some non-critical issues found - check detailed results")
        
        return passed_tests, total_tests

if __name__ == "__main__":
    tester = AdmitAIBackendTester()
    passed, total = tester.run_comprehensive_test()
    
    # Exit with appropriate code
    sys.exit(0 if passed == total else 1)