# Institution Access Control Routes
# backend/institution_routes.py

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict
from datetime import datetime, timezone, timedelta
import logging
import os
import uuid
import base64
from email.mime.text import MIMEText

from supabase import create_client, Client
from auth_dependencies import get_current_user

# Initialize Supabase
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_KEY')
supabase: Client = create_client(supabase_url, supabase_key)

# Service role client for admin operations
service_role_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

institution_router = APIRouter(prefix="/api/institutions", tags=["institutions"])

# ============================================
# MODELS
# ============================================

class InstitutionResponse(BaseModel):
    id: str
    name: str
    type: str
    state: Optional[str] = None
    status: str

class ValidateMemberRequest(BaseModel):
    email: str
    institution_id: str
    role: str  # 'student' or 'admin'

class StudentAccessRequest(BaseModel):
    institution_id: str
    name: str
    email: str
    phone: Optional[str] = None
    stream_applied: Optional[str] = None
    scorecard_url: str

class OrgRegistrationRequest(BaseModel):
    org_name: str
    org_type: str  # 'school', 'college', 'coaching'
    website: Optional[str] = None
    affiliation_number: Optional[str] = None
    state: Optional[str] = None
    admin_name: str
    admin_email: str
    admin_phone: Optional[str] = None
    admin_designation: Optional[str] = None


# ============================================
# EMAIL HELPER FUNCTIONS
# ============================================

async def send_application_submitted_email(
    to_email: str,
    student_name: str, 
    institution_name: str
) -> bool:
    """
    Send confirmation email when student application is submitted.
    Uses Gmail API with OAuth credentials.
    """
    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build
        
        client_id = os.environ.get('GMAIL_CLIENT_ID')
        client_secret = os.environ.get('GMAIL_CLIENT_SECRET')
        refresh_token = os.environ.get('GMAIL_REFRESH_TOKEN')
        
        if not all([client_id, client_secret, refresh_token]):
            logging.warning("📧 Gmail credentials not configured - skipping email")
            return False
        
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
Dear {student_name},

Thank you for applying to {institution_name}!

Your application has been received and is currently under review. The institution admin will evaluate your submitted scorecard and make a decision.

You will receive another email once your application has been reviewed.

What happens next:
• The institution will review your scorecard
• If approved, you'll receive a magic link to complete registration
• If additional information is needed, they will contact you

If you have any questions, please contact the institution directly.

Best regards,
AdmitAI Team
        """)
        message['to'] = to_email
        message['from'] = os.environ.get('GMAIL_FROM_EMAIL', 'noreply@admitai.com')
        message['subject'] = f"Application Received - {institution_name}"
        
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        service.users().messages().send(userId="me", body={'raw': raw}).execute()
        
        logging.info(f"📧 Application submitted email sent to {to_email}")
        return True
        
    except Exception as e:
        logging.error(f"❌ Failed to send application email: {e}")
        return False


def send_approval_email(
    to_email: str,
    student_name: str,
    institution_name: str,
    magic_link: str
) -> bool:
    """
    Send approval email with magic link when student application is approved.
    Uses Gmail API with OAuth credentials.
    """
    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build
        
        client_id = os.environ.get('GMAIL_CLIENT_ID')
        client_secret = os.environ.get('GMAIL_CLIENT_SECRET')
        refresh_token = os.environ.get('GMAIL_REFRESH_TOKEN')
        
        if not all([client_id, client_secret, refresh_token]):
            logging.warning("📧 Gmail credentials not configured - skipping email")
            return False
        
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
Dear {student_name},

🎉 Congratulations! Your application to {institution_name} has been APPROVED!

You can now complete your registration using the magic link below:

👉 {magic_link}

This link will expire in 7 days. Please use it to set up your account and access the platform.

What's next:
• Click the magic link above to complete registration
• Set up your password
• Start your learning journey with {institution_name}!

If you have any questions, please contact the institution directly.

Welcome aboard!
AdmitAI Team
        """)
        message['to'] = to_email
        message['from'] = os.environ.get('GMAIL_FROM_EMAIL', 'noreply@admitai.com')
        message['subject'] = f"🎉 Application Approved - {institution_name}"
        
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        service.users().messages().send(userId="me", body={'raw': raw}).execute()
        
        logging.info(f"📧 Approval email sent to {to_email}")
        return True
        
    except Exception as e:
        logging.error(f"❌ Failed to send approval email: {e}")
        return False


def send_institution_approval_email(
    to_email: str,
    admin_name: str,
    institution_name: str
) -> bool:
    """
    Send approval email to institution admin when their institution is approved.
    """
    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build
        
        client_id = os.environ.get('GMAIL_CLIENT_ID')
        client_secret = os.environ.get('GMAIL_CLIENT_SECRET')
        refresh_token = os.environ.get('GMAIL_REFRESH_TOKEN')
        
        if not all([client_id, client_secret, refresh_token]):
            logging.warning("📧 Gmail credentials not configured - skipping email")
            return False
        
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
Dear {admin_name},

🎉 Congratulations! Your institution "{institution_name}" has been APPROVED on AdmitAI!

Your admin account is now active. You can login to the dashboard to start managing student access requests.

Login here: http://localhost:3000/login

What you can do now:
• Review incoming student access requests
• Manage study materials
• View student analytics

If you have any questions, please contact our support team.

