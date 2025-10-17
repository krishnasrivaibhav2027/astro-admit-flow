import os
import logging
import firebase_admin
from firebase_admin import credentials, auth

logger = logging.getLogger(__name__)

# Initialize Firebase Admin SDK
def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    try:
        # Check if already initialized
        if firebase_admin._apps:
            logger.info("✅ Firebase Admin already initialized")
            return
        
        # Initialize with project ID (no service account needed for token verification)
        firebase_admin.initialize_app(options={
            'projectId': os.environ.get('FIREBASE_PROJECT_ID', 'ai-admission-26c27')
        })
        logger.info("✅ Firebase Admin initialized successfully")
    except Exception as e:
        logger.error(f"❌ Firebase initialization error: {e}")
        raise


def verify_firebase_token(id_token: str) -> dict:
    """Verify Firebase ID token and return decoded claims"""
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except auth.InvalidIdTokenError:
        raise ValueError("Invalid Firebase ID token")
    except auth.ExpiredIdTokenError:
        raise ValueError("Firebase ID token has expired")
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        raise ValueError(f"Token verification failed: {str(e)}")
