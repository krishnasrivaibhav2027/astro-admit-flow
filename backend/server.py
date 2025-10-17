from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime
import json
import hashlib
import secrets
from supabase import create_client, Client
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate

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


class StudentRegister(BaseModel):
    first_name: str
    last_name: str
    age: int
    dob: str
    email: str
    phone: str
    password: str


class StudentLogin(BaseModel):
    email: str
    password: str


class GenerateQuestionsRequest(BaseModel):
    level: str
    num_questions: int = 5


class EvaluateAnswersRequest(BaseModel):
    result_id: str


class NotificationEmailRequest(BaseModel):
    to_email: str
    student_name: str
    result: str
    score: float


class SendConfirmationEmailRequest(BaseModel):
    to_email: str
    student_name: str
    user_id: str


# ===== PASSWORD HASHING FUNCTIONS =====
def hash_password(password: str) -> str:
    """Hash password using SHA256 with salt"""
    salt = secrets.token_hex(16)
    pwd_hash = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}${pwd_hash}"


def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    try:
        salt, pwd_hash = hashed.split('$')
        return hashlib.sha256((password + salt).encode()).hexdigest() == pwd_hash
    except:
        return False


# ===== PROMPTS (LangGraph style) =====
generate_questions_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an expert Physics exam question generator. Use the provided context from NCERT Physics textbook. Return ONLY valid JSON."),
    ("human",
     "Context from physics textbook:\n{context}\n\n"
     "Generate {num_questions} UNIQUE physics questions at {level} difficulty level.\n\n"
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
        response = supabase.table("students").select("id").limit(1).execute()
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
async def create_student(student: StudentCreate):
    try:
        response = supabase.table("students").insert({
            "first_name": student.first_name,
            "last_name": student.last_name,
            "age": student.age,
            "dob": student.dob,
            "email": student.email,
            "phone": student.phone
        }).execute()
        
        if hasattr(response, 'data') and response.data:
            return response.data[0]
        else:
            raise HTTPException(status_code=500, detail="Failed to create student")
    except Exception as e:
        logging.error(f"Error creating student: {e}")
        if "duplicate" in str(e).lower() or "unique" in str(e).lower():
            raise HTTPException(status_code=400, detail="Email already registered")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/students/{student_id}")
async def get_student(student_id: str):
    try:
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
async def list_students():
    try:
        response = supabase.table("students").select("*").order("created_at", desc=True).execute()
        return response.data or []
    except Exception as e:
        logging.error(f"Error listing students: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===== AI-POWERED QUESTION GENERATION WITH RAG =====
@api_router.post("/generate-questions")
async def generate_questions(request: GenerateQuestionsRequest):
    try:
        level = request.level
        num_questions = request.num_questions
        
        # Get relevant context from RAG
        query = f"Physics {level} level questions concepts topics"
        context_docs = get_physics_context(query, k=3)
        context = "\n\n".join(context_docs) if context_docs else "General physics concepts"
        
        logging.info(f"🔮 Generating {num_questions} questions at {level} level with RAG context")
        
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
async def evaluate_answers(request: EvaluateAnswersRequest):
    try:
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
        
        # Determine pass/fail (6/10 threshold = 60%)
        result_status = 'pass' if score_out_of_10 >= 6.0 else 'fail'
        
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
        try:
            supabase.table("results").update({
                "score": score_out_of_10,
                "result": result_status,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", result_id).execute()
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
        logging.error(f"Traceback: ", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Evaluation error: {str(e)}")


# ===== EMAIL NOTIFICATION =====
@api_router.post("/send-notification")
async def send_notification(request: NotificationEmailRequest):
    try:
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

Your AdmitAI admission test results:

Result: {request.result.upper()}
Score: {request.score:.1f} / 10

{'Congratulations! You have passed.' if request.result == 'pass' else 'Please review your results and try again.'}

Best regards,
AdmitAI Team
        """)
        message['to'] = request.to_email
        message['subject'] = f"AdmitAI Test Results - {request.result.upper()}"
        
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
        frontend_url = os.environ.get('FRONTEND_URL', 'https://physics-rai.preview.emergentagent.com')
        
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

logging.info(f"🚀 AdmitAI Backend with LangGraph + RAG")
logging.info(f"📊 Supabase: {supabase_url}")
logging.info(f"🤖 Gemini 2.5 Flash: Configured")
logging.info(f"🔮 RAG: {'Enabled' if RAG_ENABLED else 'Disabled (will use fallback)'}")