Welcome to AdmitAI!
The AdmitAI Team
        """)
        message['to'] = to_email
        message['from'] = os.environ.get('GMAIL_FROM_EMAIL', 'noreply@admitai.com')
        message['subject'] = f"✅ Institution Approved - {institution_name}"
        
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        service.users().messages().send(userId="me", body={'raw': raw}).execute()
        
        logging.info(f"📧 Institution approval email sent to {to_email}")
        return True
        
    except Exception as e:
        logging.error(f"❌ Failed to send institution approval email: {e}")
        return False


def send_institution_rejection_email(
    to_email: str,
    admin_name: str,
    institution_name: str,
    reason: str
) -> bool:
    """
    Send rejection email to institution admin when their institution is rejected.
    """
    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build
        
        client_id = os.environ.get('GMAIL_CLIENT_ID')
        client_secret = os.environ.get('GMAIL_CLIENT_SECRET')
        refresh_token = os.environ.get('GMAIL_REFRESH_TOKEN')
        
        if not all([client_id, client_secret, refresh_token]):
            logging.warning("📧 Gmail credentials not configured - skipping email")
            return False
        
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
Dear {admin_name},

Thank you for your interest in AdmitAI.

We've reviewed your registration for "{institution_name}". Unfortunately, we are unable to approve your application at this time.

Reason for rejection:
{reason}

If you believe this is an error or would like to provide additional information, please reply to this email or contact our support team.

Best regards,
The AdmitAI Team
        """)
        message['to'] = to_email
        message['from'] = os.environ.get('GMAIL_FROM_EMAIL', 'noreply@admitai.com')
        message['subject'] = f"Update on your AdmitAI Registration - {institution_name}"
        
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        service.users().messages().send(userId="me", body={'raw': raw}).execute()
        
        logging.info(f"📧 Institution rejection email sent to {to_email}")
        return True
        
    except Exception as e:
        logging.error(f"❌ Failed to send institution rejection email: {e}")
        return False


def send_student_rejection_email(
    to_email: str,
    student_name: str,
    institution_name: str,
    reason: str
) -> bool:
    """
    Send rejection email to student when their access request is rejected.
    """
    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build
        
        client_id = os.environ.get('GMAIL_CLIENT_ID')
        client_secret = os.environ.get('GMAIL_CLIENT_SECRET')
        refresh_token = os.environ.get('GMAIL_REFRESH_TOKEN')
        
        if not all([client_id, client_secret, refresh_token]):
            logging.warning("📧 Gmail credentials not configured - skipping email")
            return False
        
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
Dear {student_name},

Thank you for your interest in joining {institution_name}.

We have reviewed your scorecard and application. Unfortunately, we are unable to approve your request at this time.

Reason for rejection:
{reason}

You may re-apply after 24 hours if you have updated documents or believe this decision was made in error.

If you have questions, please contact the institution directly.

