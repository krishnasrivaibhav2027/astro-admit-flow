import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client
from datetime import datetime, timedelta

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
supabase: Client = create_client(supabase_url, supabase_key)
print("Client created.", flush=True)

def test_reports():
    try:
        print("1. Testing Performance Trends...", flush=True)
        results_resp = supabase.table("results").select("score, created_at").not_.is_("score", "null").order("created_at").execute()
        results = results_resp.data or []
        print(f"   Fetched {len(results)} results.", flush=True)

        print("2. Testing Engagement...", flush=True)
        students_resp = supabase.table("students").select("last_active_at, created_at").execute()
        students = students_resp.data or []
        print(f"   Fetched {len(students)} students.", flush=True)

        print("3. Testing Question Difficulty...", flush=True)
        answers_resp = supabase.table("student_answers").select("question_id, student_answer").execute()
        questions_resp = supabase.table("questions").select("id, question_text, correct_answer").execute()
        print(f"   Fetched {len(answers_resp.data or [])} answers and {len(questions_resp.data or [])} questions.", flush=True)

        print("4. Testing Stuck Students...", flush=True)
        all_results_resp = supabase.table("results").select("student_id, level, result, created_at").order("created_at", desc=True).execute()
        all_results = all_results_resp.data or []
        print(f"   Fetched {len(all_results)} results for stuck analysis.", flush=True)

        student_results_map = {}
        for r in all_results:
            s_id = r.get('student_id')
            if not s_id: continue
            if s_id not in student_results_map:
                student_results_map[s_id] = []
            student_results_map[s_id].append(r)
        
        print(f"   Grouped results for {len(student_results_map)} students.", flush=True)

        all_students_resp = supabase.table("students").select("id, first_name, last_name, email").execute()
        all_students_map = {s['id']: s for s in all_students_resp.data or []}
        
        stuck_count = 0
        for s_id, results in student_results_map.items():
            if not results: continue
            current_level = results[0].get('level')
            if not current_level: continue
            
            fail_count = 0
            for r in results:
                if r.get('level') == current_level and r.get('result') == 'fail':
                    fail_count += 1
                else:
                    break
            
            if fail_count > 1:
                stuck_count += 1
        
        print(f"   Identified {stuck_count} stuck students.", flush=True)
        print("Success! All queries executed without error.", flush=True)

    except Exception as e:
        print(f"FAIL: {e}", flush=True)
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_reports()
