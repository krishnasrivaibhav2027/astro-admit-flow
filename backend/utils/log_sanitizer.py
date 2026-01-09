"""
Log Sanitizer Utility
Removes PII (emails, phone numbers, passwords) from log messages.
"""
import re
import logging
from typing import List, Tuple

# Patterns to sanitize (pattern, replacement)
PII_PATTERNS: List[Tuple[str, str]] = [
    # Email addresses
    (r'[\w\.-]+@[\w\.-]+\.\w+', '[EMAIL]'),
    
    # Phone numbers (10 digits, with or without separators)
    (r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b', '[PHONE]'),
    (r'\b\d{10}\b', '[PHONE]'),
    
    # Password fields in JSON
    (r'"password"\s*:\s*"[^"]*"', '"password": "[REDACTED]"'),
    (r'"token"\s*:\s*"[^"]*"', '"token": "[REDACTED]"'),
    (r'"secret"\s*:\s*"[^"]*"', '"secret": "[REDACTED]"'),
    
    # API keys and tokens in URLs
    (r'(key|token|apikey|api_key)=[^&\s]+', r'\1=[REDACTED]'),
    
    # JWT tokens (xxxx.xxxx.xxxx format)
    (r'\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b', '[JWT]'),
]


def sanitize(message: str) -> str:
    """
    Remove PII from log messages.
    
    Args:
        message: The log message to sanitize
        
    Returns:
        Sanitized message with PII replaced
    """
    if not isinstance(message, str):
        message = str(message)
    
    result = message
    for pattern, replacement in PII_PATTERNS:
        result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)
    return result


class SanitizedFormatter(logging.Formatter):
    """
    Logging formatter that sanitizes PII from log messages.
    
    Usage:
        handler = logging.StreamHandler()
        handler.setFormatter(SanitizedFormatter('%(levelname)s: %(message)s'))
        logging.root.handlers = [handler]
    """
    def format(self, record: logging.LogRecord) -> str:
        # Only sanitize string messages
        if isinstance(record.msg, str):
            record.msg = sanitize(record.msg)
        
        # Sanitize args but preserve numeric types
        if record.args:
            if isinstance(record.args, dict):
                record.args = {k: sanitize(str(v)) if isinstance(v, str) else v for k, v in record.args.items()}
            elif isinstance(record.args, tuple):
                # CRITICAL: Only sanitize strings, preserve int/float for %d/%f formats
                record.args = tuple(sanitize(arg) if isinstance(arg, str) else arg for arg in record.args)
        
        return super().format(record)


def setup_sanitized_logging(level: int = logging.INFO) -> None:
    """
    Configure the root logger with sanitized formatting.
    Call this early in application startup.
    """
    handler = logging.StreamHandler()
    handler.setFormatter(SanitizedFormatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    ))
    
    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    root_logger.handlers = [handler]
    
    logging.info("✅ Sanitized logging enabled - PII will be redacted from logs")
