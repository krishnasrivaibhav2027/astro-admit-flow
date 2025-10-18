import os
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import FastAPI, APIRouter, HTTPException, status
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict
from pydantic.functional_validators import BeforeValidator
from bson import ObjectId
from starlette.middleware.cors import CORSMiddleware

# --- CONFIGURATION AND INITIALIZATION ---

# Environment Loading
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Environment Variable Validation
MONGO_URL = os.getenv('MONGO_URL')
DB_NAME = os.getenv('DB_NAME')
CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')

if not MONGO_URL or not DB_NAME:
    raise ValueError("MONGO_URL and DB_NAME environment variables are required.")

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Secure CORS Check
if '*' in CORS_ORIGINS and len(CORS_ORIGINS) > 1:
    logger.warning("CORS_ORIGINS contains a wildcard '*' along with other origins, which is incorrect.")
if '*' in CORS_ORIGINS and os.getenv('ALLOW_CREDENTIALS', 'False').lower() == 'true':
    raise ValueError("CORS misconfiguration: Using a wildcard origin ('*') with credentials is not allowed.")

# --- DATABASE SETUP ---

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
status_collection = db.get_collection("status_checks")

# --- PYDANTIC MODELS WITH MONGODB COMPATIBILITY ---

# Pydantic requires a custom type to handle MongoDB's ObjectId.
PyObjectId = BeforeValidator(lambda v: str(v))

class StatusCheck(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Pydantic v2 configuration
    model_config = ConfigDict(
        populate_by_name=True, # Allows using the '_id' alias
        arbitrary_types_allowed=True,
    )

class StatusCheckCreate(BaseModel):
    client_name: str

# --- API SETUP ---

app = FastAPI(title="Legacy Server")
api_router = APIRouter(prefix="/api")

# --- API ENDPOINTS ---

@api_router.get("/")
async def root():
    return {"message": "Legacy server is running."}

@api_router.post("/status", response_model=StatusCheck, status_code=status.HTTP_201_CREATED)
async def create_status_check(payload: StatusCheckCreate):
    """Creates a new status check record in the database."""
    status_data = payload.model_dump()
    
    try:
        result = await status_collection.insert_one(status_data)
        created_status = await status_collection.find_one({"_id": result.inserted_id})
        if not created_status:
            raise HTTPException(status_code=500, detail="Failed to retrieve the created status check.")
        return StatusCheck(**created_status)
    except Exception as e:
        logger.error(f"Failed to create status check: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while creating the status check.")

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks(limit: int = 100):
    """Retrieves a list of status checks from the database."""
    try:
        status_checks_cursor = status_collection.find().limit(limit)
        status_checks = await status_checks_cursor.to_list(length=limit)
        return [StatusCheck(**check) for check in status_checks]
    except Exception as e:
        logger.error(f"Failed to retrieve status checks: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while retrieving status checks.")

# --- APP LIFECYCLE AND MIDDLEWARE ---

app.include_router(api_router)

# Add secure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=os.getenv('ALLOW_CREDENTIALS', 'False').lower() == 'true',
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
def shutdown_db_client():
    client.close()
    logger.info("MongoDB connection closed.")

logger.info("🚀 Legacy server started.")
logger.info(f"🔗 Allowed CORS Origins: {CORS_ORIGINS}")
