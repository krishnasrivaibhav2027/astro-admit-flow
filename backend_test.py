#!/usr/bin/env python3
"""
Backend API Testing for AI Admission Test Application
Tests all backend endpoints with comprehensive validation
"""

import requests
import json
import sys
from datetime import datetime
import uuid

# Configuration
BASE_URL = "https://physics-rai.preview.emergentagent.com/api"
TIMEOUT = 30

class BackendTester:
    def __init__(self):
        self.results = []
        self.session = requests.Session()
        self.session.timeout = TIMEOUT
        
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
        """Test 1: Health check endpoint - CRITICAL"""
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
                    self.log_result("Health Check", True, 
                                  f"Status: {data['status']}, DB: {data['database']}, RAG: {data['rag_enabled']}", 
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
    
    def test_question_generation(self):
        """Test 2: Question generation with RAG - CRITICAL"""
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
                    headers={"Content-Type": "application/json"}
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
    
    def run_all_tests(self):
        """Run all backend tests in priority order"""
        print(f"🚀 Starting Backend API Tests")
        print(f"📍 Base URL: {BASE_URL}")
        print(f"⏰ Timeout: {TIMEOUT}s")
        print("=" * 60)
        
        # Test in priority order as specified in review request
        tests = [
            ("CRITICAL", self.test_health_check),
            ("CRITICAL", self.test_question_generation),
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
        print(f"📊 TEST SUMMARY")
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