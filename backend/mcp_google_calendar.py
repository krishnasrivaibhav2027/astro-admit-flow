"""
Google Calendar Integration for MCP
====================================
Provides exam scheduling capabilities via Google Calendar API.
Uses existing Gmail OAuth credentials from .env file.
"""

import os
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, List
import logging

logger = logging.getLogger(__name__)

# Google Calendar API imports
try:
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    from googleapiclient.discovery import build
    GOOGLE_CALENDAR_AVAILABLE = True
except ImportError:
    GOOGLE_CALENDAR_AVAILABLE = False
    logger.warning("Google Calendar API not available. Install google-api-python-client")


# Calendar scopes - using the same OAuth as Gmail
SCOPES = ['https://www.googleapis.com/auth/calendar']


class GoogleCalendarService:
    """Service for Google Calendar operations using OAuth credentials."""
    
    def __init__(self):
        self.service = None
        self._initialize_service()
    
    def _initialize_service(self):
        """Initialize Google Calendar service with OAuth credentials from .env."""
        if not GOOGLE_CALENDAR_AVAILABLE:
            logger.error("Google Calendar API libraries not installed")
            return
        
        # Get OAuth credentials from environment (same as Gmail)
        client_id = os.environ.get('GMAIL_CLIENT_ID')
        client_secret = os.environ.get('GMAIL_CLIENT_SECRET')
        refresh_token = os.environ.get('GMAIL_REFRESH_TOKEN')
        access_token = os.environ.get('GMAIL_ACCESS_TOKEN')
        
        if not all([client_id, client_secret, refresh_token]):
            logger.error("Missing Gmail OAuth credentials in .env")
            return
        
        try:
            # Create credentials from OAuth tokens
            creds = Credentials(
                token=access_token,
                refresh_token=refresh_token,
                token_uri='https://oauth2.googleapis.com/token',
                client_id=client_id,
                client_secret=client_secret,
                scopes=SCOPES
            )
            
            # Refresh if expired
            if creds.expired and creds.refresh_token:
                try:
                    creds.refresh(Request())
                    logger.info("Refreshed OAuth credentials for Calendar")
                except Exception as e:
                    logger.warning(f"Failed to refresh credentials: {e}")
            
            self.service = build('calendar', 'v3', credentials=creds)
            logger.info("Google Calendar service initialized with OAuth credentials")
            
        except Exception as e:
            logger.error(f"Failed to initialize Calendar service: {e}")
    
    def schedule_exam(
        self,
        student_email: str,
        exam_title: str,
        exam_date: str,
        exam_time: str,
        duration_minutes: int = 60,
        subject: Optional[str] = None,
        level: Optional[int] = None,
        description: Optional[str] = None
    ) -> Dict:
        """
        Schedule an exam and create a Google Calendar event.
        
        Args:
            student_email: Student's email for calendar invite
            exam_title: Title of the exam
            exam_date: Date in YYYY-MM-DD format
            exam_time: Time in HH:MM format (24-hour)
            duration_minutes: Duration of exam in minutes
            subject: Subject (physics/math/chemistry)
            level: Level 1-5
            description: Optional description
        
        Returns:
            Dict with success status and event details
        """
        if not self.service:
            return {
                "success": False,
                "error": "Google Calendar service not initialized. Please configure credentials."
            }
        
        try:
            # Parse date and time
            start_datetime = datetime.strptime(f"{exam_date} {exam_time}", "%Y-%m-%d %H:%M")
            end_datetime = start_datetime + timedelta(minutes=duration_minutes)
            
            # Build event description
            event_description = description or ""
            if subject or level:
                event_description = f"Subject: {subject or 'N/A'}\nLevel: {level or 'N/A'}\n\n{event_description}"
            
            # Create event
            event = {
                'summary': exam_title,
                'description': event_description.strip(),
                'start': {
                    'dateTime': start_datetime.isoformat(),
                    'timeZone': 'Asia/Kolkata',  # IST
                },
                'end': {
                    'dateTime': end_datetime.isoformat(),
                    'timeZone': 'Asia/Kolkata',
                },
                'attendees': [
                    {'email': student_email},
                ],
                'reminders': {
                    'useDefault': False,
                    'overrides': [
                        {'method': 'email', 'minutes': 24 * 60},  # 1 day before
                        {'method': 'popup', 'minutes': 60},       # 1 hour before
                    ],
                },
            }
            
            # Insert event
            created_event = self.service.events().insert(
                calendarId='primary',
                body=event,
                sendUpdates='all'  # Send email invites
            ).execute()
            
            logger.info(f"Created calendar event: {created_event.get('id')}")
            
            return {
                "success": True,
                "event_id": created_event.get('id'),
                "event_link": created_event.get('htmlLink'),
                "scheduled_for": f"{exam_date} {exam_time}",
                "duration_minutes": duration_minutes,
                "attendee": student_email,
                "message": f"Exam '{exam_title}' scheduled for {student_email}"
            }
            
        except ValueError as e:
            return {"success": False, "error": f"Invalid date/time format: {e}"}
        except Exception as e:
            logger.error(f"Failed to create calendar event: {e}")
            return {"success": False, "error": str(e)}
    
    def get_upcoming_exams(
        self,
        days_ahead: int = 7,
        max_results: int = 20
    ) -> Dict:
        """
        Get upcoming scheduled exams from calendar.
        
        Args:
            days_ahead: Number of days to look ahead
            max_results: Maximum events to return
        
        Returns:
            Dict with list of upcoming events
        """
        if not self.service:
            return {
                "success": False,
                "error": "Google Calendar service not initialized"
            }
        
        try:
            now = datetime.utcnow()
            end_time = now + timedelta(days=days_ahead)
            
            events_result = self.service.events().list(
                calendarId='primary',
                timeMin=now.isoformat() + 'Z',
                timeMax=end_time.isoformat() + 'Z',
                maxResults=max_results,
                singleEvents=True,
                orderBy='startTime',
                q='exam'  # Filter for exam-related events
            ).execute()
            
            events = events_result.get('items', [])
            
            formatted_events = []
            for event in events:
                start = event['start'].get('dateTime', event['start'].get('date'))
                formatted_events.append({
                    "id": event.get('id'),
                    "title": event.get('summary'),
                    "start": start,
                    "attendees": [a.get('email') for a in event.get('attendees', [])],
                    "link": event.get('htmlLink')
                })
            
            return {
                "success": True,
                "count": len(formatted_events),
                "days_ahead": days_ahead,
                "events": formatted_events
            }
            
        except Exception as e:
            logger.error(f"Failed to fetch calendar events: {e}")
            return {"success": False, "error": str(e)}
    
    def cancel_event(self, event_id: str) -> Dict:
        """Cancel a scheduled exam event."""
        if not self.service:
            return {"success": False, "error": "Calendar service not initialized"}
        
        try:
            self.service.events().delete(
                calendarId='primary',
                eventId=event_id,
                sendUpdates='all'
            ).execute()
            
            return {
                "success": True,
                "message": f"Event {event_id} cancelled successfully"
            }
        except Exception as e:
            logger.error(f"Failed to cancel event: {e}")
            return {"success": False, "error": str(e)}


# Singleton instance
_calendar_service = None

def get_calendar_service() -> GoogleCalendarService:
    """Get or create the calendar service singleton."""
    global _calendar_service
    if _calendar_service is None:
        _calendar_service = GoogleCalendarService()
    return _calendar_service


# MCP Tool functions
def schedule_exam(
    student_email: str,
    exam_title: str,
    exam_date: str,
    exam_time: str,
    duration_minutes: int = 60,
    subject: Optional[str] = None,
    level: Optional[int] = None
) -> Dict:
    """MCP tool: Schedule an exam for a student."""
    service = get_calendar_service()
    return service.schedule_exam(
        student_email=student_email,
        exam_title=exam_title,
        exam_date=exam_date,
        exam_time=exam_time,
        duration_minutes=duration_minutes,
        subject=subject,
        level=level
    )


def get_upcoming_exams(days_ahead: int = 7) -> Dict:
    """MCP tool: Get upcoming scheduled exams."""
    service = get_calendar_service()
    return service.get_upcoming_exams(days_ahead=days_ahead)
