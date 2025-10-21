#!/usr/bin/env python3
"""
Get Firebase authentication token for testing
"""

import requests
import json

# Firebase configuration
FIREBASE_API_KEY = "AIzaSyDxDFMOm6UR87WTzVtG2XSUMY6mxQM6SrA"

def get_firebase_token():
    """Get Firebase authentication token"""
    try:
        # Firebase Auth REST API endpoint for sign in
        firebase_auth_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}"
        
        # Test credentials
        test_credentials = {
            "email": "testuser@example.com",
            "password": "TestPassword123!",
            "returnSecureToken": True
        }
        
        response = requests.post(firebase_auth_url, json=test_credentials)
        
        if response.status_code == 200:
            data = response.json()
            return data.get("idToken")
        else:
            # If test user doesn't exist, try to create one
            print("Test user doesn't exist, creating new user...")
            signup_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={FIREBASE_API_KEY}"
            signup_response = requests.post(signup_url, json=test_credentials)
            
            if signup_response.status_code == 200:
                signup_data = signup_response.json()
                print("Test user created successfully!")
                return signup_data.get("idToken")
            else:
                print(f"Failed to create test user: {signup_response.text}")
                return None
                
    except Exception as e:
        print(f"Error getting Firebase token: {str(e)}")
        return None

if __name__ == "__main__":
    token = get_firebase_token()
    if token:
        print(f"Firebase Token: {token}")
    else:
        print("Failed to get Firebase token")