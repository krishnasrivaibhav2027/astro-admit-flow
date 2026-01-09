
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from mcp_tools import MCPTools

def verify_sql_tool():
    print("Locked and Loaded: Verifying SQL Tool capabilities...")

    # Mock Institution ID
    inst_id = "test_institution"

    # Test 1: Schema Retrieval
    print("\n--- Test 1: Database Schema ---")
    schema = MCPTools.get_database_schema()
    if "TABLES:" in schema and "**students**" in schema:
        print("✅ Schema retrieved successfully.")
    else:
        print("❌ Schema retrieval failed.")
        print(schema)

    # Test 2: Valid Read Query
    print("\n--- Test 2: Valid READ Query (Students) ---")
    # Note: We need a valid query. 'students' table usually exists.
    # We must include institution_id filter to pass security check
    query = f"SELECT count(*) FROM students WHERE institution_id = '{inst_id}'"
    result = MCPTools.execute_sql_query(query, inst_id)
    if result.get("success"):
        print(f"✅ Query executed: {result.get('query_executed')}")
        print(f"   Data: {result.get('data')}")
    else:
        # It might fail if DB connection fails, but let's check error
        print(f"⚠️ Query failed (could be connectivity vs logic): {result.get('error')}")

    # Test 3: Security Check (Missing Institution ID)
    print("\n--- Test 3: Security - Missing Institution ID ---")
    bad_query = "SELECT * FROM students"
    result = MCPTools.execute_sql_query(bad_query, inst_id)
    if not result.get("success") and "Security violation" in result.get("error"):
        print(f"✅ Security blocked missing filter: {result.get('error')}")
    else:
        print(f"❌ Security FAILED to block missing filter: {result}")

    # Test 4: Security Check (Write Attempt)
    print("\n--- Test 4: Security - Write Attempt ---")
    bad_query = f"DELETE FROM students WHERE institution_id = '{inst_id}'"
    result = MCPTools.execute_sql_query(bad_query, inst_id)
    if not result.get("success") and "Security violation" in result.get("error"):
        print(f"✅ Security blocked WRITE: {result.get('error')}")
    else:
        print(f"❌ Security FAILED to block WRITE: {result}")

if __name__ == "__main__":
    verify_sql_tool()
