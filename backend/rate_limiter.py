"""
Rate Limiter Module for FastAPI
Provides rate limiting for expensive API endpoints (AI generation, evaluation, chat)
"""
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from fastapi import Request
import logging

# Create limiter with remote address as key
# Uses client IP for rate limit tracking
limiter = Limiter(key_func=get_remote_address)

def init_rate_limiter(app):
    """
    Initialize rate limiter on FastAPI app.
    Call this after creating the FastAPI app instance.
    """
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    logging.info("✅ Rate limiting enabled")

# Rate limit decorators for use in route files
# Usage: @limiter.limit("10/minute")

# Preset limits for different endpoint types
RATE_LIMITS = {
    "ai_heavy": "5/minute",      # AI question generation
    "ai_moderate": "15/minute",   # AI evaluation
    "chat": "30/minute",          # Chatbot messages
    "auth": "10/minute",          # Auth endpoints
    "general": "60/minute"        # General API calls
}
