
import os
import psycopg2
from dotenv import load_dotenv
import urllib.parse

# Load env
load_dotenv('backend/.env')

# Construct DB URL
password = os.getenv('SUPABASE_DB_PASSWORD')
if password:
    password = urllib.parse.quote_plus(password)
    
db_url = os.getenv('DATABASE_URL')
if not db_url and password:
    db_url = f"postgresql://postgres.{os.getenv('SUPABASE_PROJECT_ID')}:{password}@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require"
elif db_url and 'sslmode' not in db_url:
    db_url += "?sslmode=require"

print(f"Connecting to DB...")

try:
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()

    with open('debug_chem.log', 'w') as log:
        # 1. Find Student
        print("\n--- 1. Search Student 'Krishna' ---")
        log.write("\n--- 1. Search Student 'Krishna' ---\n")
        cursor.execute("SELECT id, first_name, last_name, institution_id FROM students WHERE first_name ILIKE '%Krishna%' OR last_name ILIKE '%Krishna%'")
        students = cursor.fetchall()
        for s in students:
            print(f"Student: {s}")
            log.write(f"Student: {s}\n")
            sid = s[0]

            # 2. Find Chemistry Failures
            print(f"\n--- 2. Chemistry Failures for {s[1]} ---")
            log.write(f"\n--- 2. Chemistry Failures for {s[1]} ---\n")
            cursor.execute("SELECT id, level, score, start_time FROM results WHERE student_id = %s AND subject ILIKE 'Chemistry' AND result = 'fail'", (sid,))
            results = cursor.fetchall()
            
            if not results:
                print("No Chemistry failures found.")
                log.write("No Chemistry failures found.\n")
            
            for r in results:
                rid = r[0]
                print(f"Result ID: {rid} | Level: {r[1]} | Score: {r[2]}")
                log.write(f"Result ID: {rid} | Level: {r[1]} | Score: {r[2]}\n")

                # 3. Check Questions linked to this Result
                print(f"   --- 3. Questions for Result {rid} ---")
                log.write(f"   --- 3. Questions for Result {rid} ---\n")
                cursor.execute("SELECT id, question_text, bank_id FROM questions WHERE result_id = %s", (rid,))
                questions = cursor.fetchall()
                
                if not questions:
                    print("   [WARNING] NO QUESTIONS FOUND for this result ID!")
                    log.write("   [WARNING] NO QUESTIONS FOUND for this result ID!\n")
                
                for q in questions:
                    qid = q[0]
                    print(f"   Question ID: {qid} | Text: {q[1][:30]}... | BankID: {q[2]}")
                    log.write(f"   Question ID: {qid} | Text: {q[1][:30]}... | BankID: {q[2]}\n")
                    
                    # 4. Check Answers
                    cursor.execute("SELECT student_answer FROM student_answers WHERE question_id = %s", (qid,))
                    ans = cursor.fetchall()
                    print(f"      Answer: {ans}")
                    log.write(f"      Answer: {ans}\n")

    conn.close()

except Exception as e:
    print(f"Error: {e}")
