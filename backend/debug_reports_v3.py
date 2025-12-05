import os
import sys
import time
from dotenv import load_dotenv
from supabase import create_client, Client

# Force flush stdout
sys.stdout.reconfigure(line_buffering=True)

print("Loading env...", flush=True)
load_dotenv()

supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_KEY')

if not supabase_url or not supabase_key:
    print("Error: Supabase credentials not found.", flush=True)
    exit(1)

print("Creating client...", flush=True)
try:
    supabase: Client = create_client(supabase_url, supabase_key)
    print("Client created.", flush=True)
except Exception as e:
    print(f"Error creating client: {e}", flush=True)
    exit(1)

def test_reports():
    print("Starting test_reports...", flush=True)
    
    # 1. Performance Trends
    try:
        print("1. [START] Fetching results for Performance Trends...", flush=True)
        start_time = time.time()
        # Limit to 1000 for testing if it's huge
        results_resp = supabase.table("results").select("score, created_at").not_.is_("score", "null").order("created_at").limit(100).execute()
        print(f"1. [DONE] Fetched {len(results_resp.data or [])} results in {time.time() - start_time:.2f}s", flush=True)
    except Exception as e:
        print(f"1. [FAIL] Performance Trends error: {e}", flush=True)

    # 2. Engagement
    try:
        print("2. [START] Fetching students for Engagement...", flush=True)
        start_time = time.time()
        students_resp = supabase.table("students").select("last_active_at, created_at").limit(100).execute()
        print(f"2. [DONE] Fetched {len(students_resp.data or [])} students in {time.time() - start_time:.2f}s", flush=True)
    except Exception as e:
        print(f"2. [FAIL] Engagement error: {e}", flush=True)

    # 3. Question Difficulty
    try:
        print("3. [START] Fetching student_answers for Question Difficulty...", flush=True)
        start_time = time.time()
        # This might be the heavy one
        answers_resp = supabase.table("student_answers").select("question_id, student_answer").limit(100).execute()
        print(f"3. [DONE] Fetched {len(answers_resp.data or [])} answers in {time.time() - start_time:.2f}s", flush=True)
        
        print("3. [START] Fetching questions...", flush=True)
        questions_resp = supabase.table("questions").select("id, question_text, correct_answer").limit(100).execute()
        print(f"3. [DONE] Fetched {len(questions_resp.data or [])} questions", flush=True)
    except Exception as e:
        print(f"3. [FAIL] Question Difficulty error: {e}", flush=True)

    # 4. Stuck Students
    try:
        print("4. [START] Fetching results for Stuck Students...", flush=True)
        start_time = time.time()
        all_results_resp = supabase.table("results").select("student_id, level, result, created_at").order("created_at", desc=True).limit(100).execute()
        print(f"4. [DONE] Fetched {len(all_results_resp.data or [])} results in {time.time() - start_time:.2f}s", flush=True)
        
        print("4. [START] Fetching students for Stuck Students...", flush=True)
        all_students_resp = supabase.table("students").select("id, first_name, last_name, email").limit(100).execute()
        print(f"4. [DONE] Fetched {len(all_students_resp.data or [])} students", flush=True)
    except Exception as e:
        print(f"4. [FAIL] Stuck Students error: {e}", flush=True)

    print("Test complete.", flush=True)

if __name__ == "__main__":
    test_reports()