Best regards,
AdmitAI Team
        """)
        message['to'] = to_email
        message['from'] = os.environ.get('GMAIL_FROM_EMAIL', 'noreply@admitai.com')
        message['subject'] = f"Update on your application to {institution_name}"
        
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        service.users().messages().send(userId="me", body={'raw': raw}).execute()
        
        logging.info(f"📧 Student rejection email sent to {to_email}")
        return True
        
    except Exception as e:
        logging.error(f"❌ Failed to send student rejection email: {e}")
        return False


# ============================================
# PUBLIC ENDPOINTS
# ============================================

@institution_router.get("")
async def get_approved_institutions():
    """
    Get list of approved institutions for dropdown.
    PUBLIC endpoint - no auth required.
    Uses service role key to bypass RLS.
    """
    try:
        # Use service role to bypass RLS
        if service_role_key:
            admin_supabase: Client = create_client(supabase_url, service_role_key)
            response = admin_supabase.table("institutions") \
                .select("id, name, type, state") \
                .eq("status", "approved") \
                .order("name") \
                .execute()
        else:
            response = supabase.table("institutions") \
                .select("id, name, type, state") \
                .eq("status", "approved") \
                .order("name") \
                .execute()
        
        logging.info(f"📋 Fetched {len(response.data or [])} institutions")
        return response.data or []
    except Exception as e:
        logging.error(f"Error fetching institutions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@institution_router.post("/validate-member")
async def validate_institution_member(request: ValidateMemberRequest):
    """
    Validate if a user belongs to an institution after authentication.
    Called from frontend after Supabase Auth completes.
    
    Returns:
    - valid: True if user is authorized
    - is_super_admin: True if user is a platform super admin
    - institution_name: Name of institution (if applicable)
    """
    try:
        email = request.email.lower()
        
        # Use service role to bypass RLS for admin tables
        admin_client = create_client(supabase_url, service_role_key) if service_role_key else supabase
        
        # 1. First check if user is a super admin (bypasses institution check)
        super_admin_res = admin_client.table("super_admins") \
            .select("id, name") \
            .eq("email", email) \
            .execute()
        
        logging.info(f"🔍 Super admin check for {email}: {len(super_admin_res.data or [])} results")
        
        if super_admin_res.data:
            return {
                "valid": True,
                "is_super_admin": True,
                "institution_name": None,
                "message": "Super admin access granted"
            }
        
        # 2. Check based on role
        if request.role == 'student':
            # Check if student exists with this institution
            student_res = supabase.table("students") \
                .select("id, institution_id") \
                .eq("email", email) \
                .eq("institution_id", request.institution_id) \
                .execute()
            
            if student_res.data:
                # Get institution name
                inst_res = supabase.table("institutions") \
                    .select("name") \
                    .eq("id", request.institution_id) \
                    .execute()
                
                return {
                    "valid": True,
                    "is_super_admin": False,
                    "institution_name": inst_res.data[0]["name"] if inst_res.data else None,
                    "message": "Student access granted"
                }
            else:
                return {
                    "valid": False,
                    "is_super_admin": False,
                    "institution_name": None,
                    "message": "You are not registered with this institution. Please apply for access first."
                }
        
        else:  # admin role
            # 1. First check the admins table (unified admin table)
            admin_res = admin_client.table("admins") \
                .select("id, institution_id, admin_type") \
                .eq("email", email) \
                .execute()
            
            if admin_res.data:
                admin = admin_res.data[0]
                admin_inst_id = admin.get("institution_id")
                
                # institution_id = NULL means access to ALL institutions (test/super admin)
                # OR institution_id matches the selected institution
                # OR request.institution_id is "bypass" (global dashboard access)
                if admin_inst_id is None or admin_inst_id == request.institution_id or request.institution_id == "bypass":
                    
                    inst_name = None
                    # Only fetch institution name if we have a valid UUID request that isn't excluded
                    if request.institution_id and request.institution_id != "bypass":
                        try:
                            # Get institution name
                            inst_res = admin_client.table("institutions") \
                                .select("name") \
                                .eq("id", request.institution_id) \
                                .execute()
                            if inst_res.data:
                                inst_name = inst_res.data[0]["name"]
                        except Exception:
                            # If UUID is invalid or not found, ignore
                            pass
                    
                    # Treat as super admin if institution_id is NULL (all-access)
                    is_super = admin_inst_id is None
                    
                    return {
                        "valid": True,
                        "is_super_admin": is_super,
                        "institution_name": inst_name,
                        "message": "Admin access granted"
                    }
            
            # 2. Fallback: Check admins table
            admin_res = admin_client.table("admins") \
                .select("id, institution_id, role") \
                .eq("email", email) \
                .eq("institution_id", request.institution_id) \
                .execute()
            
            if admin_res.data:
                # Get institution name
                inst_res = admin_client.table("institutions") \
                    .select("name") \
                    .eq("id", request.institution_id) \
                    .execute()
                
                return {
                    "valid": True,
                    "is_super_admin": False,
                    "institution_name": inst_res.data[0]["name"] if inst_res.data else None,
                    "message": "Institution admin access granted"
                }
            
            return {
                "valid": False,
                "is_super_admin": False,
                "institution_name": None,
                "message": "You are not registered as an admin for this institution."
            }
    
    except Exception as e:
        logging.error(f"Error validating institution member: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@institution_router.post("/revoke-unauthorized")
async def revoke_unauthorized_user(email: str):
    """
    Revoke authentication for unauthorized users.
    Deletes user from auth.users within 5 seconds of failed validation.
    Requires service role key.
    """
    try:
        if not service_role_key:
            raise HTTPException(status_code=500, detail="Service role key not configured")
        
        admin_supabase: Client = create_client(supabase_url, service_role_key)
        
        # Find user by email
        response = admin_supabase.auth.admin.list_users()
        users = response if isinstance(response, list) else response.users
        target_user = next((u for u in users if u.email == email), None)
        
        if target_user:
            # Delete the user
            admin_supabase.auth.admin.delete_user(target_user.id)
            logging.info(f"🚫 Revoked unauthorized user: {email}")
            return {"success": True, "message": "User authentication revoked"}
        
        return {"success": False, "message": "User not found"}
    
    except Exception as e:
        logging.error(f"Error revoking user: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# STUDENT ACCESS REQUEST ENDPOINTS
# ============================================

@institution_router.post("/student-access/request")
async def submit_student_access_request(request: StudentAccessRequest):
    """
    Submit a student access request with scorecard.
    Implements 24-hour cooldown for re-applications after rejection.
    """
    try:
        email = request.email.lower()
        
        # 1. Check if student already has an approved account at ANY institution
        existing_student = supabase.table("students") \
            .select("id, institution_id") \
            .eq("email", email) \
            .not_.is_("institution_id", "null") \
            .execute()
        
        if existing_student.data:
            raise HTTPException(
                status_code=400,
                detail="You are already registered with an institution. Students can only belong to one institution."
            )
        
        # 2. Check for pending request at this institution
        pending_request = supabase.table("student_access_requests") \
            .select("id") \
            .eq("email", email) \
            .eq("institution_id", request.institution_id) \
            .eq("status", "pending") \
            .execute()
        
        if pending_request.data:
            raise HTTPException(
                status_code=400,
                detail="You already have a pending request for this institution. Please wait for review."
            )
        
        # 3. Check 24-hour cooldown for rejected re-applications
        last_rejected = supabase.table("student_access_requests") \
            .select("last_document_upload_at") \
            .eq("email", email) \
            .eq("institution_id", request.institution_id) \
            .eq("status", "rejected") \
            .order("last_document_upload_at", desc=True) \
            .limit(1) \
            .execute()
        
        if last_rejected.data:
            last_upload = datetime.fromisoformat(last_rejected.data[0]["last_document_upload_at"].replace("Z", "+00:00"))
            time_since = datetime.now(timezone.utc) - last_upload
            
            if time_since < timedelta(hours=24):
                hours_remaining = 24 - (time_since.total_seconds() / 3600)
                raise HTTPException(
                    status_code=400,
                    detail=f"Please wait {int(hours_remaining)} hours before re-applying to this institution."
                )
        
        # 4. Submit new access request
        response = supabase.table("student_access_requests").insert({
            "institution_id": request.institution_id,
            "name": request.name,
            "email": email,
            "phone": request.phone,
            "stream_applied": request.stream_applied,
            "scorecard_url": request.scorecard_url,
            "status": "pending",
            "last_document_upload_at": datetime.now(timezone.utc).isoformat()
        }).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to submit access request")
        
        # 5. Send confirmation email (non-blocking - failure doesn't affect submission)
        try:
            inst_res = supabase.table("institutions").select("name").eq("id", request.institution_id).execute()
            institution_name = inst_res.data[0]["name"] if inst_res.data else "Your Selected Institution"
            await send_application_submitted_email(email, request.name, institution_name)
        except Exception as email_err:
            logging.warning(f"⚠️ Could not send confirmation email: {email_err}")
        
        return {
            "success": True,
            "message": "Your access request has been submitted. You will receive an email once reviewed.",
            "request_id": response.data[0]["id"]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error submitting student access request: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@institution_router.post("/student-access/request/form")
async def submit_student_access_request_form(
    institution_id: str = Form(...),
    name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(""),
    stream_applied: str = Form(""),
    scorecard: Optional[UploadFile] = File(None),
    scorecard_url_input: str = Form("")
):
    """
    Submit a student access request with file upload OR Google Drive URL.
    Accepts either a file upload or a URL - one is required.
    """
    try:
        admin_client = create_client(supabase_url, service_role_key) if service_role_key else supabase
        email = email.lower().strip()
        
        logging.info(f"📝 Form application from {email} for institution {institution_id}")
        
        # 1. Check if student already has an approved account at ANY institution
        existing_student = admin_client.table("students") \
            .select("id, email") \
            .eq("email", email) \
            .execute()
        
        if existing_student.data:
            raise HTTPException(
                status_code=400,
                detail="You already have an approved student account. Please login instead."
            )
        
        # 2. Check for existing pending request for THIS institution
        pending_request = admin_client.table("student_access_requests") \
            .select("id") \
            .eq("email", email) \
            .eq("institution_id", institution_id) \
            .eq("status", "pending") \
            .execute()
        
        if pending_request.data:
            raise HTTPException(
                status_code=400,
                detail="You already have a pending request for this institution."
            )
        
        # 3. Check 24-hour cooldown for rejected applications
        last_rejected = admin_client.table("student_access_requests") \
            .select("last_document_upload_at") \
            .eq("email", email) \
            .eq("institution_id", institution_id) \
            .eq("status", "rejected") \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()
        
        if last_rejected.data and last_rejected.data[0].get("last_document_upload_at"):
            last_upload = datetime.fromisoformat(last_rejected.data[0]["last_document_upload_at"].replace("Z", "+00:00"))
            time_since = datetime.now(timezone.utc) - last_upload
            
            if time_since < timedelta(hours=24):
                hours_remaining = 24 - (time_since.total_seconds() / 3600)
                raise HTTPException(
                    status_code=400,
                    detail=f"Please wait {int(hours_remaining)} hours before re-applying to this institution."
                )
        
        # 4. Handle scorecard - either file upload or URL
        scorecard_url = None
        
        # Check if file was uploaded
        if scorecard and scorecard.filename:
            try:
                file_content = await scorecard.read()
                file_ext = scorecard.filename.split('.')[-1] if '.' in scorecard.filename else 'pdf'
                unique_filename = f"scorecards/{email.replace('@', '_at_')}_{uuid.uuid4().hex[:8]}.{file_ext}"
                
                # Upload to storage
                storage_response = admin_client.storage.from_("documents").upload(
                    unique_filename,
                    file_content,
                    {"content-type": scorecard.content_type or "application/octet-stream"}
                )
                
                # Get public URL
                scorecard_url = admin_client.storage.from_("documents").get_public_url(unique_filename)
                logging.info(f"📎 Scorecard uploaded: {scorecard_url}")
                
            except Exception as upload_err:
                logging.warning(f"⚠️ Scorecard upload failed: {upload_err}")
                scorecard_url = None
        
        # If no file, check for URL input
        if not scorecard_url and scorecard_url_input.strip():
            scorecard_url = scorecard_url_input.strip()
            logging.info(f"📎 Using Google Drive URL: {scorecard_url}")
        
        # Validate that we have at least one
        if not scorecard_url:
            raise HTTPException(
                status_code=400,
                detail="Please upload a scorecard file or provide a Google Drive link."
            )
        
        # 5. Submit access request
        response = admin_client.table("student_access_requests").insert({
            "institution_id": institution_id,
            "name": name.strip(),
            "email": email,
            "phone": phone.strip() if phone else None,
            "stream_applied": stream_applied.strip() if stream_applied else None,
            "scorecard_url": scorecard_url,
            "status": "pending",
            "last_document_upload_at": datetime.now(timezone.utc).isoformat()
        }).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to submit access request")
        
        # 6. Send confirmation email (non-blocking)
        try:
            inst_res = admin_client.table("institutions").select("name").eq("id", institution_id).execute()
            institution_name = inst_res.data[0]["name"] if inst_res.data else "Your Selected Institution"
            await send_application_submitted_email(email, name.strip(), institution_name)
        except Exception as email_err:
            logging.warning(f"⚠️ Could not send confirmation email: {email_err}")
        
        logging.info(f"✅ Application submitted successfully for {email}")
        
        return {
            "success": True,
            "message": "Your access request has been submitted. You will receive an email once reviewed.",
            "request_id": response.data[0]["id"]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error submitting student access request form: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@institution_router.get("/student-access/status")
async def get_student_access_status(email: str):
    """
    Get status of a student's access requests.
    """
    try:
        response = supabase.table("student_access_requests") \
            .select("id, institution_id, status, rejection_reason, created_at, institutions(name)") \
            .eq("email", email.lower()) \
            .order("created_at", desc=True) \
            .execute()
        
        return response.data or []
    
    except Exception as e:
        logging.error(f"Error fetching access status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# ORGANIZATION REGISTRATION ENDPOINTS
# ============================================

@institution_router.post("/org/register")
async def submit_org_registration(request: OrgRegistrationRequest):
    """
    Submit a new organization registration request.
    Creates institution (pending) and institution_admin (pending).
    """
    try:
        # Use service role client to bypass RLS for public registration
        admin_client = create_client(supabase_url, service_role_key) if service_role_key else supabase
        
        admin_email = request.admin_email.lower()
        
        # 1. Check if institution name already exists
        existing_inst = admin_client.table("institutions") \
            .select("id") \
            .eq("name", request.org_name) \
            .execute()
        
        if existing_inst.data:
            raise HTTPException(
                status_code=400,
                detail="An institution with this name already exists."
            )
        
        # 2. Check if admin email already registered
        existing_admin = admin_client.table("admins") \
            .select("id") \
            .eq("email", admin_email) \
            .execute()
        
        if existing_admin.data:
            raise HTTPException(
                status_code=400,
                detail="This email is already registered as an admin."
            )
        
        # 3. Create institution (pending status)
        inst_response = admin_client.table("institutions").insert({
            "name": request.org_name,
            "type": request.org_type,
            "website": request.website,
            "affiliation_number": request.affiliation_number,
            "state": request.state,
            "status": "pending"
        }).execute()
        
        if not inst_response.data:
            raise HTTPException(status_code=500, detail="Failed to create institution")
        
        institution_id = inst_response.data[0]["id"]
        
        # 4. Create institution admin (pending status)
        # Split name into first and last
        name_parts = request.admin_name.split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""
        
        admin_response = admin_client.table("admins").insert({
            "institution_id": institution_id,
            "email": admin_email,
            "first_name": first_name,
            "last_name": last_name,
            "role": "institution_admin"
            # "status": "pending" -- relying on DB default to avoid API schema cache issues
        }).execute()
        
        if not admin_response.data:
            # Rollback institution creation
            admin_client.table("institutions").delete().eq("id", institution_id).execute()
            raise HTTPException(status_code=500, detail="Failed to create admin record")
        
        return {
            "success": True,
            "message": "Your organization registration has been submitted for review. You will receive an email once approved.",
            "institution_id": institution_id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error submitting org registration: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# SUPER ADMIN APPROVAL ENDPOINTS
# ============================================

class ApprovalRequest(BaseModel):
    approved_by_email: str

class RejectionRequest(BaseModel):
    rejected_by_email: str
    reason: str


@institution_router.get("/pending")
async def get_pending_institutions():
    """Get all pending institution registrations (Super Admin only)."""
    try:
        admin_client = create_client(supabase_url, service_role_key) if service_role_key else supabase
        
        response = admin_client.table("institutions") \
            .select("*") \
            .eq("status", "pending") \
            .order("created_at", desc=True) \
            .execute()
        
        return response.data or []
    except Exception as e:
        logging.error(f"Error fetching pending institutions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@institution_router.get("/all")
async def get_all_institutions():
    """Get all institutions with their status (Super Admin only)."""
    try:
        admin_client = create_client(supabase_url, service_role_key) if service_role_key else supabase
        
        response = admin_client.table("institutions") \
            .select("*") \
            .order("created_at", desc=True) \
            .execute()
        
        return response.data or []
    except Exception as e:
        logging.error(f"Error fetching institutions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@institution_router.post("/approve/{institution_id}")
async def approve_institution(institution_id: str, request: ApprovalRequest):
    """
    Approve an institution registration (Super Admin only).
    - Updates institution status to 'approved'
    - Activates the institution admin
    - Sends approval email to admin
    """
    try:
        admin_client = create_client(supabase_url, service_role_key) if service_role_key else supabase
        
        # Verify requester is super admin
        super_check = admin_client.table("super_admins") \
            .select("id") \
            .eq("email", request.approved_by_email.lower()) \
            .execute()
        
        if not super_check.data:
            raise HTTPException(status_code=403, detail="Only super admins can approve institutions")
        
        # Update institution status
        admin_client.table("institutions").update({
            "status": "approved",
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "approved_by": super_check.data[0]["id"]
        }).eq("id", institution_id).execute()
        
        # Activate institution admin in admins table
        # admin_client.table("admins").update({
        #     "status": "active"
        # }).eq("institution_id", institution_id).execute()
        
        # Get institution and admin details for email
        inst_data = admin_client.table("institutions") \
            .select("name") \
            .eq("id", institution_id) \
            .execute()
            
        # Get admin details
        admin_data = admin_client.table("admins") \
            .select("email, first_name, last_name") \
            .eq("institution_id", institution_id) \
            .execute()
        
        if inst_data.data:
            inst_name = inst_data.data[0]["name"]
            
            if admin_data.data:
                admin_user = admin_data.data[0]
                admin_email = admin_user.get("email")
                admin_name = f"{admin_user.get('first_name', '')} {admin_user.get('last_name', '')}".strip() or "Admin"
            else:
                admin_email = None
                admin_name = "Admin"
            
            # Send email notification
            if admin_email:
                try:
                    send_institution_approval_email(admin_email, admin_name, inst_name)
                except Exception as e:
                    logging.warning(f"⚠️ Failed to send approval email to {admin_email}: {e}")
            else:
                logging.warning(f"⚠️ Approved {inst_name} but no admin email found")
        
        logging.info(f"✅ Approved institution {institution_id}")
        return {"success": True, "message": "Institution approved successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error approving institution: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@institution_router.post("/reject/{institution_id}")
async def reject_institution(institution_id: str, request: RejectionRequest):
    """
    Reject an institution registration (Super Admin only).
    - Updates institution status to 'rejected'
    - Sends rejection email with reason
    """
    try:
        admin_client = create_client(supabase_url, service_role_key) if service_role_key else supabase
        
        # Verify requester is super admin
        super_check = admin_client.table("super_admins") \
            .select("id") \
            .eq("email", request.rejected_by_email.lower()) \
            .execute()
        
        if not super_check.data:
            raise HTTPException(status_code=403, detail="Only super admins can reject institutions")
        
        # Update institution status
        admin_client.table("institutions").update({
            "status": "rejected",
            "rejection_reason": request.reason
        }).eq("id", institution_id).execute()
        
        # Get admin email for notification
        admin_res = admin_client.table("admins") \
            .select("email") \
            .eq("institution_id", institution_id) \
            .execute()
            
        inst_res = admin_client.table("institutions") \
            .select("name") \
            .eq("id", institution_id) \
            .execute()
        
        if inst_res.data and admin_res.data:
            inst_name = inst_res.data[0]["name"]
            admin_email = admin_res.data[0]["email"]
            
            # Send email notification
            if admin_email:
                try:
                    # In admins table, name is first_name + last_name. We don't have it here easily without query.
                    # But we can query it or just use "Admin".
                    send_institution_rejection_email(admin_email, "Admin", inst_name, request.reason)
                except Exception as e:
                    logging.warning(f"⚠️ Failed to send rejection email to {admin_email}: {e}")
            else:
                logging.info(f"❌ Rejected {inst_name} but no admin email found")
        
        logging.info(f"❌ Rejected institution {institution_id}: {request.reason}")
        return {"success": True, "message": "Institution rejected"}
    
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error rejecting institution: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# STUDENT ACCESS REQUEST MANAGEMENT
# ============================================

@institution_router.get("/student-requests/{institution_id}")
async def get_student_requests(institution_id: str):
    """Get all student access requests for an institution."""
    try:
        admin_client = create_client(supabase_url, service_role_key) if service_role_key else supabase
        
        response = admin_client.table("student_access_requests") \
            .select("*") \
            .eq("institution_id", institution_id) \
            .order("created_at", desc=True) \
            .execute()
        
        return response.data or []
    except Exception as e:
        logging.error(f"Error fetching student requests: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@institution_router.post("/student-access/approve/{request_id}")
async def approve_student_access(request_id: str, request: ApprovalRequest):
    """
    Approve a student access request (Institution Admin only).
    - Creates student account in auth.users
    - Adds to students table with institution_id
    - Sends approval email with magic link
    """
    try:
        admin_client = create_client(supabase_url, service_role_key) if service_role_key else supabase
        
        # Get the access request
        req_data = admin_client.table("student_access_requests") \
            .select("*, institutions(name)") \
            .eq("id", request_id) \
            .execute()
        
        if not req_data.data:
            raise HTTPException(status_code=404, detail="Request not found")
        
        student_req = req_data.data[0]
        
        if student_req["status"] != "pending":
            raise HTTPException(status_code=400, detail="Request already processed")
        
        # Verify requester is admin for this institution (check admins table)
        admin_check = admin_client.table("admins") \
            .select("id") \
            .eq("email", request.approved_by_email.lower()) \
            .eq("institution_id", student_req["institution_id"]) \
            .execute()
        
        # Also check if user is an admin in general (for multi-institution admins)
        admin_general_check = admin_client.table("admins") \
            .select("id") \
            .eq("email", request.approved_by_email.lower()) \
            .execute()
        
        # Also allow super admins
        super_check = admin_client.table("super_admins") \
            .select("id") \
            .eq("email", request.approved_by_email.lower()) \
            .execute()
        
        if not admin_check.data and not admin_general_check.data and not super_check.data:
            raise HTTPException(status_code=403, detail="Not authorized to approve this request")
        
        # Get reviewer_id from whichever check succeeded
        reviewer_id = None
        if admin_check.data:
            reviewer_id = admin_check.data[0]["id"]
        elif admin_general_check.data:
            reviewer_id = admin_general_check.data[0]["id"]
        
        # Generate magic link token
        magic_token = str(uuid.uuid4())
        magic_expires = datetime.now(timezone.utc) + timedelta(days=7)
        
        # Update request status
        admin_client.table("student_access_requests").update({
            "status": "approved",
            "reviewed_by": reviewer_id,
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
            "magic_link_token": magic_token,
            "magic_link_expires": magic_expires.isoformat()
        }).eq("id", request_id).execute()
        
        # Create student record (they'll set password via magic link)
        student_email = student_req["email"]
        student_name = student_req["name"]
        institution_id = student_req["institution_id"]
        institution_name = student_req.get("institutions", {}).get("name", "your institution")
        
        # Check if student already exists
        existing = admin_client.table("students") \
            .select("id") \
            .eq("email", student_email) \
            .execute()
        
        if not existing.data:
            # Create new student record
            name_parts = student_name.split(" ", 1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else ""
            
            admin_client.table("students").insert({
                "email": student_email,
                "first_name": first_name,
                "last_name": last_name,
                "institution_id": institution_id,
                "access_request_id": request_id,
                "role": "student",
                "phone": student_req.get("phone", ""),
                "age": 0,
                "dob": "2000-01-01"
            }).execute()
        else:
            # Update existing student with institution
            admin_client.table("students").update({
                "institution_id": institution_id,
                "access_request_id": request_id
            }).eq("email", student_email).execute()
        
        # Generate magic link URL
        magic_link = f"http://localhost:3000/signup?token={magic_token}&email={student_email}"
        
        # Send approval email with magic link
        try:
            send_approval_email(student_email, student_name, institution_name, magic_link)
            logging.info(f"📧 Approval email sent to {student_email}")
        except Exception as email_err:
            logging.warning(f"⚠️ Failed to send approval email: {email_err}")
        
        logging.info(f"✅ Approved student access: {student_email}")
        logging.info(f"🔗 Magic link: {magic_link}")
        
        return {
            "success": True, 
            "message": "Student access approved",
            "magic_link": magic_link  # For testing - remove in production
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error approving student access: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@institution_router.post("/student-access/reject/{request_id}")
async def reject_student_access(request_id: str, request: RejectionRequest):
    """
    Reject a student access request (Institution Admin only).
    - Updates status to 'rejected'
    - Sends rejection email with reason
    - Resets last_document_upload_at for 24-hour cooldown
    """
    try:
        admin_client = create_client(supabase_url, service_role_key) if service_role_key else supabase
        
        # Get the access request
        req_data = admin_client.table("student_access_requests") \
            .select("*, institutions(name)") \
            .eq("id", request_id) \
            .execute()
        
        if not req_data.data:
            raise HTTPException(status_code=404, detail="Request not found")
        
        student_req = req_data.data[0]
        
        # Verify requester is admin for this institution
        # Verify requester is admin for this institution
        admin_check = admin_client.table("admins") \
            .select("id") \
            .eq("email", request.rejected_by_email.lower()) \
            .eq("institution_id", student_req["institution_id"]) \
            .execute()
        
        # Also check general admins
        admin_general = admin_client.table("admins") \
            .select("id") \
            .eq("email", request.rejected_by_email.lower()) \
            .execute()
        
        # Also allow super admins
        super_check = admin_client.table("super_admins") \
            .select("id") \
            .eq("email", request.rejected_by_email.lower()) \
            .execute()
            
        if not admin_check.data and not admin_general.data and not super_check.data:
             raise HTTPException(status_code=403, detail="Not authorized to reject this request")
        

        

        
        reviewer_id = admin_check.data[0]["id"] if admin_check.data else None
        
        # Update request status
        admin_client.table("student_access_requests").update({
            "status": "rejected",
            "reviewed_by": reviewer_id,
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
            "rejection_reason": request.reason,
            "last_document_upload_at": datetime.now(timezone.utc).isoformat()  # Reset for 24h cooldown
        }).eq("id", request_id).execute()
        
        # Send rejection email
        try:
            institution_name = student_req.get("institutions", {}).get("name", "the institution")
            send_student_rejection_email(student_req['email'], student_req['name'], institution_name, request.reason)
        except Exception as e:
            logging.warning(f"⚠️ Failed to send student rejection email: {e}")
        
        logging.info(f"❌ Rejected student access: {student_req['email']}")
        return {"success": True, "message": "Student access rejected"}
    
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error rejecting student access: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# ADMIN CHECK ENDPOINT (for frontend)
# ============================================

@institution_router.get("/check-admin-type")
async def check_admin_type(email: str):
    """
    Check if email is super admin or institution admin.
    Used by frontend AdminLayout for proper access control.
    """
    try:
        admin_client = create_client(supabase_url, service_role_key) if service_role_key else supabase
        email = email.lower()
        
        # 1. Check super admin first
        super_check = admin_client.table("super_admins") \
            .select("id, name, first_name, last_name") \
            .eq("email", email) \
            .execute()
        
        if super_check.data:
            admin = super_check.data[0]
            name = admin.get("name") or f"{admin.get('first_name', '')} {admin.get('last_name', '')}".strip()
            return {
                "is_admin": True,
                "admin_type": "super_admin",
                "name": name or "Platform Admin",
                "institution_id": None
            }
        
        # 2. Check unified admins table (where institution admins are now stored)
        # Select * to avoid errors if specific columns (like admin_type) don't exist
        admin_check = admin_client.table("admins") \
            .select("*") \
            .eq("email", email) \
            .execute()
        
        if admin_check.data:
            admin = admin_check.data[0]
            # Handle 'role' vs 'admin_type' column difference
            admin_type = admin.get("admin_type") or admin.get("role") or "legacy_admin"
            
            # Normalize admin type for frontend
            if admin_type == "admin": 
                admin_type = "institution_admin"
                
            name = f"{admin.get('first_name', '')} {admin.get('last_name', '')}".strip()
            
            # Fetch institution name and website
            inst_name = None
            inst_website = None
            if admin.get("institution_id"):
                 # Separate query if join wasn't possible/requested or was empty
                 try:
                     inst_res = admin_client.table("institutions").select("name, website").eq("id", admin.get("institution_id")).execute()
                     if inst_res.data:
                         inst_name = inst_res.data[0]["name"]
                         inst_website = inst_res.data[0].get("website")
                 except:
                     pass
            
            return {
                "is_admin": True,
                "admin_type": admin_type,
                "name": name or "Admin",
                "institution_id": admin.get("institution_id"),
                "institution_name": inst_name,
                "institution_website": inst_website
            }
        
        # Not found in any admin table
        return {
            "is_admin": False,
            "admin_type": None,
            "name": None,
            "institution_id": None
        }
    
    except Exception as e:
        logging.error(f"Error checking admin type: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@institution_router.get("/all-student-requests")
async def get_all_student_requests(user_email: str):
    """
    Get all student access requests across ALL institutions.
    Restricted to Super Admins only.
    """
    try:
        # Use service role to bypass RLS
        admin_client = create_client(supabase_url, service_role_key) if service_role_key else supabase
        
        # Verify super admin status OR admin with null institution_id (global access)
        is_authorized = False
        
        # 1. Check super_admins
        super_check = admin_client.table("super_admins").select("id").eq("email", user_email).execute()
        if super_check.data:
            is_authorized = True
            
        # 2. Check admins with NULL institution_id
        if not is_authorized:
            global_admin = admin_client.table("admins") \
                .select("id") \
                .eq("email", user_email) \
                .is_("institution_id", "null") \
                .execute()
            if global_admin.data:
                is_authorized = True
        
        if not is_authorized:
            raise HTTPException(status_code=403, detail="Global access required")
            
        requests = admin_client.table("student_access_requests") \
            .select("*, institutions(name)") \
            .order("created_at", desc=True) \
            .execute()
            
        # Format response to include institution name flattened
        formatted = []
        for req in requests.data:
            req_data = dict(req)
            if req.get("institutions"):
                req_data["institution_name"] = req["institutions"]["name"]
            formatted.append(req_data)
            
        return formatted
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching all requests: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# ADMIN PROFILE UPDATE ENDPOINT
# ============================================

class AdminProfileUpdateRequest(BaseModel):
    email: str
    first_name: str
    last_name: str
    phone: Optional[str] = None

@institution_router.post("/update-profile")
async def update_admin_profile(request: AdminProfileUpdateRequest):
    """
    Update admin profile - works for super_admins and admins (unified table).
    Uses service role key to bypass RLS.
    """
    try:
        if not service_role_key:
            raise HTTPException(status_code=500, detail="Service role key not configured")

        admin_client: Client = create_client(supabase_url, service_role_key)
        
        # 1. Check super_admins first
        super_admin = admin_client.table("super_admins").select("*").eq("email", request.email).execute()
        if super_admin.data and len(super_admin.data) > 0:
            # Update super_admins table
            result = admin_client.table("super_admins").update({
                "first_name": request.first_name,
                "last_name": request.last_name,
                "phone": request.phone,
                "name": f"{request.first_name} {request.last_name}".strip(),
                "last_active_at": datetime.now(timezone.utc).isoformat()
            }).eq("email", request.email).execute()
            
            logging.info(f"✅ Updated super admin profile for {request.email}")
            return {"success": True, "admin_type": "super_admin"}
        
        # 2. Check unified admins table (includes institution admins and legacy admins)
        admin = admin_client.table("admins").select("*").eq("email", request.email).execute()
        if admin.data and len(admin.data) > 0:
            result = admin_client.table("admins").update({
                "first_name": request.first_name,
                "last_name": request.last_name,
                "phone": request.phone
            }).eq("email", request.email).execute()
            
            admin_type = admin.data[0].get("admin_type", "legacy_admin")
            logging.info(f"✅ Updated {admin_type} profile for {request.email}")
            return {"success": True, "admin_type": admin_type}
        
        raise HTTPException(status_code=404, detail="Admin not found in any table")
    
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating admin profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# GOOGLE FORMS API ENDPOINTS
# ============================================

@institution_router.get("/access-form")
async def get_access_request_form(institution_id: Optional[str] = None):
    """
    Get or create a Google Form for student access requests.
    Returns the Google Form URL that students can fill out.
    """
    try:
        from google_forms_service import create_access_request_form, get_cached_form_url
        
        # Check if we have a cached form
        cached_url = get_cached_form_url()
        if cached_url:
            return {"form_url": cached_url, "cached": True}
        
        # Get institution name if provided
        institution_name = None
        if institution_id:
            admin_client = create_client(supabase_url, service_role_key) if service_role_key else supabase
            inst = admin_client.table("institutions").select("name").eq("id", institution_id).execute()
            if inst.data:
                institution_name = inst.data[0].get("name")
        
        # Create new form
        form_url, error = create_access_request_form(institution_name)
        
        if error:
            logging.error(f"Failed to create Google Form: {error}")
            raise HTTPException(status_code=500, detail=f"Failed to create form: {error}")
        
        logging.info(f"✅ Created access request form: {form_url}")
        return {"form_url": form_url, "cached": False}
    
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting access form: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@institution_router.post("/access-form/sync-responses")
async def sync_form_responses():
    """
    Sync Google Form responses to the student_access_requests table.
    Called periodically or on-demand to import form submissions.
    """
    try:
        from google_forms_service import get_form_responses
        
        responses, error = get_form_responses()
        
        if error:
            raise HTTPException(status_code=500, detail=f"Failed to get responses: {error}")
        
        # TODO: Parse responses and insert into student_access_requests table
        # For now, just return the count
        
        return {"success": True, "responses_count": len(responses)}
    
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error syncing form responses: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class GoogleFormWebhookRequest(BaseModel):
    """Request model for Google Form webhook submissions."""
    institution_name: str
    full_name: str
    email: str
    phone: Optional[str] = None
    stream: Optional[str] = None
    scorecard_url: Optional[str] = None


@institution_router.post("/form-webhook")
async def google_form_webhook(request: GoogleFormWebhookRequest):
    """
    Webhook endpoint to receive Google Form submissions.
    Called by Google Apps Script when a form is submitted.
    Matches institution by name and creates student access request.
    """
    try:
        admin_client = create_client(supabase_url, service_role_key) if service_role_key else supabase
        
        email = request.email.lower().strip()
        institution_name = request.institution_name.strip()
        
        logging.info(f"📨 Form submission: {email} for institution '{institution_name}'")
        
        # 1. Find institution by name (case-insensitive partial match)
        inst_response = admin_client.table("institutions") \
            .select("id, name") \
            .ilike("name", f"%{institution_name}%") \
            .execute()
        
        if not inst_response.data:
            logging.warning(f"Institution not found: {institution_name}")
            return {
                "success": False,
                "error": f"Institution '{institution_name}' not found in system"
            }
        
        institution = inst_response.data[0]
        institution_id = institution["id"]
        
        logging.info(f"✅ Matched institution: {institution['name']} (ID: {institution_id})")
        
        # 2. Check for existing pending/approved request
        existing = admin_client.table("student_access_requests") \
            .select("id, status") \
            .eq("email", email) \
            .eq("institution_id", institution_id) \
            .in_("status", ["pending", "approved"]) \
            .execute()
        
        if existing.data:
            status = existing.data[0]["status"]
            return {
                "success": False,
                "error": f"Request already exists with status: {status}"
            }
        
        # 3. Create access request
        # Use provided scorecard_url or fallback
        scorecard = request.scorecard_url if request.scorecard_url else "Submitted via Google Form"
        
        request_data = {
            "institution_id": institution_id,
            "name": request.full_name.strip(),
            "email": email,
            "phone": request.phone.strip() if request.phone else None,
            "stream_applied": request.stream.strip() if request.stream else None,
            "status": "pending",
            "scorecard_url": scorecard,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        result = admin_client.table("student_access_requests") \
            .insert(request_data) \
            .execute()
        
        if result.data:
            logging.info(f"✅ Created access request for {email} at {institution['name']}")
            
            # Send confirmation email (non-blocking)
            try:
                await send_application_submitted_email(email, request.full_name.strip(), institution['name'])
            except Exception as email_err:
                logging.warning(f"⚠️ Could not send confirmation email: {email_err}")
            
            return {
                "success": True,
                "message": f"Request submitted to {institution['name']}",
                "request_id": result.data[0].get("id")
            }
        
        return {"success": False, "error": "Failed to create request"}
    
    except Exception as e:
        logging.error(f"Form webhook error: {e}")
        return {"success": False, "error": str(e)}
