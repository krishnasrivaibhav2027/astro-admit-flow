
import os
import sys
from datetime import datetime

# Setup paths
sys.path.append(os.getcwd())

# Mock environment variables if needed
os.environ['GMAIL_CLIENT_ID'] = 'mock'
os.environ['GMAIL_CLIENT_SECRET'] = 'mock'
os.environ['GMAIL_REFRESH_TOKEN'] = 'mock'
os.environ['GMAIL_ACCESS_TOKEN'] = 'mock'

try:
    from mcp_google_sheets import get_sheets_service
    
    print("Initializing service...")
    service = get_sheets_service()
    
    # Test Data
    test_data = [
        ["Header 1", "Header 2"],
        ["Row 1 Col 1", "Row 1 Col 2"],
        ["Row 2 Col 1", "Row 2 Col 2"]
    ]
    
    print("\n1. Testing _save_as_csv directly...")
    result = service._save_as_csv("test_file", test_data)
    print(f"Direct Result: {result}")
    
    # Mocking create_spreadsheet to simulate failure
    def mock_fail(*args, **kwargs):
        return {"success": False, "error": "Simulated Connection Timeout"}
    
    service.create_spreadsheet = mock_fail
    
    print("\n2. Testing export_students_data with fallback...")
    students = [
        {"first_name": "John", "last_name": "Doe", "email": "john@example.com", "phone": "123", "current_level": 1, "status": "active", "created_at": "2023-01-01T00:00:00", "last_activity": None}
    ]
    
    result = service.export_students_data(students, "Test Sheet")
    print(f"Export Result: {result}")
    
except Exception as e:
    import traceback
    traceback.print_exc()
