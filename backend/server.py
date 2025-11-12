from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime
import json
from supabase import create_client, Client
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate
from firebase_config import initialize_firebase, verify_firebase_token

# Import RAG module
try:
    from rag_module import get_physics_context
    RAG_ENABLED = True
except Exception as e:
    print(f"RAG not available: {e}")
    RAG_ENABLED = False
    def get_physics_context(query, k=3):
        return []

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Initialize Firebase Admin SDK
initialize_firebase()

# Initialize Supabase client
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_KEY')
supabase: Client = create_client(supabase_url, supabase_key)

# Initialize LangChain LLM
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0.7,
    api_key=os.environ.get('GEMINI_API_KEY')
)

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")


# ===== EVALUATION CRITERIA MODEL =====
class EvaluationCriteria(BaseModel):
    """6 evaluation criteria as per LangGraph requirements"""
    Relevance: float = Field(..., ge=1, le=10, description="How relevant is the answer to the question")
    Clarity: float = Field(..., ge=1, le=10, description="How clear and understandable is the answer")
    SubjectUnderstanding: float = Field(..., ge=1, le=10, description="Depth of physics understanding")
    Accuracy: float = Field(..., ge=1, le=10, description="Factual correctness")
    Completeness: float = Field(..., ge=1, le=10, description="How complete is the answer")
    CriticalThinking: float = Field(..., ge=1, le=10, description="Analytical and critical thinking")

    @property
    def average(self) -> float:
        scores = self.model_dump().values()
        return sum(scores) / len(scores)


# ===== REQUEST/RESPONSE MODELS =====
class StudentCreate(BaseModel):
    first_name: str
    last_name: str
    age: int
    dob: str
    email: str
    phone: str


class UpdatePhoneRequest(BaseModel):
    student_id: str
    phone: str


class GenerateQuestionsRequest(BaseModel):
    level: str
    num_questions: int = 5


class CreateResultRequest(BaseModel):
    student_id: str
    level: str
    attempts_easy: int = 0
    attempts_medium: int = 0
    attempts_hard: int = 0


class SaveQuestionsRequest(BaseModel):
    result_id: str
    questions: List[Dict[str, str]]


class EvaluateAnswersRequest(BaseModel):
    result_id: str


class NotificationEmailRequest(BaseModel):
    to_email: str
    student_name: str
    result: str
    score: float
    student_id: str
    level: str


class SendConfirmationEmailRequest(BaseModel):
    to_email: str
    student_name: str
    user_id: str


# ===== FIREBASE AUTHENTICATION =====
security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict:
    """Dependency to get current authenticated user from Firebase token"""
    token = credentials.credentials
    try:
        # Verify Firebase ID token
        decoded_token = verify_firebase_token(token)
        return decoded_token
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")


# ===== PROMPTS (LangGraph style) =====
generate_questions_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an expert Physics exam question generator. Use the provided context from NCERT Physics textbook. Return ONLY valid JSON."),
    ("human",
     "Context from physics textbook:\n{context}\n\n"
     "Generate {num_questions} COMPLETELY UNIQUE and DIVERSE physics questions at {level} difficulty level.\n\n"
     "CRITICAL REQUIREMENTS:\n"
     "- Each question MUST cover DIFFERENT physics concepts (electromagnetic induction, mechanics, thermodynamics, waves, optics, etc.)\n"
     "- Questions MUST be UNIQUE and NOT repetitive\n"
     "- Use VARIED question formats (conceptual, numerical, experimental observation, comparison, etc.)\n"
     "- Ensure questions are suitable for preventing academic malpractice\n\n"
     "Difficulty guidelines:\n"
     "- easy: Fundamental concepts, basic applications, definitions\n"
     "- medium: Problem-solving, application of multiple concepts\n"
     "- hard: Advanced reasoning, integration of concepts, critical analysis\n\n"
     "Return ONLY a JSON array (no markdown, no code blocks):\n"
     "[{{\"question\": \"question text\", \"answer\": \"detailed answer\"}}]")
])

evaluate_answer_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an expert Physics examiner. Evaluate based on 6 criteria. Return ONLY valid JSON."),
    ("human",
     "Context from physics textbook:\n{context}\n\n"
     "Question: {question}\n"
     "Correct Answer: {correct_answer}\n"
     "Student Answer: {student_answer}\n\n"
     "Evaluate the student answer on these 6 criteria (1-10 scale):\n"
     "1. Relevance - How relevant is the answer to the question\n"
     "2. Clarity - How clear and understandable\n"
     "3. SubjectUnderstanding - Depth of physics understanding shown\n"
     "4. Accuracy - Factual correctness\n"
     "5. Completeness - How complete the answer is\n"
     "6. CriticalThinking - Analytical and critical thinking demonstrated\n\n"
     "Return ONLY a JSON object (no markdown, no code blocks):\n"
     "{{\"Relevance\": 8.5, \"Clarity\": 7.0, \"SubjectUnderstanding\": 9.0, \"Accuracy\": 8.0, \"Completeness\": 7.5, \"CriticalThinking\": 8.5}}")
])


# ===== BASIC ROUTES =====
@api_router.get("/")
async def root():
    return {
        "message": "AdmitAI API - LangGraph + RAG + Gemini",
        "status": "operational",
        "rag_enabled": RAG_ENABLED
    }


@api_router.get("/health")
async def health_check():
    try:
        _ = supabase.table("students").select("id").limit(1).execute()
        return {
            "status": "healthy",
            "database": "connected",
            "rag_enabled": RAG_ENABLED,
            "supabase_url": supabase_url
        }
    except Exception as e:
        return {
            "status": "degraded",
            "database": "error",
            "error": str(e)
        }


