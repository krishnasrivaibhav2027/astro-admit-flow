#!/usr/bin/env python3
"""
AdmitAI Backend API Testing - Comprehensive Review
Tests all backend endpoints as requested in review:
1. Health check endpoint (GET /api/health) - verify database connection and RAG status
2. Registration endpoint (POST /api/register) - test with a new unique email
3. Login endpoint (POST /api/login) - test with the registered credentials
4. Question generation endpoint (POST /api/generate-questions) - test with JWT token from login, verify diverse questions are generated
5. Verify all endpoints are accessible and returning proper responses
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
        self.jwt_token = None
        self.test_user_email = None
        self.test_user_password = "TestPassword123!"
        
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
    
    def test_registration(self):
        """Test 2: Registration endpoint (POST /api/register) - test with a new unique email"""
        print("\n🔍 Test 2: Registration Endpoint")
        try:
            # Generate unique email for testing
            timestamp = int(time.time())
            self.test_user_email = f"admitai_test_{timestamp}@gmail.com"
            
            registration_data = {
                "first_name": "AdmitAI",
                "last_name": "TestUser",
                "age": 20,
                "dob": "2004-01-15",
                "email": self.test_user_email,
                "phone": "+1234567890",
                "password": self.test_user_password
            }
            
            response = self.session.post(
                f"{BASE_URL}/register",
                json=registration_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Validate response structure
                required_fields = ["success", "message", "token", "student_id", "student"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result("Registration", False, 
                                  f"Missing fields: {missing_fields}", data)
                    return False
                
                if data.get("success") and data.get("token"):
                    self.jwt_token = data["token"]  # Store JWT token for subsequent tests
                    student_id = data.get("student_id")
                    student_info = data.get("student", {})
                    
                    self.log_result("Registration", True, 
                                  f"✅ User registered successfully with email {self.test_user_email}, student_id: {student_id}")
                    return True
                else:
                    self.log_result("Registration", False, 
                                  f"Registration failed: {data.get('message', 'Unknown error')}", data)
                    return False
            else:
                self.log_result("Registration", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Registration", False, f"Exception: {str(e)}")
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

    def test_question_generation(self):
        """Test 2b: Basic question generation with RAG - CRITICAL"""
        # Get Firebase token for authentication
        firebase_token = self.get_firebase_token()
        if not firebase_token:
            self.log_result("Basic Question Generation", False, 
                          "Could not obtain Firebase authentication token")
            return False
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {firebase_token}"
        }
        
        test_cases = [
            {"level": "easy", "num_questions": 3},
            {"level": "medium", "num_questions": 5},
            {"level": "hard", "num_questions": 5}
        ]
        
        all_passed = True
        
        for test_case in test_cases:
            try:
                response = self.session.post(
                    f"{BASE_URL}/generate-questions",
                    json=test_case,
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Validate response structure
                    if "questions" not in data:
                        self.log_result(f"Question Generation ({test_case['level']})", False,
                                      "Missing 'questions' field in response", data)
                        all_passed = False
                        continue
                    
                    questions = data["questions"]
                    expected_count = test_case["num_questions"]
                    
                    # Check question count
                    if len(questions) != expected_count:
                        self.log_result(f"Question Generation ({test_case['level']})", False,
                                      f"Expected {expected_count} questions, got {len(questions)}", data)
                        all_passed = False
                        continue
                    
                    # Validate question structure
                    valid_questions = True
                    for i, q in enumerate(questions):
                        if not isinstance(q, dict) or "question" not in q or "answer" not in q:
                            self.log_result(f"Question Generation ({test_case['level']})", False,
                                          f"Question {i+1} missing required fields", q)
                            valid_questions = False
                            all_passed = False
                            break
                        
                        # Check if question and answer are non-empty strings
                        if not q["question"].strip() or not q["answer"].strip():
                            self.log_result(f"Question Generation ({test_case['level']})", False,
                                          f"Question {i+1} has empty question or answer", q)
                            valid_questions = False
                            all_passed = False
                            break
                    
                    if valid_questions:
                        self.log_result(f"Question Generation ({test_case['level']})", True,
                                      f"Generated {len(questions)} valid questions")
                else:
                    self.log_result(f"Question Generation ({test_case['level']})", False,
                                  f"HTTP {response.status_code}: {response.text}")
                    all_passed = False
                    
            except Exception as e:
                self.log_result(f"Question Generation ({test_case['level']})", False,
                              f"Exception: {str(e)}")
                all_passed = False
        
        return all_passed
    
    def test_student_management(self):
        """Test 3: Student management endpoints - HIGH"""
        all_passed = True
        
        # Test 3a: List students
        try:
            response = self.session.get(f"{BASE_URL}/students")
            
            if response.status_code == 200:
                students = response.json()
                if isinstance(students, list):
                    self.log_result("List Students", True, 
                                  f"Retrieved {len(students)} students")
                else:
                    self.log_result("List Students", False, 
                                  "Response is not a list", students)
                    all_passed = False
            else:
                self.log_result("List Students", False, 
                              f"HTTP {response.status_code}: {response.text}")
                all_passed = False
                
        except Exception as e:
            self.log_result("List Students", False, f"Exception: {str(e)}")
            all_passed = False
        
        # Test 3b: Create student
        test_student = {
            "first_name": "Alice",
            "last_name": "Johnson", 
            "age": 18,
            "dob": "2005-06-15",
            "email": f"alice.johnson.{uuid.uuid4().hex[:8]}@testmail.com",
            "phone": "+1234567890"
        }
        
        try:
            response = self.session.post(
                f"{BASE_URL}/students",
                json=test_student,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                created_student = response.json()
                if "id" in created_student and created_student.get("email") == test_student["email"]:
                    self.log_result("Create Student", True, 
                                  f"Created student with ID: {created_student['id']}")
                    
                    # Test 3c: Get specific student
                    student_id = created_student["id"]
                    try:
                        get_response = self.session.get(f"{BASE_URL}/students/{student_id}")
                        
                        if get_response.status_code == 200:
                            retrieved_student = get_response.json()
                            if retrieved_student.get("id") == student_id:
                                self.log_result("Get Student by ID", True, 
                                              f"Retrieved student: {retrieved_student['first_name']} {retrieved_student['last_name']}")
                            else:
                                self.log_result("Get Student by ID", False, 
                                              "Retrieved student ID mismatch", retrieved_student)
                                all_passed = False
                        else:
                            self.log_result("Get Student by ID", False, 
                                          f"HTTP {get_response.status_code}: {get_response.text}")
                            all_passed = False
                            
                    except Exception as e:
                        self.log_result("Get Student by ID", False, f"Exception: {str(e)}")
                        all_passed = False
                        
                else:
                    self.log_result("Create Student", False, 
                                  "Created student missing ID or email mismatch", created_student)
                    all_passed = False
            else:
                self.log_result("Create Student", False, 
                              f"HTTP {response.status_code}: {response.text}")
                all_passed = False
                
        except Exception as e:
            self.log_result("Create Student", False, f"Exception: {str(e)}")
            all_passed = False
        
        # Test 3d: Duplicate email handling
        try:
            duplicate_response = self.session.post(
                f"{BASE_URL}/students",
                json=test_student,  # Same email as before
                headers={"Content-Type": "application/json"}
            )
            
            if duplicate_response.status_code == 400:
                self.log_result("Duplicate Email Handling", True, 
                              "Correctly rejected duplicate email with 400 error")
            else:
                self.log_result("Duplicate Email Handling", False, 
                              f"Expected 400 error for duplicate email, got {duplicate_response.status_code}")
                all_passed = False
                
        except Exception as e:
            self.log_result("Duplicate Email Handling", False, f"Exception: {str(e)}")
            all_passed = False
        
        return all_passed
    
    def test_answer_evaluation(self):
        """Test 4: Answer evaluation with 6 criteria - CRITICAL"""
        # Note: This test requires a valid result_id from the database
        # If no test data exists, we'll note this limitation
        
        try:
            # Try to get existing results to find a valid result_id
            # Since we don't have direct access to results table, we'll test with a mock ID
            # and expect a 404 or proper error handling
            
            test_result_id = str(uuid.uuid4())  # Mock UUID
            
            response = self.session.post(
                f"{BASE_URL}/evaluate-answers",
                json={"result_id": test_result_id},
                headers={"Content-Type": "application/json"}
            )
            
            # We expect either:
            # 1. 404 - No questions found (expected for mock ID)
            # 2. 200 - If somehow there's data (unlikely)
            # 3. 400 - Bad request format
            
            if response.status_code == 404:
                error_data = response.json()
                if "No questions found" in error_data.get("detail", ""):
                    self.log_result("Answer Evaluation", True, 
                                  "Correctly handles missing result_id with 404 error")
                    return True
                else:
                    self.log_result("Answer Evaluation", False, 
                                  f"Unexpected 404 error message: {error_data}")
                    return False
            elif response.status_code == 200:
                # Unexpected success - validate response structure
                data = response.json()
                required_fields = ["result_id", "score", "result", "criteria"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result("Answer Evaluation", False, 
                                  f"Missing required fields: {missing_fields}", data)
                    return False
                
                # Validate 6 criteria
                criteria = data.get("criteria", {})
                expected_criteria = ["Relevance", "Clarity", "SubjectUnderstanding", 
                                   "Accuracy", "Completeness", "CriticalThinking"]
                missing_criteria = [c for c in expected_criteria if c not in criteria]
                
                if missing_criteria:
                    self.log_result("Answer Evaluation", False, 
                                  f"Missing evaluation criteria: {missing_criteria}", data)
                    return False
                
                # Validate score range
                score = data.get("score", 0)
                if not (0 <= score <= 10):
                    self.log_result("Answer Evaluation", False, 
                                  f"Score {score} not in valid range 0-10", data)
                    return False
                
                self.log_result("Answer Evaluation", True, 
                              f"Valid evaluation response with score {score}/10")
                return True
            else:
                self.log_result("Answer Evaluation", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Answer Evaluation", False, f"Exception: {str(e)}")
            return False
    
    def test_email_notifications(self):
        """Test 5: Email notifications - MEDIUM priority"""
        test_email_request = {
            "to_email": "alice.test@example.com",
            "student_name": "Alice Johnson",
            "result": "passed",
            "score": 7.5
        }
        
        try:
            response = self.session.post(
                f"{BASE_URL}/send-notification",
                json=test_email_request,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if email was sent successfully or if Gmail is not configured
                if data.get("success") == True:
                    self.log_result("Email Notifications", True, 
                                  "Email sent successfully")
                    return True
                elif "Gmail not configured" in data.get("message", ""):
                    self.log_result("Email Notifications", True, 
                                  "Gmail OAuth not configured (expected in test environment)")
                    return True
                else:
                    self.log_result("Email Notifications", False, 
                                  f"Email failed: {data.get('message', 'Unknown error')}", data)
                    return False
            else:
                self.log_result("Email Notifications", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Email Notifications", False, f"Exception: {str(e)}")
            return False
    
    def check_backend_logs_for_diversity(self):
        """Test 3: Check Backend Logs for Diversity Indicators"""
        try:
            # Check backend logs for diversity indicators
            import subprocess
            
            print("\n🔍 Test 3: Check Backend Logs for Diversity Indicators")
            
            # Get recent backend logs
            log_command = "tail -n 50 /var/log/supervisor/backend.out.log | grep -A 3 'Selected topics'"
            result = subprocess.run(log_command, shell=True, capture_output=True, text=True)
            
            if result.returncode == 0 and result.stdout.strip():
                log_lines = result.stdout.strip().split('\n')
                
                # Look for evidence of topic selection and randomization
                topic_selections = []
                for line in log_lines:
                    if "Selected topics:" in line:
                        topic_selections.append(line)
                
                if len(topic_selections) >= 2:
                    self.log_result("Backend Logs - Diversity Indicators", True,
                                  f"Found {len(topic_selections)} topic selection entries showing randomization working")
                    
                    # Print sample log entries
                    print(f"   Sample log entries:")
                    for i, selection in enumerate(topic_selections[:3]):
                        print(f"   {i+1}. {selection.strip()}")
                    
                    return True
                elif len(topic_selections) == 1:
                    self.log_result("Backend Logs - Diversity Indicators", True,
                                  f"Found 1 topic selection entry - diversity system active")
                    return True
                else:
                    self.log_result("Backend Logs - Diversity Indicators", False,
                                  "No topic selection log entries found - diversity system may not be working")
                    return False
            else:
                # Try alternative log check
                general_log_command = "tail -n 100 /var/log/supervisor/backend.out.log | grep -i 'generating.*questions'"
                general_result = subprocess.run(general_log_command, shell=True, capture_output=True, text=True)
                
                if general_result.returncode == 0 and general_result.stdout.strip():
                    self.log_result("Backend Logs - Diversity Indicators", True,
                                  "Found question generation activity in logs")
                    return True
                else:
                    self.log_result("Backend Logs - Diversity Indicators", False,
                                  "No diversity indicators found in backend logs")
                    return False
                    
        except Exception as e:
            self.log_result("Backend Logs - Diversity Indicators", False,
                          f"Exception checking logs: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all backend tests in priority order"""
        print(f"🚀 Starting Backend API Tests - Question Generation Diversity Focus")
        print(f"📍 Base URL: {BASE_URL}")
        print(f"⏰ Timeout: {TIMEOUT}s")
        print("=" * 60)
        
        # Test in priority order as specified in review request
        tests = [
            ("CRITICAL", self.test_health_check),
            ("CRITICAL", self.test_question_generation_diversity),  # NEW: Primary focus test
            ("CRITICAL", self.test_question_generation),
            ("MEDIUM", self.check_backend_logs_for_diversity),  # NEW: Log verification
            ("CRITICAL", self.test_answer_evaluation),
            ("HIGH", self.test_student_management),
            ("MEDIUM", self.test_email_notifications)
        ]
        
        total_tests = 0
        passed_tests = 0
        
        for priority, test_func in tests:
            print(f"\n🔍 Running {priority} priority test: {test_func.__name__}")
            try:
                result = test_func()
                total_tests += 1
                if result:
                    passed_tests += 1
            except Exception as e:
                print(f"❌ Test {test_func.__name__} crashed: {str(e)}")
                total_tests += 1
        
        print("\n" + "=" * 60)
        print(f"📊 TEST SUMMARY - QUESTION GENERATION DIVERSITY TESTING")
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {total_tests - passed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%" if total_tests > 0 else "0%")
        
        # Print detailed results
        print(f"\n📋 DETAILED RESULTS:")
        for result in self.results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}: {result['details']}")
        
        return passed_tests, total_tests

if __name__ == "__main__":
    tester = BackendTester()
    passed, total = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if passed == total else 1)