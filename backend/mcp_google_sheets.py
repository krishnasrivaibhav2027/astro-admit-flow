"""
Google Sheets Integration for MCP
==================================
Provides data export/import capabilities via Google Sheets API.
Uses existing Gmail OAuth credentials from .env file.
"""

import os
import json
import csv
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, List, Any
import logging
from dotenv import load_dotenv

# Load environment variables explicitly to ensure standalone execution works
load_dotenv()

logger = logging.getLogger(__name__)

# Google Sheets API imports
try:
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    from googleapiclient.discovery import build
    GOOGLE_SHEETS_AVAILABLE = True
except ImportError:
    GOOGLE_SHEETS_AVAILABLE = False
    logger.warning("Google Sheets API not available. Install google-api-python-client")


# Sheets scopes
SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file'
]


class GoogleSheetsService:
    """Service for Google Sheets operations using OAuth credentials."""
    
    def __init__(self):
        self.sheets_service = None
        self.drive_service = None
        self._initialize_services()
    
    def _initialize_services(self):
        """Initialize Google Sheets and Drive services with OAuth credentials from .env."""
        if not GOOGLE_SHEETS_AVAILABLE:
            logger.error("Google Sheets API libraries not installed")
            return
        
        # Get OAuth credentials from environment (same as Gmail)
        client_id = os.environ.get('GMAIL_CLIENT_ID')
        client_secret = os.environ.get('GMAIL_CLIENT_SECRET')
        refresh_token = os.environ.get('GMAIL_REFRESH_TOKEN')
        access_token = os.environ.get('GMAIL_ACCESS_TOKEN')
        
        if not all([client_id, client_secret, refresh_token]):
            logger.error("❌ Missing Gmail OAuth credentials in .env")
            logger.error(f"   CLIENT_ID present: {bool(client_id)}")
            logger.error(f"   CLIENT_SECRET present: {bool(client_secret)}")
            logger.error(f"   REFRESH_TOKEN present: {bool(client_secret)}")
            return
            
        logger.info("✅ Found Gmail OAuth credentials in .env")
        
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
                    logger.info("Refreshed OAuth credentials for Sheets")
                except Exception as e:
                    logger.warning(f"Failed to refresh credentials: {e}")
            
            self.sheets_service = build('sheets', 'v4', credentials=creds)
            self.drive_service = build('drive', 'v3', credentials=creds)
            logger.info("Google Sheets/Drive services initialized with OAuth credentials")
            
        except Exception as e:
            logger.error(f"Failed to initialize Sheets services: {e}")
    
    def _save_as_csv(self, filename: str, data: List[List[Any]]) -> Dict:
        """Fallback: Save data as CSV in static/exports directory."""
        try:
            # Create directory
            static_dir = Path("static/exports")
            static_dir.mkdir(parents=True, exist_ok=True)
            
            # Sanitize filename
            safe_filename = "".join([c for c in filename if c.isalnum() or c in (' ', '-', '_')]).strip()
            safe_filename = safe_filename.replace(" ", "_").lower()
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            file_path = static_dir / f"{safe_filename}_{timestamp}.csv"
            
            with open(file_path, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerows(data)
                
            # Construct URL (assuming backend runs on default port 8000)
            # In production, this base URL should be configurable
            file_url = f"http://localhost:8000/static/exports/{file_path.name}"
            
            print(f"✅ CSV Fallback Success: {file_url}")
            logger.info(f"💾 Saved CSV fallback: {file_path}")
            return {
                "success": True,
                "spreadsheet_url": file_url,
                "message": f"Data exported successfully to CSV: {file_path.name}",
                "is_fallback": True,
                "fallback_file": file_path.name
            }
        except Exception as e:
            print(f"❌ CSV Fallback Error: {e}")
            logger.error(f"Failed to save CSV fallback: {e}")
            return {"success": False, "error": f"Failed to save CSV: {str(e)}"}

    def create_spreadsheet(self, title: str, share_with_email: Optional[str] = None) -> Dict:
        """Create a new spreadsheet and optionally share it."""
        if not self.sheets_service:
            return {"success": False, "error": "Sheets service not initialized"}
        
        try:
            spreadsheet = {
                'properties': {'title': title}
            }
            result = self.sheets_service.spreadsheets().create(
                body=spreadsheet,
                fields='spreadsheetId,spreadsheetUrl'
            ).execute()
            
            spreadsheet_id = result.get('spreadsheetId')
            spreadsheet_url = result.get('spreadsheetUrl')
            
            # Share with email if provided
            if share_with_email and self.drive_service:
                try:
                    self.drive_service.permissions().create(
                        fileId=spreadsheet_id,
                        body={
                            'type': 'user',
                            'role': 'writer',
                            'emailAddress': share_with_email
                        },
                        sendNotificationEmail=True
                    ).execute()
                except Exception as e:
                    logger.warning(f"Failed to share spreadsheet: {e}")
            
            return {
                "success": True,
                "spreadsheet_id": spreadsheet_id,
                "spreadsheet_url": spreadsheet_url
            }
            
        except Exception as e:
            logger.error(f"Failed to create spreadsheet: {e}")
            return {"success": False, "error": str(e)}
    
    def write_data(
        self,
        spreadsheet_id: str,
        data: List[List[Any]],
        sheet_name: str = "Sheet1",
        start_cell: str = "A1"
    ) -> Dict:
        """Write data to a spreadsheet."""
        if not self.sheets_service:
            return {"success": False, "error": "Sheets service not initialized"}
        
        try:
            range_name = f"{sheet_name}!{start_cell}"
            body = {'values': data}
            
            result = self.sheets_service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=range_name,
                valueInputOption='USER_ENTERED',
                body=body
            ).execute()
            
            return {
                "success": True,
                "updated_cells": result.get('updatedCells'),
                "updated_range": result.get('updatedRange')
            }
            
        except Exception as e:
            logger.error(f"Failed to write data: {e}")
            return {"success": False, "error": str(e)}
    
    def export_students_data(
        self,
        students: List[Dict],
        spreadsheet_name: str,
        share_with_email: Optional[str] = None
    ) -> Dict:
        """Export student data to a new spreadsheet."""
        # Create spreadsheet
        create_result = self.create_spreadsheet(spreadsheet_name, share_with_email)
        
        # Prepare data with headers
        headers = ["Name", "Email", "Phone", "Current Level", "Status", "Joined Date", "Last Activity"]
        data = [headers]
        
        for student in students:
            row = [
                f"{student.get('first_name', '')} {student.get('last_name', '')}".strip(),
                student.get('email', ''),
                student.get('phone', ''),
                student.get('current_level', 1),
                student.get('status', 'active'),
                student.get('created_at', '')[:10] if student.get('created_at') else '',
                student.get('last_activity', '')[:10] if student.get('last_activity') else ''
            ]
            data.append(row)

        if not create_result.get("success"):
            logger.warning(f"Sheets API failed, using CSV fallback: {create_result.get('error')}")
            return self._save_as_csv(spreadsheet_name, data)
        
        spreadsheet_id = create_result["spreadsheet_id"]
        
        # Write data
        write_result = self.write_data(spreadsheet_id, data)
        if not write_result.get("success"):
            return write_result
        
        return {
            "success": True,
            "spreadsheet_id": spreadsheet_id,
            "spreadsheet_url": create_result["spreadsheet_url"],
            "rows_written": len(data),
            "message": f"Exported {len(students)} students to '{spreadsheet_name}'"
        }
    
    def export_results_data(
        self,
        results: List[Dict],
        spreadsheet_name: str,
        share_with_email: Optional[str] = None
    ) -> Dict:
        """Export test results to a new spreadsheet."""
        # Move data preparation before API call to allow fallback
        headers = ["Student", "Subject", "Level", "Score", "Max Score", "Percentage", "Passed", "Time Taken", "Date"]
        data = [headers]
        
        for result in results:
            score = result.get('score', 0)
            max_score = result.get('max_score', 100)
            percentage = round((score / max_score) * 100, 1) if max_score > 0 else 0
            
            row = [
                result.get('student_name', result.get('student_id', '')),
                result.get('subject', ''),
                result.get('level', ''),
                score,
                max_score,
                f"{percentage}%",
                "Yes" if result.get('result') == 'pass' else "No",
                result.get('time_taken', ''),
                result.get('created_at', '')[:10] if result.get('created_at') else ''
            ]
            data.append(row)

        create_result = self.create_spreadsheet(spreadsheet_name, share_with_email)
        if not create_result.get("success"):
            return self._save_as_csv(spreadsheet_name, data)
        
        spreadsheet_id = create_result["spreadsheet_id"]
        
        write_result = self.write_data(spreadsheet_id, data)
        if not write_result.get("success"):
            return self._save_as_csv(spreadsheet_name, data)
        
        return {
            "success": True,
            "spreadsheet_id": spreadsheet_id,
            "spreadsheet_url": create_result["spreadsheet_url"],
            "rows_written": len(data),
            "message": f"Exported {len(results)} results to '{spreadsheet_name}'"
        }
    
    def export_analytics_data(
        self,
        analytics: Dict,
        spreadsheet_name: str,
        share_with_email: Optional[str] = None
    ) -> Dict:
        """Export analytics summary to a spreadsheet."""
        # Create summary sheet
        data = [
            ["Analytics Report", datetime.now().strftime("%Y-%m-%d %H:%M")],
            [],
            ["Overview"],
            ["Total Students", analytics.get("overview", {}).get("total_students", 0)],
            [],
            ["Students by Status"],
        ]
        
        for status, count in analytics.get("overview", {}).get("by_status", {}).items():
            data.append([status.title(), count])
        
        data.extend([
            [],
            ["Students by Level"],
        ])
        
        for level, count in analytics.get("overview", {}).get("by_level", {}).items():
            data.append([f"Level {level}", count])
        
        data.extend([
            [],
            ["Subject Performance"],
            ["Subject", "Total Tests", "Pass Rate", "Avg Score"]
        ])
        
        for subject, stats in analytics.get("test_performance", {}).get("by_subject", {}).items():
            data.append([
                subject.title(),
                stats.get("total", 0),
                f"{stats.get('pass_rate', 0)}%",
                stats.get("avg_score", 0)
            ])

        create_result = self.create_spreadsheet(spreadsheet_name, share_with_email)
        if not create_result.get("success"):
            return self._save_as_csv(spreadsheet_name, data)
        
        spreadsheet_id = create_result["spreadsheet_id"]

        write_result = self.write_data(spreadsheet_id, data)
        if not write_result.get("success"):
            return self._save_as_csv(spreadsheet_name, data)
        
        return {
            "success": True,
            "spreadsheet_id": spreadsheet_id,
            "spreadsheet_url": create_result["spreadsheet_url"],
            "message": f"Analytics exported to '{spreadsheet_name}'"
        }


