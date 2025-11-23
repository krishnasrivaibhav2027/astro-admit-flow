#!/usr/bin/env python3
"""
Test script to verify Firebase token decoding
"""

import base64
import json

# Example Firebase token (this is a sample, not a real token)
sample_token = """eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMzQ1Njc4OTAiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vYWktYWRtaXNzaW9uLTI2YzI3IiwiYXVkIjoiYWktYWRtaXNzaW9uLTI2YzI3IiwiYXV0aF90aW1lIjoxNzMyMjc3NDM0LCJ1c2VyX2lkIjoiZFVDbm4yaDR4YUU2TWFjNDRLTHFWbnZWRWZHMiIsInN1YiI6ImRVQ25uMmg0eGFFNk1hYzQ0S0xxVm52VkVmRzIiLCJpYXQiOjE3MzIyNzcwMzgsImV4cCI6MTczMjI4MDYzOCwiZW1haWwiOiJhcnVub2RheWFzaGluZUBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZW1haWwiOlsiYXJ1bm9kYXlhc2hpbmVAZ21haWwuY29tIl19LCJzaWduX2luX3Byb3ZpZGVyIjoicGFzc3dvcmQifX0.signature_here"""

def decode_firebase_token(token: str):
    """Decode Firebase JWT token"""
    try:
        parts = token.split('.')
        if len(parts) != 3:
            print(f"❌ Invalid JWT format: expected 3 parts, got {len(parts)}")
            return None
        
        # Decode header
        header = parts[0]
        padding = 4 - len(header) % 4
        if padding != 4:
            header += '=' * padding
        
        header_decoded = base64.urlsafe_b64decode(header)
        print(f"✅ Header: {json.loads(header_decoded)}")
        
        # Decode payload
        payload = parts[1]
        padding = 4 - len(payload) % 4
        if padding != 4:
            payload += '=' * padding
        
        payload_decoded = base64.urlsafe_b64decode(payload)
        payload_json = json.loads(payload_decoded)
        print(f"✅ Payload: {json.dumps(payload_json, indent=2)}")
        
        return payload_json
    except Exception as e:
        print(f"❌ Error decoding token: {e}")
        return None

if __name__ == "__main__":
    print("Testing Firebase token decoding...")
    decode_firebase_token(sample_token)
