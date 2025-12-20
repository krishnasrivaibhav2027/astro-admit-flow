from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import os
import logging
from typing import Dict, Optional

# Initialize security schema
# Initialize security schema
security = HTTPBearer()
security_optional_scheme = HTTPBearer(auto_error=False)

from jwt import PyJWKClient

SUPABASE_JWKS_URL = "https://uminpkhjsrfogjtwqqfn.supabase.co/auth/v1/.well-known/jwks.json"

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict:
    """Verify Supabase JWT token using JWKS (and fallback to secret)"""
    token = credentials.credentials
    
    # Method 0: Inspect Header to determine Algorithm
    try:
        header = jwt.get_unverified_header(token)
        alg = header.get('alg')
        logging.info(f"Token Algorithm: {alg}")
    except Exception as e:
        logging.error(f"Failed to decode token header: {e}")
        raise HTTPException(status_code=401, detail="Invalid token format")

    # Method 1: Asymmetric (RS256 or ES256) via JWKS
    if alg in ['RS256', 'ES256']:
        try:
            jwks_client = PyJWKClient(SUPABASE_JWKS_URL)
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256", "ES256"],
                audience="authenticated",
                options={"verify_exp": True}
            )
            
            if 'sub' in payload:
                payload['uid'] = payload['sub']
            return payload
            
        except Exception as jwks_error:
            logging.error(f"JWKS verification failed: {jwks_error}")
            raise HTTPException(status_code=401, detail=f"JWKS Authentication failed: {str(jwks_error)}")

    # Method 2: HS256 (Secret)
    elif alg == 'HS256':
        try:
            jwt_secret = os.environ.get('SUPABASE_JWT_SECRET') or os.environ.get('JWT_SECRET_KEY')
            if not jwt_secret:
                logging.error("Missing SUPABASE_JWT_SECRET or JWT_SECRET_KEY")
                raise HTTPException(status_code=500, detail="Server configuration error")
                
            jwt_secret = jwt_secret.strip()
                
            payload = jwt.decode(token, jwt_secret, algorithms=["HS256"], audience="authenticated")
            
            if 'sub' in payload:
                payload['uid'] = payload['sub']
                
            return payload
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError as e:
            logging.error(f"Invalid token: {e}")
            raise HTTPException(status_code=401, detail=f"Invalid authentication: {str(e)}")
        except Exception as e:
            logging.error(f"Auth error: {e}")
            raise HTTPException(status_code=401, detail="Authentication failed")
            
    else:
        logging.error(f"Unsupported token algorithm: {alg}")
        raise HTTPException(status_code=401, detail=f"Unsupported algorithm: {alg}")


async def get_current_user_with_activity(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict:
    """Verify Token and update activity"""
    # For now, just alias to get_current_user. 
    # In future, can add activity logging here separate from main logic
    return await get_current_user(credentials)

async def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional_scheme)) -> Optional[Dict]:
    """Verify Supabase JWT token if present, otherwise return None"""
    if not credentials:
        return None
    try:
        return await get_current_user(credentials)
    except Exception:
        return None
