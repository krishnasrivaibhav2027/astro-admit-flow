"""
Leaderboard Routes Module
Handles leaderboard scoring, ranking, and display.
Extracted from server.py for better maintainability.
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Dict
from datetime import datetime, timezone, timedelta
import logging
import os

from supabase import create_client, Client

# Initialize Supabase
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_KEY')
supabase: Client = create_client(supabase_url, supabase_key)

router = APIRouter(prefix="/api", tags=["leaderboard"])


def format_time_smart(seconds: int) -> dict:
    """
    Format time in smart units: minutes -> hours -> days
    Returns dict with value and unit
    """
    if seconds is None or seconds <= 0:
        return {"value": 0, "unit": "min", "display": "0m"}
    
    if seconds >= 86400:  # 24 hours = 86400 seconds
        value = round(seconds / 86400, 1)
        return {"value": value, "unit": "days", "display": f"{value}d"}
    elif seconds >= 3600:  # 60 minutes = 3600 seconds
        value = round(seconds / 3600, 1)
        return {"value": value, "unit": "hours", "display": f"{value}h"}
    else:
        value = round(seconds / 60, 1)
        return {"value": value, "unit": "min", "display": f"{value}m"}


def calculate_composite_score(results: dict, include_hard: bool = True) -> dict:
    """
    Calculate composite leaderboard score using multiple factors:
    - Difficulty-Weighted Score (50%): Harder levels weighted more
    - Time Efficiency Score (25%): Faster completion = higher score
    - Attempt Efficiency Score (25%): Fewer attempts = higher score
    - Bonuses: Perfect run (+0.5), Hard completion (+0.3)
    
    Returns dict with composite_score and breakdown
    """
    # Difficulty weights for each level
    DIFFICULTY_WEIGHTS = {'easy': 1.0, 'medium': 1.3, 'hard': 1.6}
    
    # Reference times in seconds (expected completion time)
    REFERENCE_TIMES = {'easy': 600, 'medium': 900, 'hard': 1200}
    
    # Component weights
    WEIGHT_DIFFICULTY = 0.50
    WEIGHT_TIME = 0.25
    WEIGHT_EFFICIENCY = 0.25
    
    levels_to_check = ['easy', 'medium', 'hard'] if include_hard else ['easy', 'medium']
    
    # === 1. Difficulty-Weighted Score ===
    weighted_sum = 0
    max_possible = 0
    
    for level in levels_to_check:
        result = results.get(level)
        if result and result.get('result') == 'pass':
            score = result.get('score', 0)
            weight = DIFFICULTY_WEIGHTS[level]
            weighted_sum += score * weight
            max_possible += 10 * weight
    
    # Normalize to 0-10 scale
    difficulty_score = (weighted_sum / max_possible * 10) if max_possible > 0 else 0
    
    # === 2. Time Efficiency Score ===
    time_scores = []
    total_time = 0
    
    for level in levels_to_check:
        result = results.get(level)
        if result and result.get('result') == 'pass':
            time_taken = result.get('time_taken', 0)
            total_time += time_taken
            
            if time_taken > 0:
                reference = REFERENCE_TIMES[level]
                time_ratio = reference / time_taken
                level_time_score = min(10, time_ratio * 5)
                time_scores.append(level_time_score)
            else:
                time_scores.append(5)
    
    time_score = sum(time_scores) / len(time_scores) if time_scores else 5
    
    # === 3. Attempt Efficiency Score ===
    efficiency_scores = []
    all_first_attempt = True
    
    for level in levels_to_check:
        result = results.get(level)
        if result and result.get('result') == 'pass':
            attempts_key = f'attempts_{level}'
            attempts = result.get(attempts_key, 1)
            if attempts == 0:
                attempts = 1
            
            level_efficiency = (1 / attempts) * 10
            efficiency_scores.append(level_efficiency)
            
            if attempts > 1:
                all_first_attempt = False
    
    efficiency_score = sum(efficiency_scores) / len(efficiency_scores) if efficiency_scores else 5
    
    # === 4. Bonuses ===
    bonuses = 0
    bonus_details = []
    
    if all_first_attempt and len(efficiency_scores) == len(levels_to_check):
        bonuses += 0.5
        bonus_details.append("Perfect Run +0.5")
    
    if include_hard and results.get('hard') and results['hard'].get('result') == 'pass':
        bonuses += 0.3
        bonus_details.append("Hard Completion +0.3")
    
    # === Calculate Composite Score ===
    composite_score = (
        (difficulty_score * WEIGHT_DIFFICULTY) +
        (time_score * WEIGHT_TIME) +
        (efficiency_score * WEIGHT_EFFICIENCY) +
        bonuses
    )
    
    return {
        'composite_score': round(composite_score, 2),
        'score_breakdown': {
            'difficulty_weighted': round(difficulty_score, 2),
            'time_efficiency': round(time_score, 2),
            'attempt_efficiency': round(efficiency_score, 2),
            'bonuses': round(bonuses, 2),
            'bonus_details': bonus_details
        },
        'total_time_seconds': total_time
    }


async def update_student_final_scores(student_id: str):
    """
    Update the student_final_scores table with computed scores.
    Called after each test completion to keep leaderboard data fresh.
    """
    try:
        # Get all results for this student
        results_response = supabase.table("results").select("*").eq("student_id", student_id).order("created_at", desc=False).execute()
        
        if not results_response.data:
            return
        
        # Group by level, keeping best/passed result
        student_results = {'easy': None, 'medium': None, 'hard': None}
        total_time_all_attempts = 0
        
        for result in results_response.data:
            level = result.get('level')
            if level not in student_results:
                continue
            
            # Accumulate ALL time spent (pass or fail)
            time_taken = result.get('time_taken', 0) or 0
            total_time_all_attempts += time_taken
            
            # Keep passed result or latest
            if student_results[level] is None or result.get('result') == 'pass':
                student_results[level] = result
        
        # Determine highest level passed
        highest_level = None
        levels_passed = 0
        for level in ['hard', 'medium', 'easy']:
            if student_results[level] and student_results[level].get('result') == 'pass':
                if highest_level is None:
                    highest_level = level
                levels_passed += 1
        
        # Calculate composite score (always include all levels attempted)
        include_hard = student_results['hard'] is not None
        score_data = calculate_composite_score(student_results, include_hard=include_hard)
        
        # Determine if passed (at least medium level)
        is_passed = student_results.get('medium') and student_results['medium'].get('result') == 'pass'
        
        # Get concession if any
        concession = 0
        for result in results_response.data:
            if result.get('concession'):
                concession = max(concession, result.get('concession', 0))
        
        # Upsert to student_final_scores
        upsert_data = {
            'student_id': student_id,
            'total_time_seconds': total_time_all_attempts,
            'composite_score': score_data['composite_score'],
            'score_breakdown': score_data['score_breakdown'],
            'levels_passed': levels_passed,
            'highest_level': highest_level,
            'concession': concession,
            'is_passed': is_passed,
            'last_updated': datetime.now(timezone.utc).isoformat()
        }
        
        # Check if exists and update, or insert
        existing = supabase.table("student_final_scores").select("id").eq("student_id", student_id).execute()
        
        if existing.data and len(existing.data) > 0:
            supabase.table("student_final_scores").update(upsert_data).eq("student_id", student_id).execute()
        else:
            supabase.table("student_final_scores").insert(upsert_data).execute()
        
        logging.info(f"✅ Updated final scores for student {student_id}: score={score_data['composite_score']}, time={total_time_all_attempts}s")
        
    except Exception as e:
        logging.error(f"Error updating student final scores: {e}")
        logging.error("Traceback: ", exc_info=True)


@router.get("/leaderboard")
async def get_leaderboard(time_period: str = Query("all", description="Filter by time: 'week', 'month', or 'all'")):
    """Get unified leaderboard data for all students with composite scoring and time filtering"""
    try:
        # Calculate date filter based on time_period
        date_filter = None
        now = datetime.now(timezone.utc)
        
        if time_period == "week":
            date_filter = (now - timedelta(days=7)).isoformat()
        elif time_period == "month":
            date_filter = (now - timedelta(days=30)).isoformat()
        # "all" means no date filter
        
        # Try to fetch from student_final_scores table first
        query = supabase.table("student_final_scores").select("*")
        
        if date_filter:
            query = query.gte("last_updated", date_filter)
        
        final_scores = query.order("composite_score", desc=True).execute()
        
        # Get student details
        students_response = supabase.table("students").select("id, first_name, last_name, email").execute()
        students_map = {s['id']: s for s in students_response.data}
        
        leaderboard = []
        
        if final_scores.data and len(final_scores.data) > 0:
            # Use pre-computed scores from student_final_scores
            for score_entry in final_scores.data:
                student_id = score_entry['student_id']
                if student_id not in students_map:
                    continue
                
                # Only include students who have passed at least one level
                if score_entry.get('levels_passed', 0) == 0:
                    continue
                
                student_info = students_map[student_id]
                student_name = f"{student_info['first_name']} {student_info['last_name']}"
                
                time_formatted = format_time_smart(score_entry.get('total_time_seconds', 0))
                
                leaderboard.append({
                    'rank': 0,
                    'student_name': student_name,
                    'email': student_info['email'],
                    'composite_score': score_entry.get('composite_score', 0),
                    'total_score': score_entry.get('composite_score', 0),  # Backward compatibility
                    'score_breakdown': score_entry.get('score_breakdown', {}),
                    'total_time': time_formatted,
                    'total_time_seconds': score_entry.get('total_time_seconds', 0),
                    'levels_passed': score_entry.get('levels_passed', 0),
                    'highest_level': score_entry.get('highest_level'),
                    'is_passed': score_entry.get('is_passed', False),
                    'concession': score_entry.get('concession', 0),
                    'last_updated': score_entry.get('last_updated')
                })
        else:
            # Fallback: Calculate on-the-fly from results table
            results_query = supabase.table("results").select("*")
            
            if date_filter:
                results_query = results_query.gte("created_at", date_filter)
            
            all_results = results_query.order("created_at", desc=False).execute()
            
            if all_results.data:
                student_results = {}
                student_total_time = {}
                
                for result in all_results.data:
                    student_id = result['student_id']
                    if student_id not in student_results:
                        student_results[student_id] = {'easy': None, 'medium': None, 'hard': None}
                        student_total_time[student_id] = 0
                    
                    # Accumulate time
                    student_total_time[student_id] += result.get('time_taken', 0) or 0
                    
                    level = result['level']
                    if student_results[student_id][level] is None or result['result'] == 'pass':
                        student_results[student_id][level] = result
                
                for student_id, results in student_results.items():
                    if student_id not in students_map:
                        continue
                    
                    # Calculate levels passed and highest
                    levels_passed = 0
                    highest_level = None
                    for level in ['hard', 'medium', 'easy']:
                        if results[level] and results[level].get('result') == 'pass':
                            if highest_level is None:
                                highest_level = level
                            levels_passed += 1
                    
                    if levels_passed == 0:
                        continue
                    
                    student_info = students_map[student_id]
                    student_name = f"{student_info['first_name']} {student_info['last_name']}"
                    
                    include_hard = results['hard'] is not None
                    score_data = calculate_composite_score(results, include_hard=include_hard)
                    time_formatted = format_time_smart(student_total_time[student_id])
                    
                    is_passed = results.get('medium') and results['medium'].get('result') == 'pass'
                    
                    leaderboard.append({
                        'rank': 0,
                        'student_name': student_name,
                        'email': student_info['email'],
                        'composite_score': score_data['composite_score'],
                        'total_score': score_data['composite_score'],
                        'score_breakdown': score_data['score_breakdown'],
                        'total_time': time_formatted,
                        'total_time_seconds': student_total_time[student_id],
                        'levels_passed': levels_passed,
                        'highest_level': highest_level,
                        'is_passed': is_passed,
                        'concession': 0
                    })
        
        # Sort: by composite_score (desc), then by time (asc) as tiebreaker
        leaderboard.sort(key=lambda x: (-x['composite_score'], x.get('total_time_seconds', 0)))
        
        # Assign ranks
        for idx, entry in enumerate(leaderboard):
            entry['rank'] = idx + 1
        
        logging.info(f"✅ Unified leaderboard generated: {len(leaderboard)} entries")
        
        return {
            "leaderboard": leaderboard,
            # Backward compatibility
            "hard_leaderboard": [e for e in leaderboard if e.get('highest_level') == 'hard'],
            "medium_leaderboard": [e for e in leaderboard if e.get('highest_level') == 'medium']
        }
        
    except Exception as e:
        logging.error(f"Error generating leaderboard: {e}")
        logging.error("Traceback: ", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Leaderboard error: {str(e)}")
