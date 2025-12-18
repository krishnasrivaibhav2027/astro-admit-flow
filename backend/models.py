from pydantic import BaseModel, Field
from typing import List, Optional, Dict

# ===== EVALUATION CRITERIA MODEL =====
class EvaluationCriteria(BaseModel):
    """6 evaluation criteria as per LangGraph requirements"""
    Relevance: float = Field(..., ge=0, le=10, description="How relevant is the answer to the question")
    Clarity: float = Field(..., ge=0, le=10, description="How clear and understandable is the answer")
    SubjectUnderstanding: float = Field(..., ge=0, le=10, description="Depth of subject understanding")
    Accuracy: float = Field(..., ge=0, le=10, description="Factual correctness")
    Completeness: float = Field(..., ge=0, le=10, description="How complete is the answer")
    CriticalThinking: float = Field(..., ge=0, le=10, description="Analytical and critical thinking")

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
    subject: str = "physics"
    level: str
    num_questions: int = 5


class CreateResultRequest(BaseModel):
    student_id: str
    subject: str = "physics"
    level: str
    attempts_easy: int = 0
    attempts_medium: int = 0
    attempts_hard: int = 0


class SaveQuestionsRequest(BaseModel):
    result_id: str
    questions: List[Dict[str, str]]


class SubmitTestRequest(BaseModel):
    result_id: str
    answers: Dict[str, str]  # Map: question_id -> student_answer
    is_timeout: bool = False


class EvaluateAnswersRequest(BaseModel):
    result_id: str


class NotificationEmailRequest(BaseModel):
    to_email: str
    student_name: str
    result: str
    score: Optional[float] = None
    student_id: Optional[str] = None


class SendConfirmationEmailRequest(BaseModel):
    to_email: str
    student_name: str
    user_id: str

class LogoutRequest(BaseModel):
    email: str


class SettingsUpdateRequest(BaseModel):
    model: str
    temperature: float
    email_notifications: bool
    passing_score: int
    max_attempts: int
    rag_k: int
