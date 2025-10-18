import os
import logging
import firebase_admin
from firebase_admin import credentials, auth, exceptions

logger = logging.getLogger(__name__)

def initialize_firebase():
    """
    Initialize Firebase Admin SDK using the project ID from environment variables.
    Ensures that the app is initialized only once.
    """
    try:
        # Check if the app is already initialized
        firebase_admin.get_app()
        logger.info("✅ Firebase Admin already initialized")
    except ValueError:
        # Initialize with project ID (no service account needed for token verification)
        project_id = os.environ.get('FIREBASE_PROJECT_ID')
        if not project_id:
            logger.error("❌ FIREBASE_PROJECT_ID environment variable not set.")
            raise ValueError("FIREBASE_PROJECT_ID environment variable not set.")
            
        firebase_admin.initialize_app(options={
            'projectId': project_id
        })
        logger.info("✅ Firebase Admin initialized successfully")
    except Exception as e:
        logger.error(f"❌ Firebase initialization error: {e}")
        raise

def verify_firebase_token(id_token: str) -> dict:
    """
    Verify Firebase ID token and return decoded claims.
    Handles various authentication errors gracefully.
    """
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except exceptions.FirebaseError as e:
        logger.error(f"Firebase authentication error: {e}")
        # Specific handling for common errors
        if "Token expired" in str(e):
            raise ValueError("Firebase ID token has expired")
        elif "Invalid ID token" in str(e):
            raise ValueError("Invalid Firebase ID token")
        else:
            raise ValueError("Firebase token verification failed")
    except Exception as e:
        logger.error(f"An unexpected error occurred during token verification: {e}")
        raise ValueError("An unexpected error occurred during token verification")