# ===== STUDENT ENDPOINTS =====
@api_router.post("/students")
async def create_student(student: StudentCreate, current_user: Dict = Depends(get_current_user)):
    """Create student - Firebase Auth Protected"""
    try:
        logging.info(f"🔒 Authenticated request from: {current_user['email']}")
        
        # Check if student already exists by email
        existing_response = supabase.table("students").select("*").eq("email", student.email).execute()
        if existing_response.data and len(existing_response.data) > 0:
            # Student already exists, return existing student
            return existing_response.data[0]
        
        # Generate UUID for new student (let Supabase auto-generate)
        student_data = {
            "first_name": student.first_name,
            "last_name": student.last_name,
            "age": student.age,
            "dob": student.dob,
            "email": student.email,
            "phone": student.phone
        }
        
        response = supabase.table("students").insert(student_data).execute()
        
        if hasattr(response, 'data') and response.data:
            return response.data[0]
        else:
            raise HTTPException(status_code=500, detail="Failed to create student")
    except Exception as e:
        logging.error(f"Error creating student: {e}")
        if "duplicate" in str(e).lower() or "unique" in str(e).lower():
            raise HTTPException(status_code=400, detail="Email already registered")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/students/by-email/{email}")
async def get_student_by_email(email: str, current_user: Dict = Depends(get_current_user)):
    """Get student by email - Firebase Auth Protected"""
    try:
        logging.info(f"🔒 Authenticated request from: {current_user['email']}")
        
        # Verify user is requesting their own data
        if email != current_user.get('email'):
            raise HTTPException(status_code=403, detail="Cannot access other users' data")
        
        response = supabase.table("students").select("*").eq("email", email).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail="Student not found")
        
        return response.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting student by email: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.put("/students/{student_id}/phone")
async def update_student_phone(student_id: str, request: UpdatePhoneRequest, current_user: Dict = Depends(get_current_user)):
    """Update student phone number - Firebase Auth Protected"""
    try:
        logging.info(f"🔒 Authenticated request from: {current_user['email']}")
        
        # Verify user is updating their own data
        if student_id != request.student_id:
            raise HTTPException(status_code=400, detail="Student ID mismatch")
        
        # Update phone number in Supabase
        response = supabase.table("students").update({
            "phone": request.phone
        }).eq("id", student_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail="Student not found")
        
        logging.info(f"✅ Phone updated for student: {student_id}")
        return {"success": True, "message": "Phone number updated successfully", "student": response.data[0]}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating phone: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/students/{student_id}")
