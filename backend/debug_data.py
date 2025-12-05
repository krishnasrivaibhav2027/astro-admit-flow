import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SUPABASE_KEY')

print(f"URL found: {bool(url)}")
print(f"KEY found: {bool(key)}")

if not url or not key:
    print("Missing credentials")
    exit(1)

try:
    supabase = create_client(url, key)
    print("Client created")

    print("--- QUESTIONS ---")
    questions = supabase.table('questions').select('id, correct_answer').limit(5).execute().data
    for q in questions:
        print(f"ID: {q['id']}, Correct: '{q['correct_answer']}'")

    print("\n--- ANSWERS ---")
    answers = supabase.table('student_answers').select('question_id, student_answer').limit(5).execute().data
    for a in answers:
        print(f"Q_ID: {a['question_id']}, Student: '{a['student_answer']}'")

except Exception as e:
    print(f"Error: {e}")
