
import os
import sys
import logging

# Setup paths
sys.path.append(os.getcwd())

from dotenv import load_dotenv
load_dotenv()

# Configure logging to see details
logging.basicConfig(level=logging.INFO)

from mcp_google_sheets import get_sheets_service

def test_connection():
    print("\n" + "="*50)
    print("🧪 TESTING GOOGLE SHEETS API CONNECTION")
    print("="*50 + "\n")
    
    try:
        print("1. Initializing Service...")
        service = get_sheets_service()
        
        if not service.sheets_service:
            print("❌ Service failed to initialize (Check .env credentials)")
            return

        print("✅ Service Initialized.")
        
        print("\n2. Attempting to create a test spreadsheet...")
        timestamp = datetime.now().strftime("%H:%M:%S")
        title = f"API Connection Test {timestamp}"
        
        # This calls the REAL API
        result = service.create_spreadsheet(title)
        
        if result.get("success"):
            print("\n✅ SUCCESS! Google Sheets API is WORKING.")
            print(f"   Spreadsheet ID: {result.get('spreadsheet_id')}")
            print(f"   URL: {result.get('spreadsheet_url')}")
        else:
            print(f"\n❌ API FAILURE: {result.get('error')}")
            print("   (This is expected if your credentials are for Gmail only)")
            
            print("\n3. TESTING FALLBACK MECHANISM...")
            print("   Attempting to export a dummy student list using the full export function...")
            
            dummy_students = [
                {"first_name": "Test", "last_name": "User", "email": "test@example.com", "phone": "123", "current_level": 1, "status": "active"}
            ]
            
            # This calls the method that contains the fallback logic
            export_result = service.export_students_data(dummy_students, "Fallback Test Sheet")
            
            if export_result.get("success") and export_result.get("is_fallback"):
                print("\n✅ FALLBACK SUCCESS! CSV was created.")
                print(f"   File: {export_result.get('fallback_file')}")
                print(f"   Download URL: {export_result.get('spreadsheet_url')}")
                print(f"   Message: {export_result.get('message')}")
            else:
                print(f"\n❌ FALLBACK FAILED. Result: {export_result}")


    except Exception as e:
        print(f"\n❌ CRITICAL ERROR during test: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    from datetime import datetime
    test_connection()
