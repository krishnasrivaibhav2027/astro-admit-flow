
import os
import sys
from dotenv import load_dotenv

# Ensure backend acts as root for imports
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.mcp_tools import MCPTools

# Load env for this script context too, just in case
load_dotenv('backend/.env')

print("Starting Diagnosis via MCPTools...")

# 1. Get Institution ID for Krishna
q1 = "SELECT id, institution_id FROM students WHERE first_name ILIKE '%Krishna%'"
res1 = MCPTools.execute_sql_query(q1, "ignored_for_now")
print(f"Student Query: {res1}")

if res1['success'] and res1['data']:
    student = res1['data'][0]
    sid = student['id']
    inst_id = student['institution_id']
    
    # 2. Get Chemistry failures
    q2 = f"SELECT id, subject, result FROM results WHERE student_id = '{sid}' AND subject ILIKE 'Chemistry'"
    res2 = MCPTools.execute_sql_query(q2, inst_id) # Pass correct inst_id
    print(f"Results Query: {res2}")
    
    if res2['success'] and res2['data']:
        for r in res2['data']:
            if r['result'] == 'fail':
                rid = r['id']
                print(f"Checking Fail Result ID: {rid}")
                
                # 3. Check Questions
                q3 = f"SELECT id, question_text, bank_id FROM questions WHERE result_id = '{rid}'"
                res3 = MCPTools.execute_sql_query(q3, inst_id)
                print(f"Questions Query: {res3}")