# Singleton instance
_sheets_service = None

def get_sheets_service() -> GoogleSheetsService:
    """Get or create the sheets service singleton."""
    global _sheets_service
    if _sheets_service is None:
        _sheets_service = GoogleSheetsService()
    return _sheets_service


# MCP Tool function
def export_to_sheets(
    institution_id: str,
    data_type: str,
    spreadsheet_name: str,
    share_with_email: Optional[str] = None
) -> Dict:
    """
    MCP tool: Export institution data to Google Sheets.
    
    Args:
        institution_id: The institution ID
        data_type: Type of data ("students", "results", "analytics", "access_requests")
        spreadsheet_name: Name for the new spreadsheet
        share_with_email: Optional email to share the sheet with
    """
    from mcp_tools import MCPTools
    
    service = get_sheets_service()
    
    if data_type == "students":
        # Get students data
        result = MCPTools.query_students(institution_id, limit=1000)
        if not result.get("success"):
            return result
        return service.export_students_data(
            result.get("students", []),
            spreadsheet_name,
            share_with_email
        )
    
    elif data_type == "analytics":
        # Get analytics data
        result = MCPTools.get_institution_analytics(institution_id)
        if not result.get("success"):
            return result
        return service.export_analytics_data(
            result,
            spreadsheet_name,
            share_with_email
        )
    
    elif data_type == "access_requests":
        # Get access requests
        result = MCPTools.get_pending_access_requests(institution_id, include_rejected=True)
        if not result.get("success"):
            return result
        
        # Use students export format for requests
        requests = result.get("requests", [])
        
        headers = ["Name", "Email", "Phone", "Stream", "Status", "Submitted Date", "Scorecard URL"]
        data = [headers]
        for req in requests:
            data.append([
                req.get("name", ""),
                req.get("email", ""),
                req.get("phone", ""),
                req.get("stream_applied", ""),
                req.get("status", ""),
                req.get("created_at", "")[:10] if req.get("created_at") else "",
                req.get("scorecard_url", "")
            ])

        create_result = service.create_spreadsheet(spreadsheet_name, share_with_email)
        if not create_result.get("success"):
             return service._save_as_csv(spreadsheet_name, data)

        service.write_data(create_result["spreadsheet_id"], data)
        return {
            "success": True,
            "spreadsheet_url": create_result["spreadsheet_url"],
            "rows_written": len(data),
            "message": f"Exported {len(requests)} access requests"
        }
    
    else:
        return {"success": False, "error": f"Unknown data type: {data_type}"}