async def get_student(student_id: str, current_user: Dict = Depends(get_current_user)):
    """Get student by ID - Firebase Auth Protected"""
    try:
        logging.info(f"🔒 Authenticated request from: {current_user['email']}")
        response = supabase.table("students").select("*").eq("id", student_id).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        raise HTTPException(status_code=404, detail="Student not found")
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching student: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/students")
async def list_students(current_user: Dict = Depends(get_current_user)):
    """List all students - Firebase Auth Protected"""
    try:
        logging.info(f"🔒 Authenticated request from: {current_user['email']}")
        response = supabase.table("students").select("*").order("created_at", desc=True).execute()
        return response.data or []
    except Exception as e:
        logging.error(f"Error listing students: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===== AI-POWERED QUESTION GENERATION WITH RAG =====
@api_router.post("/create-result")
async def create_result(request: CreateResultRequest, current_user: Dict = Depends(get_current_user)):
    """Create test result entry - Firebase Auth Protected"""
    try:
        logging.info(f"🔒 Authenticated request from: {current_user['email']}")
        
        # Verify the student exists and belongs to the authenticated user
        student_response = supabase.table("students").select("*").eq("id", request.student_id).eq("email", current_user.get('email')).execute()
        if not student_response.data or len(student_response.data) == 0:
            raise HTTPException(status_code=403, detail="Cannot create results for other users")
        
        # Create result entry in Supabase
        response = supabase.table("results").insert({
            "student_id": request.student_id,
            "level": request.level,
            "result": "pending",
            "score": None,
            "attempts_easy": request.attempts_easy,
            "attempts_medium": request.attempts_medium,
            "attempts_hard": request.attempts_hard
        }).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to create result")
        
        return response.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating result: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/save-questions")
async def save_questions(request: SaveQuestionsRequest, current_user: Dict = Depends(get_current_user)):
    """Save test questions - Firebase Auth Protected"""
    try:
        logging.info(f"🔒 Authenticated request from: {current_user['email']}")
        
        # Prepare questions for insert
        questions_to_insert = []
        for q in request.questions:
            questions_to_insert.append({
                "result_id": request.result_id,
                "question_text": q.get("question", ""),
                "correct_answer": q.get("answer", "")
            })
        
        # Insert questions into Supabase
        response = supabase.table("questions").insert(questions_to_insert).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to save questions")
        
        return {"success": True, "message": f"Saved {len(response.data)} questions"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error saving questions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/generate-questions")
async def generate_questions(request: GenerateQuestionsRequest, current_user: Dict = Depends(get_current_user)):
    """Generate questions - JWT Protected"""
    try:
        logging.info(f"🔒 Authenticated request from: {current_user['email']}")
        level = request.level
        num_questions = request.num_questions
        
        # Generate unique questions by using diverse physics topics with randomization
        import random
        import time
        import hashlib
        
        # Diverse physics topics to prevent repetitive questions
        physics_topics = [
            "electromagnetic induction and Faraday's law",
            "Newton's laws of motion and forces",
            "thermodynamics and heat transfer",
            "wave motion and sound",
            "optics and light",
            "electric circuits and current",
            "magnetism and magnetic fields",
            "gravitation and planetary motion",
            "work energy and power",
            "electrostatics and electric fields",
            "quantum mechanics basics",
            "atomic structure and spectra",
            "radioactivity and nuclear physics",
            "mechanical properties of matter",
            "fluid mechanics and pressure",
            "kinetic theory of gases",
            "simple harmonic motion",
            "rotational dynamics",
            "interference and diffraction",
            "semiconductors and devices"
        ]
        
        # Create unique seed combining user email, timestamp, and level for maximum diversity
        # This ensures different students AND different attempts get different questions
        user_identifier = current_user.get('email', 'anonymous')
        seed_string = f"{user_identifier}-{level}-{int(time.time())}"
        seed_value = int(hashlib.md5(seed_string.encode()).hexdigest(), 16) % (10 ** 8)
        
        random.seed(seed_value)  # Unique seed per student per attempt
        
        # Randomly select 3-5 diverse topics for this test attempt
        num_topics = random.randint(3, 5)
        selected_topics = random.sample(physics_topics, min(num_topics, len(physics_topics)))
        
        # Create diverse query with randomized topics
        query = f"Physics {level} level: {', '.join(selected_topics)}"
        
        # Retrieve diverse chunks with randomization enabled (k=5 for more content diversity)
        context_docs = get_physics_context(query, k=5, randomize=True)
        context = "\n\n".join(context_docs) if context_docs else "General physics concepts"
        
        logging.info(f"🔮 Generating {num_questions} UNIQUE questions at {level} level")
        logging.info(f"📚 Selected topics: {selected_topics}")
        logging.info(f"📖 Retrieved {len(context_docs)} diverse context chunks")
        
        # Generate questions using LangChain prompt
        prompt = generate_questions_prompt.format_messages(
            context=context[:2000],  # Limit context size
            num_questions=num_questions,
            level=level
        )
        
        response = llm.invoke(prompt)
        response_text = response.content.strip()
        
        # Clean up response
        if response_text.startswith('```'):
            response_text = response_text.split('```')[1]
            if response_text.startswith('json'):
                response_text = response_text[4:]
            response_text = response_text.strip()
        
        # Parse JSON
        questions = json.loads(response_text)
        
        logging.info(f"✅ Generated {len(questions)} questions")
        return {"questions": questions}
        
    except json.JSONDecodeError as e:
        logging.error(f"JSON parsing error: {e}")
        logging.error(f"Response text: {response_text}")
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except Exception as e:
        logging.error(f"Error generating questions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===== AI-POWERED ANSWER EVALUATION WITH 6 CRITERIA =====
@api_router.post("/evaluate-answers")
async def evaluate_answers(request: EvaluateAnswersRequest, current_user: Dict = Depends(get_current_user)):
    """Evaluate student answers - JWT Protected"""
    try:
        logging.info(f"🔒 Authenticated request from: {current_user['email']}")
        result_id = request.result_id
        
        if not result_id:
            raise HTTPException(status_code=400, detail="result_id is required")
        
        # Get questions with their answers
        questions_response = supabase.table("questions").select(
            "id, question_text, correct_answer, student_answers(student_answer)"
        ).eq("result_id", result_id).order("created_at").execute()
        
        if not questions_response.data or len(questions_response.data) == 0:
            raise HTTPException(status_code=404, detail="No questions found for this result")
        
        questions = questions_response.data
        
        logging.info(f"📝 Evaluating {len(questions)} answers with 6 criteria")
        
        # Evaluate each answer
        all_evaluations = []
        
        for idx, q in enumerate(questions, 1):
            try:
                student_answer = ""
                if q.get('student_answers') and len(q['student_answers']) > 0:
                    student_answer = q['student_answers'][0].get('student_answer', 'No answer provided')
                
                # Get relevant context for this question
                context_docs = get_physics_context(q.get('question_text', ''), k=2)
                context = "\n\n".join(context_docs) if context_docs else ""
                
                # Evaluate using LangChain prompt
                prompt = evaluate_answer_prompt.format_messages(
                    context=context[:1500],
                    question=q.get('question_text', ''),
                    correct_answer=q.get('correct_answer', ''),
                    student_answer=student_answer
                )
                
                response = llm.invoke(prompt)
                response_text = response.content.strip()
                
                # Clean up response
                if response_text.startswith('```'):
                    response_text = response_text.split('```')[1]
                    if response_text.startswith('json'):
                        response_text = response_text[4:]
                    response_text = response_text.strip()
                
                # Parse evaluation
                try:
                    scores_json = json.loads(response_text)
                    evaluation = EvaluationCriteria(**scores_json)
                    
                    all_evaluations.append({
                        "question_number": idx,
                        "question": q.get('question_text', ''),
                        "student_answer": student_answer,
                        "scores": evaluation.model_dump(),
                        "average": evaluation.average
                    })
                except (json.JSONDecodeError, Exception) as e:
                    logging.error(f"Error parsing evaluation for Q{idx}: {e}")
                    # Fallback scores
                    all_evaluations.append({
                        "question_number": idx,
                        "question": q.get('question_text', ''),
                        "student_answer": student_answer,
                        "scores": {
                            "Relevance": 5.0,
                            "Clarity": 5.0,
                            "SubjectUnderstanding": 5.0,
                            "Accuracy": 5.0,
                            "Completeness": 5.0,
                            "CriticalThinking": 5.0
                        },
                        "average": 5.0
                    })
            except Exception as e:
                logging.error(f"Error evaluating question {idx}: {e}")
                # Continue with fallback
                all_evaluations.append({
                    "question_number": idx,
                    "question": "Error",
                    "student_answer": "",
                    "scores": {
                        "Relevance": 5.0,
                        "Clarity": 5.0,
                        "SubjectUnderstanding": 5.0,
                        "Accuracy": 5.0,
                        "Completeness": 5.0,
                        "CriticalThinking": 5.0
                    },
                    "average": 5.0
                })
        
        # Ensure we have evaluations
        if not all_evaluations or len(all_evaluations) == 0:
            raise HTTPException(status_code=500, detail="Failed to evaluate any answers")
        
        # Calculate overall score (average out of 10)
        total_avg = sum(e['average'] for e in all_evaluations) / len(all_evaluations)
        
        # Score is out of 10
        score_out_of_10 = total_avg
        
        # Determine pass/fail (5/10 threshold = 50%)
        result_status = 'pass' if score_out_of_10 >= 5.0 else 'fail'
        
        # Calculate average for each of the 6 criteria across all questions
        criteria_averages = {
            "Relevance": sum(e['scores']['Relevance'] for e in all_evaluations) / len(all_evaluations),
            "Clarity": sum(e['scores']['Clarity'] for e in all_evaluations) / len(all_evaluations),
            "SubjectUnderstanding": sum(e['scores']['SubjectUnderstanding'] for e in all_evaluations) / len(all_evaluations),
            "Accuracy": sum(e['scores']['Accuracy'] for e in all_evaluations) / len(all_evaluations),
            "Completeness": sum(e['scores']['Completeness'] for e in all_evaluations) / len(all_evaluations),
            "CriticalThinking": sum(e['scores']['CriticalThinking'] for e in all_evaluations) / len(all_evaluations)
        }
        
        # Update result in Supabase with score out of 10
        # Calculate concession based on levels passed
        concession = 0
        try:
            # First, get the current result to find student_id
            current_result = supabase.table("results").select("student_id").eq("id", result_id).single().execute()
            student_id = current_result.data.get("student_id") if current_result.data else None
            
            if not student_id:
                raise ValueError("Student ID not found in result")
            
            # Get all results for this student to determine concession
            all_results = supabase.table("results").select("*").eq("student_id", student_id).execute()
            
            if all_results.data:
                # Check which levels are passed
                easy_passed = any(r.get('level') == 'easy' and r.get('result') == 'pass' for r in all_results.data)
                medium_passed = any(r.get('level') == 'medium' and r.get('result') == 'pass' for r in all_results.data)
                hard_passed = any(r.get('level') == 'hard' and r.get('result') == 'pass' for r in all_results.data)
                
                # Calculate concession
                if easy_passed and medium_passed and hard_passed:
                    concession = 50  # All levels passed = 50% concession
                elif easy_passed and medium_passed:
                    concession = 30  # Easy + Medium passed = 30% concession
                else:
                    concession = 0   # No concession
            
            supabase.table("results").update({
                "score": score_out_of_10,
                "result": result_status,
                "concession": concession,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", result_id).execute()
            
            logging.info(f"✅ Concession calculated: {concession}%")
        except Exception as e:
            logging.error(f"Error updating result: {e}")
            # Continue even if update fails
        
        logging.info(f"✅ Evaluation complete: {score_out_of_10:.1f}/10 - {result_status.upper()}")
        
        return {
            "result_id": result_id,
            "score": score_out_of_10,  # Out of 10
            "result": result_status,
            "criteria": criteria_averages,  # 6 criteria as overall averages
            "evaluations": all_evaluations  # Individual question details (for reference)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error evaluating answers: {e}")
        logging.error("Traceback: ", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Evaluation error: {str(e)}")


# ===== REVIEW ENDPOINT =====
@api_router.get("/review/{level}/{student_id}")
async def get_review_data(level: str, student_id: str, current_user: Dict = Depends(get_current_user)):
    """Get review data for a specific level - Firebase Auth Protected"""
    try:
        logging.info(f"🔒 Authenticated request from: {current_user['email']}")
        
        # Verify user is requesting their own data
        student_response = supabase.table("students").select("email").eq("id", student_id).execute()
        if not student_response.data or student_response.data[0]['email'] != current_user.get('email'):
            raise HTTPException(status_code=403, detail="Cannot access other users' data")
        
        # Find the result for this level and student
        results_response = supabase.table("results").select("*").eq("student_id", student_id).eq("level", level).order("created_at", desc=True).limit(1).execute()
        
        attempted = False
        result_id = None
        can_retake = False
        current_attempts = 0
        max_attempts = {"easy": 1, "medium": 2, "hard": 2}.get(level, 1)
        last_result = None
        
        if results_response.data and len(results_response.data) > 0:
            attempted = True
            last_result = results_response.data[0]
            result_id = last_result['id']
            
            # Get current attempts for this level
            if level == "easy":
                current_attempts = last_result.get("attempts_easy", 0)
            elif level == "medium":
                current_attempts = last_result.get("attempts_medium", 0)
            elif level == "hard":
                current_attempts = last_result.get("attempts_hard", 0)
            
            # Check if can retake: failed (not passed) AND has attempts remaining
            level_passed = last_result.get("result") == "pass"
            can_retake = not level_passed and current_attempts < max_attempts
        
        # Get questions for this level (either from the test or generate new ones for review)
        if result_id:
            # Get questions that were used in the test
            questions_response = supabase.table("questions").select("id, question_text, correct_answer").eq("result_id", result_id).order("created_at").execute()
            
            if not questions_response.data:
                raise HTTPException(status_code=404, detail="No questions found for this test")
            
            questions_data = []
            for q in questions_response.data:
                # Get student's answer if exists
                answer_response = supabase.table("student_answers").select("student_answer").eq("question_id", q['id']).execute()
                
                student_answer = None
                if answer_response.data and len(answer_response.data) > 0:
                    student_answer = answer_response.data[0]['student_answer']
                
                # Check if review is cached
                cached_review = supabase.table("question_reviews").select("is_correct, explanation").eq("question_id", q['id']).execute()
                
                explanation = None
                is_correct = False
                
                if cached_review.data and len(cached_review.data) > 0:
                    # Use cached data
                    is_correct = cached_review.data[0]['is_correct']
                    explanation = cached_review.data[0]['explanation']
                elif student_answer:
                    # Generate and cache evaluation
                    try:
                        context_docs = get_physics_context(q['question_text'], k=2)
                        context = "\n\n".join(context_docs) if context_docs else ""
                        
                        # Create evaluation prompt
                        eval_prompt = f"""
Question: {q['question_text']}
Correct Answer: {q['correct_answer']}
Student Answer: {student_answer}

Context: {context[:1000]}

Is the student's answer correct? Respond with ONLY 'CORRECT' or 'INCORRECT' followed by a detailed explanation of why it's correct or what's wrong.
"""
                        
                        response = llm.invoke(eval_prompt)
                        ai_response = response.content.strip()
                        
                        is_correct = ai_response.upper().startswith('CORRECT')
                        
                        if not is_correct:
                            # Extract explanation (everything after INCORRECT)
                            explanation = ai_response.replace('INCORRECT', '').strip()
                            if not explanation:
                                explanation = "Your answer doesn't match the expected solution. Please review the correct answer above."
                        
                        # Cache the review
                        try:
                            supabase.table("question_reviews").insert({
                                "question_id": q['id'],
                                "result_id": result_id,
                                "student_id": student_id,
                                "is_correct": is_correct,
                                "explanation": explanation
                            }).execute()
                        except Exception as cache_error:
                            logging.warning(f"Failed to cache review: {cache_error}")
                            
                    except Exception as e:
                        logging.error(f"Error generating explanation: {e}")
                        is_correct = False
                        explanation = "Unable to generate explanation at this time."
                
                questions_data.append({
                    "id": q['id'],
                    "question_text": q['question_text'],
                    "correct_answer": q['correct_answer'],
                    "student_answer": student_answer,
                    "explanation": explanation,
                    "is_correct": is_correct
                })
            
            return {
                "attempted": attempted,
                "questions": questions_data,
                "can_retake": can_retake,
                "current_attempts": current_attempts,
                "max_attempts": max_attempts
            }
        else:
            # Level not attempted - generate sample questions to show correct answers
            # Get number of questions based on level
            num_questions = {"easy": 5, "medium": 3, "hard": 2}.get(level, 5)
            
            # Generate questions
            query = f"Physics {level} level questions concepts topics"
            context_docs = get_physics_context(query, k=3)
            context = "\n\n".join(context_docs) if context_docs else "General physics concepts"
            
            prompt = generate_questions_prompt.format_messages(
                context=context[:2000],
                num_questions=num_questions,
                level=level
            )
            
            response = llm.invoke(prompt)
            response_text = response.content.strip()
            
            # Clean up response
            if response_text.startswith('```'):
                response_text = response_text.split('```')[1]
                if response_text.startswith('json'):
                    response_text = response_text[4:]
                response_text = response_text.strip()
            
            # Parse JSON
            generated_questions = json.loads(response_text)
            
            questions_data = []
            for q in generated_questions:
                questions_data.append({
                    "id": f"sample-{len(questions_data)}",
                    "question_text": q.get("question", ""),
                    "correct_answer": q.get("answer", ""),
                    "student_answer": None,
                    "explanation": None,
                    "is_correct": False
                })
            
            return {
                "attempted": False,
                "questions": questions_data,
                "can_retake": False,
                "current_attempts": 0,
                "max_attempts": max_attempts
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting review data: {e}")
        logging.error("Traceback: ", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Review error: {str(e)}")


# ===== AI REVIEW ENDPOINT =====
class AIReviewRequest(BaseModel):
    question: str
    correct_answer: str
    student_answer: str
    level: str

@api_router.post("/ai-review")
async def generate_ai_review(request: AIReviewRequest, current_user: Dict = Depends(get_current_user)):
    """Generate detailed AI review comparing student answer with correct answer - Firebase Auth Protected"""
    try:
        logging.info(f"🔒 Authenticated AI review request from: {current_user['email']}")
        
        # Get context from RAG system
        context_docs = get_physics_context(request.question, k=3)
        context = "\n\n".join(context_docs) if context_docs else "General physics concepts"
        
        # Create detailed review prompt
        review_prompt = f"""You are an experienced physics teacher providing detailed feedback to a student.

Question: {request.question}

Correct Answer: {request.correct_answer}

Student's Answer: {request.student_answer}

Context from Physics Textbook:
{context[:1500]}

Please provide a comprehensive review that includes:
1. **Comparison Analysis**: Compare the student's answer with the correct answer. Identify what the student got right and what was incorrect or missing.

2. **Concept Explanation**: Explain the underlying physics concepts involved in this question. Help the student understand WHY the correct answer is right.

3. **Common Misconceptions**: If the student's answer shows any misconceptions, address them specifically.

4. **Learning Points**: Highlight key takeaways and what the student should focus on to improve their understanding.

5. **Encouragement**: End with constructive feedback that encourages the student.

Provide a detailed, educational review (200-300 words) that helps the student learn from their mistake or reinforces their understanding if they were close to correct.
"""
        
        # Generate AI review
        response = llm.invoke(review_prompt)
        review_text = response.content.strip()
        
        logging.info("✅ AI review generated successfully")
        
        return {
            "review": review_text,
            "success": True
        }
        
    except Exception as e:
        logging.error(f"Error generating AI review: {e}")
        logging.error("Traceback: ", exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI review error: {str(e)}")


# ===== AI NOTES GENERATION =====
@api_router.get("/ai-notes/{level}/{student_id}")
async def generate_ai_notes(level: str, student_id: str, current_user: Dict = Depends(get_current_user)):
    """Generate AI study notes based on incorrect answers - Firebase Auth Protected"""
    try:
        logging.info(f"🔒 Authenticated AI notes request from: {current_user['email']}")
        
        # Verify user is requesting their own data
        student_response = supabase.table("students").select("email").eq("id", student_id).execute()
        if not student_response.data or student_response.data[0]['email'] != current_user.get('email'):
            raise HTTPException(status_code=403, detail="Cannot access other users' data")
        
        # Find the result for this level and student
        results_response = supabase.table("results").select("*").eq("student_id", student_id).eq("level", level).order("created_at", desc=True).limit(1).execute()
        
        if not results_response.data or len(results_response.data) == 0:
            return {"topic_notes": [], "incorrect_count": 0, "cached": False}
        
        result_id = results_response.data[0]['id']
        
        # Check if AI notes already exist for this result
        existing_notes = supabase.table("ai_notes").select("*").eq("result_id", result_id).execute()
        
        if existing_notes.data and len(existing_notes.data) > 0:
            # Return cached notes
            cached_data = existing_notes.data[0]
            logging.info(f"✅ Returning cached AI notes for result {result_id}")
            return {
                "topic_notes": cached_data.get("topic_notes", []),
                "incorrect_count": cached_data.get("incorrect_count", 0),
                "cached": True
            }
        
        # Generate new notes if not cached
        # Get all questions for this test
        questions_response = supabase.table("questions").select("id, question_text, correct_answer").eq("result_id", result_id).order("created_at").execute()
        
        if not questions_response.data:
            return {"topic_notes": [], "incorrect_count": 0, "cached": False}
        
        # Get student answers and identify incorrect ones
        incorrect_questions = []
        
        for q in questions_response.data:
            answer_response = supabase.table("student_answers").select("student_answer").eq("question_id", q['id']).execute()
            
            if answer_response.data and len(answer_response.data) > 0:
                student_answer = answer_response.data[0]['student_answer']
                
                # Check if answer is incorrect using AI
                context_docs = get_physics_context(q['question_text'], k=2)
                context = "\n\n".join(context_docs) if context_docs else ""
                
                eval_prompt = f"""
Question: {q['question_text']}
Correct Answer: {q['correct_answer']}
Student Answer: {student_answer}

Context: {context[:1000]}

Is the student's answer correct? Respond with ONLY 'CORRECT' or 'INCORRECT'.
"""
                
                response = llm.invoke(eval_prompt)
                ai_response = response.content.strip()
                
                is_correct = ai_response.upper().startswith('CORRECT')
                
                if not is_correct:
                    incorrect_questions.append({
                        "question": q['question_text'],
                        "correct_answer": q['correct_answer'],
                        "student_answer": student_answer
                    })
        
        if len(incorrect_questions) == 0:
            # Store empty result in cache
            supabase.table("ai_notes").insert({
                "result_id": result_id,
                "student_id": student_id,
                "level": level,
                "topic_notes": [],
                "incorrect_count": 0
            }).execute()
            
            return {"topic_notes": [], "incorrect_count": 0, "cached": False}
        
        # Generate consolidated notes for all incorrect questions
        questions_summary = "\n\n".join([
            f"Question: {iq['question']}\nCorrect Answer: {iq['correct_answer']}\nStudent's Answer: {iq['student_answer']}"
            for iq in incorrect_questions
        ])
        
        # Get comprehensive context
        all_questions_text = " ".join([iq['question'] for iq in incorrect_questions])
        context_docs = get_physics_context(all_questions_text, k=5)
        context = "\n\n".join(context_docs) if context_docs else "General physics concepts"
        
        # Generate topic identification and notes
        notes_prompt = f"""You are an expert physics teacher creating personalized study notes.

The student answered the following questions incorrectly:

{questions_summary}

Context from Physics Textbook:
{context[:3000]}

Your task:
1. Identify the main physics topics/concepts these questions relate to
2. Group questions by topic (if multiple questions relate to the same topic, group them together)
3. For each topic, generate comprehensive study notes (300-500 words) that:
   - Explain the core concept clearly
   - Provide key formulas and definitions
   - Include practical examples
   - Address common misconceptions
   - Give tips for solving similar problems

Respond in this JSON format:
{{
  "topic_notes": [
    {{
      "topic": "Topic Name",
      "related_questions": ["Question 1 (first 50 chars)...", "Question 2..."],
      "notes": "Detailed explanation and study notes..."
    }}
  ]
}}
"""
        
        response = llm.invoke(notes_prompt)
        response_text = response.content.strip()
        
        # Clean up response
        if response_text.startswith('```'):
            response_text = response_text.split('```')[1]
            if response_text.startswith('json'):
                response_text = response_text[4:]
            response_text = response_text.strip()
        
        # Parse JSON
        notes_data = json.loads(response_text)
        topic_notes = notes_data.get("topic_notes", [])
        
        # Store in database for caching
        supabase.table("ai_notes").insert({
            "result_id": result_id,
            "student_id": student_id,
            "level": level,
            "topic_notes": topic_notes,
            "incorrect_count": len(incorrect_questions)
        }).execute()
        
        logging.info(f"✅ AI notes generated and cached for {len(incorrect_questions)} incorrect questions")
        
        return {
            "topic_notes": topic_notes,
            "incorrect_count": len(incorrect_questions),
            "cached": False
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error generating AI notes: {e}")
        logging.error("Traceback: ", exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI notes error: {str(e)}")


# ===== LEADERBOARD =====
@api_router.get("/leaderboard")
async def get_leaderboard():
    """Get leaderboard data for all students"""
    try:
        # Get all test results
        all_results = supabase.table("results").select("*").order("created_at", desc=False).execute()
        
        if not all_results.data:
            return {"hard_leaderboard": [], "medium_leaderboard": []}
        
        # Group results by student
        student_results = {}
        for result in all_results.data:
            student_id = result['student_id']
            if student_id not in student_results:
                student_results[student_id] = {
                    'easy': None,
                    'medium': None,
                    'hard': None
                }
            
            level = result['level']
            # Keep only the passed result or latest attempt
            if student_results[student_id][level] is None or result['result'] == 'pass':
                student_results[student_id][level] = result
        
        # Get student details
        students_response = supabase.table("students").select("id, first_name, last_name, email").execute()
        students_map = {s['id']: s for s in students_response.data}
        
        hard_leaderboard = []
        medium_leaderboard = []
        
        for student_id, results in student_results.items():
            if student_id not in students_map:
                continue
            
            student_info = students_map[student_id]
            student_name = f"{student_info['first_name']} {student_info['last_name']}"
            
            # Check if passed hard level
            hard_result = results['hard']
            if hard_result and hard_result['result'] == 'pass':
                # Calculate total score and time for all levels
                total_score = 0
                total_time = 0
                levels_completed = 0
                
                for level in ['easy', 'medium', 'hard']:
                    if results[level] and results[level]['result'] == 'pass':
                        total_score += results[level].get('score', 0)
                        # Time taken = timer duration - time remaining (if available)
                        # For now, we'll use a simple calculation
                        levels_completed += 1
                
                # Calculate total time from all level attempts
                # Assuming each level stores time_taken or we calculate from created_at timestamps
                easy_time = results['easy'].get('time_taken', 0) if results['easy'] else 0
                medium_time = results['medium'].get('time_taken', 0) if results['medium'] else 0
                hard_time = hard_result.get('time_taken', 0)
                
                total_time = easy_time + medium_time + hard_time
                avg_score = total_score / levels_completed if levels_completed > 0 else 0
                
                hard_leaderboard.append({
                    'rank': 0,  # Will be set after sorting
                    'student_name': student_name,
                    'total_score': round(avg_score, 2),
                    'total_time_minutes': round(total_time / 60, 1) if total_time > 0 else 0,
                    'levels_passed': levels_completed,
                    'email': student_info['email']
                })
            
            # Check if passed medium but not hard
            medium_result = results['medium']
            if medium_result and medium_result['result'] == 'pass' and (not hard_result or hard_result['result'] != 'pass'):
                # Calculate score and time for easy + medium
                total_score = 0
                total_time = 0
                levels_completed = 0
                
                for level in ['easy', 'medium']:
                    if results[level] and results[level]['result'] == 'pass':
                        total_score += results[level].get('score', 0)
                        levels_completed += 1
                
                easy_time = results['easy'].get('time_taken', 0) if results['easy'] else 0
                medium_time = medium_result.get('time_taken', 0)
                
                total_time = easy_time + medium_time
                avg_score = total_score / levels_completed if levels_completed > 0 else 0
                
                medium_leaderboard.append({
                    'rank': 0,
                    'student_name': student_name,
                    'total_score': round(avg_score, 2),
                    'total_time_minutes': round(total_time / 60, 1) if total_time > 0 else 0,
                    'levels_passed': levels_completed,
                    'email': student_info['email']
                })
        
        # Sort leaderboards: by score (desc), then by time (asc)
        hard_leaderboard.sort(key=lambda x: (-x['total_score'], x['total_time_minutes']))
        medium_leaderboard.sort(key=lambda x: (-x['total_score'], x['total_time_minutes']))
        
        # Assign ranks
        for idx, entry in enumerate(hard_leaderboard):
            entry['rank'] = idx + 1
        
        for idx, entry in enumerate(medium_leaderboard):
            entry['rank'] = idx + 1
        
        logging.info(f"✅ Leaderboard generated: {len(hard_leaderboard)} hard, {len(medium_leaderboard)} medium")
        
        return {
            "hard_leaderboard": hard_leaderboard,
            "medium_leaderboard": medium_leaderboard
        }
        
    except Exception as e:
        logging.error(f"Error generating leaderboard: {e}")
        logging.error("Traceback: ", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Leaderboard error: {str(e)}")


# ===== EMAIL NOTIFICATION =====
@api_router.post("/send-notification")
async def send_notification(request: NotificationEmailRequest, current_user: Dict = Depends(get_current_user)):
    """Send email notification - Firebase Auth Protected"""
    try:
        logging.info(f"🔒 Authenticated request from: {current_user['email']}")
        from email.mime.text import MIMEText
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build
        import base64
        
        client_id = os.environ.get('GMAIL_CLIENT_ID')
        client_secret = os.environ.get('GMAIL_CLIENT_SECRET')
        refresh_token = os.environ.get('GMAIL_REFRESH_TOKEN')
        
        if not all([client_id, client_secret, refresh_token]):
            logging.warning("Gmail credentials not configured")
            return {"success": False, "message": "Gmail not configured"}
        
        # Check all test results for this student to determine admission status
        results_response = supabase.table("results").select("*").eq("student_id", request.student_id).order("created_at", desc=True).execute()
        
        admission_message = ""
        email_subject = "AdmitAI Test Results"
        
        if results_response.data and len(results_response.data) > 0:
            # Get all results to check level statuses
            all_results = results_response.data
            
            # Check which levels were passed
            easy_passed = any(r.get('level') == 'easy' and r.get('result') == 'pass' for r in all_results)
            medium_passed = any(r.get('level') == 'medium' and r.get('result') == 'pass' for r in all_results)
            hard_passed = any(r.get('level') == 'hard' and r.get('result') == 'pass' for r in all_results)
            
            # Determine admission status and fee concession
            if easy_passed and medium_passed and hard_passed:
                # Passed all levels - 50% fee concession
                admission_message = """
🎉 Congratulations! We are thrilled to inform you that you have successfully passed all test levels!

✨ ADMISSION GRANTED ✨

You have been accepted into our prestigious institution with a remarkable 50% FEE CONCESSION!

This outstanding achievement reflects your exceptional understanding of physics concepts and problem-solving abilities. We are excited to welcome you to our academic community.

Next Steps:
- You will receive detailed admission instructions shortly
- Please prepare the required documents for enrollment
- Our admissions team will contact you within 2-3 business days

We look forward to supporting your academic journey!
"""
                email_subject = "🎉 Congratulations! Admission Granted with 50% Fee Concession - AdmitAI"
                
            elif easy_passed and medium_passed and not hard_passed:
                # Passed medium but failed hard - 30% fee concession
                admission_message = """
🎊 Congratulations! We are pleased to inform you that you have demonstrated strong performance in your admission test!

✨ ADMISSION GRANTED ✨

You have been accepted into our prestigious institution with a 30% FEE CONCESSION!

Your solid grasp of fundamental and intermediate physics concepts showcases your academic potential. We believe you will thrive in our academic environment.

Next Steps:
- You will receive detailed admission instructions shortly
- Please prepare the required documents for enrollment
- Our admissions team will contact you within 2-3 business days

We are excited to have you join our institution!
"""
                email_subject = "🎊 Congratulations! Admission Granted with 30% Fee Concession - AdmitAI"
                
            elif easy_passed:
                # Passed only easy level
                admission_message = """
Thank you for completing the AdmitAI admission test.

While you have demonstrated understanding of basic physics concepts, we encourage you to strengthen your knowledge in advanced topics for better opportunities.

You may retake the test to improve your results and qualify for fee concessions:
- Pass Medium & Hard levels: 50% fee concession
- Pass Medium level: 30% fee concession

We believe in your potential and encourage you to try again!
"""
                email_subject = "AdmitAI Test Results - Keep Improving!"
                
            else:
                # Did not pass or failed
                admission_message = """
Thank you for taking the AdmitAI admission test.

We appreciate your effort and interest in our institution. While your current results don't qualify for admission at this time, we encourage you to review the concepts and retake the test.

Our test review feature provides detailed explanations to help you improve. You can access it from your dashboard.

Don't give up! With dedication and practice, we're confident you can achieve better results.
"""
                email_subject = "AdmitAI Test Results - Try Again!"
        else:
            # Fallback message if no results found
            admission_message = f"""
Dear {request.student_name},

Thank you for completing your AdmitAI admission test.

Result: {request.result.upper()}

Please log in to your dashboard to view detailed results and next steps.

Best regards,
AdmitAI Team
"""
        
        creds = Credentials(
            None,
            refresh_token=refresh_token,
            token_uri='https://oauth2.googleapis.com/token',
            client_id=client_id,
            client_secret=client_secret,
            scopes=['https://www.googleapis.com/auth/gmail.send']
        )
        
        creds.refresh(Request())
        service = build('gmail', 'v1', credentials=creds)
        
        message = MIMEText(f"""
Dear {request.student_name},

{admission_message}

Best regards,
The AdmitAI Team
        """)
        message['to'] = request.to_email
        message['subject'] = email_subject
        
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        service.users().messages().send(userId="me", body={'raw': raw}).execute()
        
        logging.info(f"✅ Email sent to {request.to_email}")
        return {"success": True, "message": "Email sent successfully"}
        
    except Exception as e:
        logging.error(f"❌ Email error: {str(e)}")
        return {"success": False, "message": f"Email failed: {str(e)}"}


@api_router.post("/send-confirmation-email")
async def send_confirmation_email(request: SendConfirmationEmailRequest):
    """Send email confirmation using Gmail API"""
    try:
        from email.mime.text import MIMEText
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build
        import base64
        
        client_id = os.environ.get('GMAIL_CLIENT_ID')
        client_secret = os.environ.get('GMAIL_CLIENT_SECRET')
        refresh_token = os.environ.get('GMAIL_REFRESH_TOKEN')
        frontend_url = os.environ.get('FRONTEND_URL', 'https://repair-wizard-26.preview.emergentagent.com')
        
        if not all([client_id, client_secret, refresh_token]):
            logging.warning("Gmail credentials not configured")
            return {"success": False, "message": "Gmail not configured"}
        
        creds = Credentials(
            None,
            refresh_token=refresh_token,
            token_uri='https://oauth2.googleapis.com/token',
            client_id=client_id,
            client_secret=client_secret,
            scopes=['https://www.googleapis.com/auth/gmail.send']
        )
        
        creds.refresh(Request())
        service = build('gmail', 'v1', credentials=creds)
        
        # Create confirmation link
        confirmation_link = f"{frontend_url}/confirm-email?user_id={request.user_id}"
        
        message = MIMEText(f"""
Dear {request.student_name},

Welcome to AdmitAI! 

Thank you for registering. Please confirm your email address by clicking the link below:

{confirmation_link}

If you did not create an account, please ignore this email.

Best regards,
AdmitAI Team
        """)
        message['to'] = request.to_email
        message['from'] = os.environ.get('GMAIL_FROM_EMAIL', 'noreply@admitai.com')
        message['subject'] = "Confirm Your AdmitAI Account"
        
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        service.users().messages().send(userId="me", body={'raw': raw}).execute()
        
        logging.info(f"✅ Confirmation email sent to {request.to_email}")
        return {"success": True, "message": "Confirmation email sent successfully"}
        
    except Exception as e:
        logging.error(f"❌ Confirmation email error: {str(e)}")
        return {"success": False, "message": f"Email failed: {str(e)}"}


# ===== SETUP =====
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

logging.info("🚀 AdmitAI Backend with LangGraph + RAG")
logging.info(f"📊 Supabase: {supabase_url}")
logging.info("🤖 Gemini 2.5 Flash: Configured")
logging.info(f"🔮 RAG: {'Enabled' if RAG_ENABLED else 'Disabled (will use fallback)'}")
