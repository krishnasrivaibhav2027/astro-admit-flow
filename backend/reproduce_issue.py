
import os
import sys
import logging
from dotenv import load_dotenv

# Load env from .env file
load_dotenv(".env")

from mcp_tools import MCPTools

# Configure logging to see errors
logging.basicConfig(level=logging.ERROR)

def test_query_students():
    print("Testing query_students...")
    # Use a dummy institution ID. It might return 0 students, but shouldn't error on 'column does not exist'
    result = MCPTools.query_students(institution_id="dummy_institution")
    print("Result:", result)
    if not result.get("success"):
        print("FAILED: ", result.get("error"))
    else:
        print("SUCCESS")

if __name__ == "__main__":
    test_query_students()
