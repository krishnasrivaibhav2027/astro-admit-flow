import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

try:
    import firebase_admin
    from firebase_admin import credentials, auth
except Exception:
    firebase_admin = None
    credentials = None
    auth = None


def initialize_firebase():
    """Initialize Firebase Admin SDK.

    Initialization will try the following, in order:
    - If `backend/firebase-service-account.json` exists, use it.
    - Else, if `GOOGLE_APPLICATION_CREDENTIALS` is set, rely on ADC.
    - Else, call `firebase_admin.initialize_app()` without creds and let the
      Admin SDK attempt to use ADC (may fail if no creds available).

    This function logs guidance if initialization cannot be completed.
    """
    if firebase_admin is None:
        logger.error("firebase_admin package is not available. Please install `firebase-admin`.")
        return

    # Avoid re-initializing
    try:
        if firebase_admin._apps:
            logger.info("Firebase Admin already initialized")
            return
    except Exception:
        # If attribute missing, proceed to initialize
        pass

    svc_path = Path(__file__).parent / 'firebase-service-account.json'
    try:
        # Prefer explicit GOOGLE_APPLICATION_CREDENTIALS if provided
        gcred = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
        if gcred:
            try:
                gpath = Path(gcred)
                if gpath.exists():
                    cred = credentials.Certificate(str(gpath))
                else:
                    # Fallback to ADC if path is not a file
                    cred = credentials.ApplicationDefault()
                firebase_admin.initialize_app(cred)
                logger.info(f"Initialized Firebase Admin using GOOGLE_APPLICATION_CREDENTIALS: {gcred}")
                return
            except Exception as e:
                logger.warning(f"Failed to initialize with GOOGLE_APPLICATION_CREDENTIALS '{gcred}': {e}")

        # Next, try local service account file inside the repo
        if svc_path.exists():
            try:
                cred = credentials.Certificate(str(svc_path))
                firebase_admin.initialize_app(cred)
                logger.info(f"Initialized Firebase Admin using service account file: {svc_path}")
                return
            except Exception as e:
                logger.warning(f"Failed to initialize with local service account file: {e}")

        # Final attempt: initialize without explicit credentials
        try:
            firebase_admin.initialize_app()
            logger.info("Initialized Firebase Admin with default settings")
            return
        except Exception as e:
            logger.error(f"Could not initialize Firebase Admin SDK: {e}")
            logger.error("Provide a service account JSON at backend/firebase-service-account.json or set GOOGLE_APPLICATION_CREDENTIALS to enable secure token verification.")

    except Exception as e:
        logger.error(f"Unexpected error during Firebase initialization: {e}")


def verify_firebase_token(id_token: str) -> dict:
    """Verify Firebase ID token via Firebase Admin SDK.

    Returns decoded token claims (dict) on success. Raises ValueError on failure.
    """
    if firebase_admin is None or auth is None:
        raise ValueError("firebase_admin is not available. Install firebase-admin and initialize with service account or ADC.")

    try:
        decoded = auth.verify_id_token(id_token)
        logger.info(f"Firebase Admin verified token for uid={decoded.get('uid')}, email={decoded.get('email')}")
        return decoded
    except Exception as e:
        logger.warning(f"Firebase Admin token verification failed: {e}")
        raise ValueError("Invalid or expired Firebase ID token")
