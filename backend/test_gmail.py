import os
import sys
import base64
import logging
from email.mime.text import MIMEText
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)

# Load env variables from backend/.env
# Assuming script is run from project root, path is backend/.env
# If run from backend dir, path is .env
if os.path.exists('backend/.env'):
    load_dotenv('backend/.env')
elif os.path.exists('.env'):
    load_dotenv('.env')
else:
    print("⚠️ .env file not found!")

def test_email(to_email):
    print(f"Testing email to {to_email}...")
    client_id = os.environ.get('GMAIL_CLIENT_ID')
    client_secret = os.environ.get('GMAIL_CLIENT_SECRET')
    refresh_token = os.environ.get('GMAIL_REFRESH_TOKEN')
    
    if not all([client_id, client_secret, refresh_token]):
        print("❌ ERROR: Missing credentials in .env")
        print(f"GMAIL_CLIENT_ID: {'SET' if client_id else 'MISSING'}")
        print(f"GMAIL_CLIENT_SECRET: {'SET' if client_secret else 'MISSING'}")
        print(f"GMAIL_REFRESH_TOKEN: {'SET' if refresh_token else 'MISSING'}")
        return

    try:
        print("Attempting to refresh credentials...")
        creds = Credentials(
            None,
            refresh_token=refresh_token,
            token_uri='https://oauth2.googleapis.com/token',
            client_id=client_id,
            client_secret=client_secret,
            scopes=['https://www.googleapis.com/auth/gmail.send']
        )
        creds.refresh(Request())
        print("Credentials refreshed. Building service...")
        
        service = build('gmail', 'v1', credentials=creds)
        
        message = MIMEText("This is a test email from AdmitAI backend verifies your credentials are working.")
        message['to'] = to_email
        message['from'] = os.environ.get('GMAIL_FROM_EMAIL', 'noreply@admitai.com')
        message['subject'] = "Test Email - AdmitAI Debug"
        
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        sent_msg = service.users().messages().send(userId="me", body={'raw': raw}).execute()
        print(f"✅ SUCCESS: Email sent! Message ID: {sent_msg.get('id')}")
    except Exception as e:
        print(f"❌ ERROR: Failed to send email: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python backend/test_gmail.py <your_email_address>")
    else:
        test_email(sys.argv[1])
