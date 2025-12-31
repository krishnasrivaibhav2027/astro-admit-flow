
import os
import asyncio
import requests
import json

# URL of your local backend
url = "http://localhost:8001/api/institutions/form-webhook"

payload = {
    "institution_name": "FIITJEE Coaching",
    "full_name": "Test Student FIITJEE",
    "email": "vausdevguptha@gmail.com",  # Using real email for testing
    "phone": "1234567890",
    "stream": "PCM",
    "scorecard_url": "http://example.com/scorecard.pdf"
}

try:
    print(f"Sending POST to {url}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    response = requests.post(url, json=payload)
    
    print(f"\nStatus Code: {response.status_code}")
    print(f"Response: {response.text}")

except Exception as e:
    print(f"\nError: {e}")
