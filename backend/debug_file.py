import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

try:
    url = os.environ.get('SUPABASE_URL')
    key = os.environ.get('SUPABASE_KEY')
    supabase = create_client(url, key)

    with open("debug_output.txt", "w", encoding="utf-8") as f:
        f.write("--- QUESTIONS ---\n")
        questions = supabase.table('questions').select('id, correct_answer').limit(5).execute().data
        for q in questions:
            f.write(f"ID: {q['id']}, Correct: '{q['correct_answer']}'\n")

        f.write("\n--- ANSWERS ---\n")
        answers = supabase.table('student_answers').select('question_id, student_answer').limit(5).execute().data
        for a in answers:
            f.write(f"Q_ID: {a['question_id']}, Student: '{a['student_answer']}'\n")
            
    print("Debug info written to debug_output.txt")

except Exception as e:
    with open("debug_output.txt", "w") as f:
        f.write(f"Error: {str(e)}")
