"""
Error Response Models
Standardized error handling for the API.
"""
from pydantic import BaseModel
from typing import Optional
from fastapi import HTTPException


class ErrorResponse(BaseModel):
    """Standardized API error response."""
    success: bool = False
    error: str
    code: str  # e.g., "AUTH_FAILED", "NOT_FOUND", "VALIDATION_ERROR"
    detail: Optional[str] = None


class APIException(HTTPException):
    """
    Custom API exception that provides structured error responses.
    
    Usage:
        raise APIException(
            status_code=404,
            code="STUDENT_NOT_FOUND",
            message="Student not found",
            detail="No student with ID xyz exists"
        )
    """
    def __init__(
        self, 
        status_code: int, 
        code: str, 
        message: str, 
        detail: str = None
    ):
        self.code = code
        self.message = message
        self.error_detail = detail
        super().__init__(
            status_code=status_code,
            detail={
                "success": False,
                "error": message,
                "code": code,
                "detail": detail
            }
        )


# Common error codes
class ErrorCodes:
    # Authentication
    AUTH_FAILED = "AUTH_FAILED"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    UNAUTHORIZED = "UNAUTHORIZED"
    
    # Resources
    NOT_FOUND = "NOT_FOUND"
    ALREADY_EXISTS = "ALREADY_EXISTS"
    
    # Validation
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INVALID_INPUT = "INVALID_INPUT"
    
    # Rate limiting
    RATE_LIMITED = "RATE_LIMITED"
    
    # Server
    INTERNAL_ERROR = "INTERNAL_ERROR"
    DATABASE_ERROR = "DATABASE_ERROR"
    AI_SERVICE_ERROR = "AI_SERVICE_ERROR"


# Helper functions for common errors
def not_found(resource: str, identifier: str = None) -> APIException:
    detail = f"{resource} with ID {identifier} not found" if identifier else f"{resource} not found"
    return APIException(404, ErrorCodes.NOT_FOUND, f"{resource} not found", detail)

def unauthorized(message: str = "Not authorized") -> APIException:
    return APIException(401, ErrorCodes.UNAUTHORIZED, message)

def validation_error(message: str, detail: str = None) -> APIException:
    return APIException(400, ErrorCodes.VALIDATION_ERROR, message, detail)

def internal_error(detail: str = None) -> APIException:
    return APIException(500, ErrorCodes.INTERNAL_ERROR, "Internal server error", detail)
