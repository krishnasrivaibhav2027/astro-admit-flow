"""
Google Forms API Service
Creates and manages Google Forms programmatically for student access requests.
Uses service account JSON file for authentication.
"""

import os
import logging
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Cache for the created form URL
_cached_form_url = None
_cached_form_id = None

# Scopes required for Forms API
SCOPES = [
    'https://www.googleapis.com/auth/forms.body',
    'https://www.googleapis.com/auth/forms.responses.readonly',
    'https://www.googleapis.com/auth/drive.file'
]

def get_google_credentials():
    """Get Google API credentials from service account JSON file."""
    # Look for service account JSON in backend directory
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Find the gen-ai-project JSON file
    json_file = None
    for filename in os.listdir(backend_dir):
        if filename.startswith('gen-ai-project') and filename.endswith('.json'):
            json_file = os.path.join(backend_dir, filename)
            break
    
    if not json_file or not os.path.exists(json_file):
        logging.warning("Service account JSON file not found in backend directory")
        return None
    
    try:
        creds = service_account.Credentials.from_service_account_file(
            json_file,
            scopes=SCOPES
        )
        logging.info(f"✅ Loaded service account credentials from {json_file}")
        return creds
    except Exception as e:
        logging.error(f"Error loading service account credentials: {e}")
        return None


def get_preconfigured_form_url():
    """
    Get a pre-configured Google Form URL from environment variable.
    This is the fallback when programmatic form creation isn't available.
    """
    form_url = os.environ.get('GOOGLE_FORM_ACCESS_REQUEST_URL')
    if form_url:
        logging.info(f"✅ Using pre-configured form URL")
        return form_url
    return None


def create_access_request_form(institution_name: str = None):
    """
    Create a Google Form for student access requests.
    Returns the form URL that can be shared with students.
    Falls back to pre-configured URL if programmatic creation fails.
    """
    global _cached_form_url, _cached_form_id
    
    # First check for pre-configured form URL (most reliable)
    preconfigured_url = get_preconfigured_form_url()
    if preconfigured_url:
        _cached_form_url = preconfigured_url
        return preconfigured_url, None
    
    # Try to create form programmatically
    creds = get_google_credentials()
    if not creds:
        return None, "Google credentials not configured. Please set GOOGLE_FORM_ACCESS_REQUEST_URL in .env"
    
    try:
        # Build the Forms API service
        service = build('forms', 'v1', credentials=creds)
        
        # Create form structure
        form_title = f"Student Access Request - AdmitFlow"
        if institution_name:
            form_title = f"Student Access Request - {institution_name}"
        
        # Create the form
        form = {
            "info": {
                "title": form_title,
                "documentTitle": form_title
            }
        }
        
        result = service.forms().create(body=form).execute()
        form_id = result['formId']
        
        # Add questions to the form using batch update
        requests = [
            # Question 1: Full Name
            {
                "createItem": {
                    "item": {
                        "title": "Full Name",
                        "description": "Enter your full name as per official documents",
                        "questionItem": {
                            "question": {
                                "required": True,
                                "textQuestion": {
                                    "paragraph": False
                                }
                            }
                        }
                    },
                    "location": {"index": 0}
                }
            },
            # Question 2: Email
            {
                "createItem": {
                    "item": {
                        "title": "Email Address",
                        "description": "You will receive login instructions at this email",
                        "questionItem": {
                            "question": {
                                "required": True,
                                "textQuestion": {
                                    "paragraph": False
                                }
                            }
                        }
                    },
                    "location": {"index": 1}
                }
            },
            # Question 3: Phone
            {
                "createItem": {
                    "item": {
                        "title": "Phone Number",
                        "description": "Your contact number (optional)",
                        "questionItem": {
                            "question": {
                                "required": False,
                                "textQuestion": {
                                    "paragraph": False
                                }
                            }
                        }
                    },
                    "location": {"index": 2}
                }
            },
            # Question 4: Stream/Course
            {
                "createItem": {
                    "item": {
                        "title": "Stream / Course Applied",
                        "description": "Select your preferred stream",
                        "questionItem": {
                            "question": {
                                "required": True,
                                "choiceQuestion": {
                                    "type": "RADIO",
                                    "options": [
                                        {"value": "Science (PCM/PCB)"},
                                        {"value": "Commerce"},
                                        {"value": "Arts / Humanities"},
                                        {"value": "Engineering"},
                                        {"value": "Medical"},
                                        {"value": "Other"}
                                    ]
                                }
                            }
                        }
                    },
                    "location": {"index": 3}
                }
            }
        ]
        
        # Update the form with questions
        service.forms().batchUpdate(
            formId=form_id,
            body={"requests": requests}
        ).execute()
        
        # Get the form URL
        form_url = f"https://docs.google.com/forms/d/{form_id}/viewform"
        
        # Cache for future use
        _cached_form_url = form_url
        _cached_form_id = form_id
        
        logging.info(f"✅ Created Google Form: {form_url}")
        return form_url, None
        
    except HttpError as e:
        logging.error(f"Google Forms API error: {e}")
        return None, str(e)
    except Exception as e:
        logging.error(f"Error creating form: {e}")
        return None, str(e)


def get_form_responses(form_id: str = None):
    """
    Get responses from a Google Form.
    Returns list of form responses.
    """
    global _cached_form_id
    
    if not form_id:
        form_id = _cached_form_id
    
    if not form_id:
        return [], "No form ID available"
    
    creds = get_google_credentials()
    if not creds:
        return [], "Google credentials not configured"
    
    try:
        service = build('forms', 'v1', credentials=creds)
        
        # Get form responses
        response = service.forms().responses().list(formId=form_id).execute()
        responses = response.get('responses', [])
        
        # Parse responses into usable format
        parsed_responses = []
        for resp in responses:
            answers = resp.get('answers', {})
            parsed = {
                'response_id': resp.get('responseId'),
                'create_time': resp.get('createTime'),
                'name': '',
                'email': '',
                'phone': '',
                'stream': ''
            }
            
            # Extract answers (question IDs need to be mapped)
            for question_id, answer_data in answers.items():
                text_answers = answer_data.get('textAnswers', {}).get('answers', [])
                if text_answers:
                    # Map based on order (fragile, but works for now)
                    parsed_responses.append(parsed)
            
            parsed_responses.append(parsed)
        
        return parsed_responses, None
        
    except HttpError as e:
        logging.error(f"Google Forms API error: {e}")
        return [], str(e)
    except Exception as e:
        logging.error(f"Error getting responses: {e}")
        return [], str(e)


def get_cached_form_url():
    """Return the cached form URL if available."""
    return _cached_form_url
