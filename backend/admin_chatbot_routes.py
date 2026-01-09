"""
Admin Chatbot Routes for MCP Integration
==========================================
Provides a custom chatbot interface for Institution Admins
that uses the MCP tools via LLM function calling.
"""

import os
import json
from datetime import datetime
from typing import Optional, Dict, List, Union, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import logging

from auth_dependencies import get_current_user
from mcp_tools import MCPTools, execute_tool, get_all_tools
from mcp_google_calendar import schedule_exam, get_upcoming_exams
from mcp_google_sheets import export_to_sheets
from utils_llm import get_llm

logger = logging.getLogger(__name__)

# Router
admin_chatbot_router = APIRouter(prefix="/api/admin-chatbot", tags=["admin-chatbot"])


# ============================================
# MODELS
# ============================================

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    tool_calls: Optional[List[Dict]] = None
    tool_results: Optional[List[Dict]] = None


class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[Dict]] = []
    institution_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    tool_calls: Optional[List[Dict]] = None
    data: Optional[Union[Dict, List[Dict], Any]] = None


# ============================================
# SYSTEM PROMPT FOR ADMIN CHATBOT
# ============================================

ADMIN_CHATBOT_SYSTEM_PROMPT = """Act like a production-grade, non-creative, deterministic DATA QUERY AGENT for an institution admin dashboard. You are NOT a conversational assistant. You are a data retrieval and reporting engine.

Your single objective:
Answer admin questions ONLY by executing database queries or tools and reporting EXACTLY what the data returns — nothing more, nothing less.

You must assume:
- Hallucination = SYSTEM FAILURE
- Guessing = SYSTEM FAILURE
- Extrapolation = SYSTEM FAILURE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GLOBAL OPERATING MODE (MANDATORY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You operate in 4 strict phases for EVERY question:

PHASE 1 — INTENT CLASSIFICATION  
Classify the question into ONE of these intents:
1) student_lookup
2) student_performance
3) student_failures
4) struggling_students
5) institution_analytics
6) question_analytics
7) question_bank
8) access_requests
9) scheduling
10) export
11) admin_audit
12) follow_up (pronoun / continuation)

Do NOT answer yet.

PHASE 2 — ENTITY RESOLUTION  
Resolve required entities ONLY via queries:
- Institution → already known via `{institution_id}`
- Student → MUST be resolved via SQL before use
- Subject / level → normalize via ILIKE

If student name is mentioned:
- Query students table with ILIKE on first_name OR last_name
- If 0 rows → respond: "No student found"
- If >1 rows → respond with list and STOP
- If exactly 1 → extract student_id and CONTINUE

PHASE 3 — DATA RETRIEVAL (NON-NEGOTIABLE)  
You MUST:
- Use a purpose-built tool if available
- Otherwise use execute_sql_query
- NEVER answer without at least ONE executed query
- NEVER reuse past query results unless explicitly stated

PHASE 4 — REPORTING (STRICT)  
Your response MUST:
- Contain ONLY facts present in the query result
- Never infer, summarize, extrapolate, or generalize
- Never mention subjects, levels, students, counts not returned
- Match row counts EXACTLY

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ABSOLUTE ANTI-HALLUCINATION RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. You may ONLY mention:
   - Rows returned
   - Columns returned
   - Exact counts derived from those rows

2. You are FORBIDDEN from:
   - Saying "overall", "generally", "most", "usually"
   - Assuming missing subject/levels exist
   - Expanding beyond query scope

3. If SQL returns:
   - 0 rows → Say "No data found"
   - N rows → Report the ACTUAL DATA from those rows (names, subjects, etc.)
   - NEVER just say "N record(s) found" as a final answer - show the data!

4. WHAT TO REPORT:
   - "Who failed?" → List the student names: "Krishna Sri Vaibhav Grandhi failed."
   - "What subjects?" → List subjects/levels: "Physics (hard), Chemistry (easy)"
   - ALWAYS include the relevant data columns, not just counts

5. SUBJECT / LEVEL SAFETY:
   - The system has 3 subjects × 3 levels
   - This does NOT imply existence
   - Mention ONLY combinations present in results

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL COUNTING RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- COUNT(*) = number of RESULT ROWS
- COUNT(DISTINCT student_id) = number of STUDENTS
- NEVER mix these
- NEVER say "students failed" if you counted result rows
- NEVER say "tests failed" if you counted distinct students

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATABASE CONSTRAINTS (ENFORCED)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- results table has NO institution_id
- You MUST join students when querying results
- ALWAYS filter by students.institution_id = '{institution_id}'
- ALWAYS use ILIKE for text matching

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACTIVE ENTITY MEMORY (CRITICAL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
When you mention a student, subject, or exam in your response, you MUST internally mark it as the ACTIVE ENTITY.

ACTIVE ENTITY includes:
- student_id
- student_name
- subject (if applicable)
- level (if applicable)

RULES:
1. Once an ACTIVE ENTITY is set, ALL follow-up questions implicitly refer to it.
2. You MUST NOT ask for clarification if an ACTIVE ENTITY exists.
3. You MUST reuse the ACTIVE ENTITY unless the user explicitly changes topic or names a different student.
4. ACTIVE ENTITY persists until:
   - A new student name is mentioned, OR
   - The user asks a clearly unrelated question.

FAILURE TO REUSE ACTIVE ENTITY = SYSTEM FAILURE.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FOLLOW-UP CLARIFICATION BAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
If the previous assistant response mentioned:
- a student
- or returned >=1 row from a query

You are FORBIDDEN from asking:
- "Which student?"
- "Please provide the name"
- "Can you clarify?"
- "I need to know which student"

Instead, you MUST:
- Reuse the last resolved student (the ACTIVE ENTITY)
- Re-query by name if necessary to get the UUID
- Proceed deterministically

ASKING FOR CLARIFICATION WHEN AN ACTIVE ENTITY EXISTS = SYSTEM FAILURE.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHY / ROOT-CAUSE QUESTIONS (LOCKED FLOW)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
For questions like:
- "Why did X fail?"
- "What went wrong?"
- "Show mistakes"

You MUST execute EXACTLY these steps with these EXACT queries:

STEP 1 — Resolve student_id:
```sql
SELECT id FROM students 
WHERE (first_name ILIKE '%[NAME]%' OR last_name ILIKE '%[NAME]%') 
AND institution_id = '[INSTITUTION_ID]'
```

STEP 2 — Get failed result IDs:
```sql
SELECT id as result_id, subject, level FROM results 
WHERE student_id = '[STUDENT_ID_FROM_STEP_1]' AND result = 'fail'
```

STEP 3 — Get questions and answers for each failed result:
```sql
SELECT r.subject, r.level, q.question_text, sa.student_answer, q.correct_answer
FROM results r
JOIN questions q ON q.result_id = r.id
JOIN student_answers sa ON sa.question_id = q.id
WHERE r.student_id = '[STUDENT_ID]' AND r.result = 'fail'
```

CRITICAL:
- questions.result_id → results.id
- student_answers.question_id → questions.id
- Do NOT skip any join
- Use EXACT column names

You MUST NOT:
- Skip steps
- Assume failures exist
- Collapse steps into one query

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT RULES (STRICT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Length: 1–5 bullet points OR ≤6 short sentences
- No SQL shown unless explicitly asked
- No schema explanations
- No reasoning narration
- No recommendations unless requested

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FAIL-SAFE CHECK (MANDATORY BEFORE ANSWER)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Before responding, internally verify ALL:
- Did I run a query?
- Did I mention ONLY returned rows?
- Did I avoid extrapolation?
- Did I respect student vs test counts?
- Did I maintain institution scope?

If ANY answer is "no" → DO NOT RESPOND. FIX IT.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AVAILABLE TOOLS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{tool_descriptions}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATABASE SCHEMA (READ-ONLY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{database_schema}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL: NO INTERNAL MONOLOGUE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You MUST NOT output:
- Your reasoning process
- "PHASE 1", "PHASE 2", etc. labels
- "I need to...", "I will...", "Let me..."
- Any chain-of-thought or internal monologue
- Repeated statements

Your response must be ONLY:
- The final answer to the user's question
- Based on actual query results

OUTPUTTING REASONING = SYSTEM FAILURE
"""


def get_tool_descriptions() -> str:
    """Format tool definitions for the system prompt."""
    tools = get_all_tools()
    descriptions = []
    for tool in tools:
        params = ", ".join([
            f"{k}: {v.get('type', 'any')}" 
            for k, v in tool.get("parameters", {}).get("properties", {}).items()
        ])
        descriptions.append(f"- **{tool['name']}**({params}): {tool['description']}")
    
    # Add calendar and sheets tools
    descriptions.extend([
        "- **get_upcoming_exams**(days_ahead): Get upcoming scheduled exams from calendar"
    ])
    
    return "\n".join(descriptions)


# ============================================
# TOOL EXECUTION MAPPING
# ============================================

ALL_TOOLS = {
    # Database tools
    "query_students": MCPTools.query_students,
    "get_student_performance": MCPTools.get_student_performance,
    "get_pending_access_requests": MCPTools.get_pending_access_requests,
    "get_institution_analytics": MCPTools.get_institution_analytics,
    "search_question_bank": MCPTools.search_question_bank,
    "get_struggling_students": MCPTools.get_struggling_students,
    # Calendar tools
    "schedule_exam": schedule_exam,
    "get_upcoming_exams": get_upcoming_exams,
    "get_upcoming_exams": get_upcoming_exams,
    # Sheets tools
    "export_to_sheets": export_to_sheets,
    # SQL tool
    "execute_sql_query": MCPTools.execute_sql_query,
}


def execute_mcp_tool(tool_name: str, arguments: Dict, institution_id: str) -> Dict:
    """Execute an MCP tool with institution scoping."""
    
    # Enforce institution_id for scoped tools
    scoped_tools = [
        "query_students", "get_pending_access_requests", 
        "get_institution_analytics", "get_struggling_students",
        "export_to_sheets", "execute_sql_query"
    ]
    
    if tool_name in scoped_tools:
        arguments["institution_id"] = institution_id
    
    if tool_name not in ALL_TOOLS:
        return {"success": False, "error": f"Unknown tool: {tool_name}"}
    
    try:
        result = ALL_TOOLS[tool_name](**arguments)
        return result
    except Exception as e:
        logger.error(f"Tool execution error: {e}")
        return {"success": False, "error": str(e)}


# ============================================
# LLM INTEGRATION
# ============================================

def create_gemini_tools_schema() -> List[Dict]:
    """Create Gemini-compatible function declarations."""
    tools = get_all_tools()
    
    # Add calendar and sheets tools
    tools.extend([
        {
            "name": "get_upcoming_exams",
            "description": "Get upcoming scheduled exams from Google Calendar.",
            "parameters": {
                "type": "object",
                "properties": {
                    "days_ahead": {"type": "integer", "default": 7}
                }
            }
        }
    ])
    
    return tools


async def process_chat_with_llm(
    message: str,
    conversation_history: List[Dict],
    institution_id: str
) -> Dict:
    """Process a chat message using LLM with function calling."""
    
    llm = get_llm()
    if not llm:
        return {
            "response": "AI service is temporarily unavailable. Please try again later.",
            "tool_calls": None,
            "data": None
        }
    
    # Prepare system prompt
    system_prompt = ADMIN_CHATBOT_SYSTEM_PROMPT.format(
        tool_descriptions=get_tool_descriptions(),
        institution_id=institution_id,
        database_schema=MCPTools.get_database_schema()
    )
    
    # Build messages
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(conversation_history[-10:])  # Keep last 10 messages for context
    messages.append({"role": "user", "content": message})
    
    # Get tool definitions
    tools = create_gemini_tools_schema()
    
    try:
        # Call LLM with function calling
        from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
        
        lc_messages = [SystemMessage(content=system_prompt)]
        for msg in conversation_history[-10:]:
            if msg.get("role") == "user":
                lc_messages.append(HumanMessage(content=msg.get("content", "")))
            elif msg.get("role") == "assistant":
                lc_messages.append(AIMessage(content=msg.get("content", "")))
        
        lc_messages.append(HumanMessage(content=message))
        
        # Bind tools to the LLM
        llm_with_tools = llm.bind_tools(tools)
        
        # Get initial response
        response = llm_with_tools.invoke(lc_messages)
        
        # Multi-turn tool execution loop
        # Allows the LLM to chain multiple tool calls (e.g., find ID -> query failures)
        all_tool_calls = []
        all_tool_results = []
        max_iterations = 5  # Prevent infinite loops
        iteration = 0
        
        while hasattr(response, 'tool_calls') and response.tool_calls and iteration < max_iterations:
            iteration += 1
            logger.info(f"Tool execution iteration {iteration}")
            
            for tool_call in response.tool_calls:
                tool_name = tool_call.get("name")
                tool_args = tool_call.get("args", {})
                
                logger.info(f"Executing tool: {tool_name} with args: {tool_args}")
                
                # Execute the tool
                result = execute_mcp_tool(tool_name, tool_args, institution_id)
                logger.info(f"Tool Result: {result}")
                
                all_tool_calls.append({
                    "name": tool_name,
                    "arguments": tool_args
                })
                all_tool_results.append({
                    "tool": tool_name,
                    "result": result
                })
            
            # Add AI response and tool results to conversation
            lc_messages.append(response)
            
            # Format tool results for the LLM
            tool_summary = "\n\n".join([
                f"**{tr['tool']}** result:\n```json\n{json.dumps(tr['result'], indent=2)[:2000]}\n```"
                for tr in all_tool_results[-len(response.tool_calls):]  # Only latest results
            ])
            lc_messages.append(HumanMessage(content=f"Tool execution results:\n{tool_summary}\n\nIf you need more data to answer the user's question, call another tool. Otherwise, provide a natural language response."))
            
            # Get next response (might have more tool calls or be final)
            try:
                response = llm_with_tools.invoke(lc_messages)
            except Exception as inner_e:
                logger.warning(f"LLM iteration {iteration} failed: {inner_e}")
                break
        
        # Generate final response
        if all_tool_results:
            tool_summary = "\n\n".join([
                f"**{tr['tool']}** result:\n```json\n{json.dumps(tr['result'], indent=2)[:2000]}\n```"
                for tr in all_tool_results
            ])
            
            # If response has content, use it; otherwise ask for summary
            if hasattr(response, 'content') and response.content and not (hasattr(response, 'tool_calls') and response.tool_calls):
                response_text = response.content
            else:
                # Ask for final summary
                lc_messages.append(HumanMessage(content=f"All tool results:\n{tool_summary}\n\nPlease summarize ALL these results for the admin in natural language. Be specific and include the actual data."))
                try:
                    final_response = llm.invoke(lc_messages)
                    response_text = final_response.content if hasattr(final_response, 'content') else str(final_response)
                except Exception as inner_e:
                    logger.warning(f"LLM final response failed: {inner_e}")
                    response_text = f"I found the following data:\n\n{tool_summary}\n\n(Note: Natural language summary unavailable.)"
        else:
            response_text = response.content if hasattr(response, 'content') else str(response)
        
        return {
            "response": response_text,
            "tool_calls": all_tool_calls if all_tool_calls else None,
            "data": all_tool_results[0]["result"] if len(all_tool_results) == 1 else (all_tool_results if all_tool_results else None)
        }
        
    except Exception as e:
        logger.error(f"LLM processing error: {e}")
        return {
            "response": f"I encountered an error processing your request: {str(e)}",
            "tool_calls": None,
            "data": None
        }


# ============================================
# API ENDPOINTS
# ============================================

@admin_chatbot_router.post("/chat", response_model=ChatResponse)
async def admin_chat(
    request: ChatRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Process a chat message from the admin chatbot.
    Uses LLM with MCP tools for intelligent responses.
    """
    # Get institution_id from request or user context
    institution_id = request.institution_id
    
    if not institution_id:
        # Try to get from user's admin record
        from supabase import create_client
        supabase_url = os.environ.get('SUPABASE_URL')
        supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_KEY')
        supabase = create_client(supabase_url, supabase_key)
        
        user_email = current_user.get("email")
        
        # Check institution_admins table
        admin_result = supabase.table("admins").select(
            "institution_id"
        ).eq("email", user_email).single().execute()
        
        if admin_result.data:
            institution_id = admin_result.data.get("institution_id")
        else:
            # Check if super admin - they can specify any institution
            super_admin = supabase.table("super_admins").select("id").eq(
                "email", user_email
            ).single().execute()
            
            if not super_admin.data:
                raise HTTPException(
                    status_code=403, 
                    detail="No institution found for this admin"
                )
    
    # Process chat
    result = await process_chat_with_llm(
        message=request.message,
        conversation_history=request.conversation_history or [],
        institution_id=institution_id
    )
    
    return ChatResponse(**result)


@admin_chatbot_router.get("/tools")
async def list_available_tools(current_user: Dict = Depends(get_current_user)):
    """List all available MCP tools for the admin chatbot."""
    return {
        "tools": get_all_tools(),
        "categories": {
            "database": ["query_students", "get_student_performance", "get_pending_access_requests", "get_institution_analytics", "search_question_bank", "get_struggling_students"],
            "calendar": ["schedule_exam", "get_upcoming_exams"],
            "sheets": ["export_to_sheets"],
            "analytics": ["get_institution_analytics"]
        }
    }


@admin_chatbot_router.post("/execute-tool")
async def execute_tool_directly(
    tool_name: str,
    arguments: Dict,
    institution_id: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    """
    Directly execute an MCP tool (for advanced usage).
    Institution scoping is automatically applied.
    """
    # Get institution_id if not provided
    if not institution_id:
        from supabase import create_client
        supabase_url = os.environ.get('SUPABASE_URL')
        supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
        supabase = create_client(supabase_url, supabase_key)
        
        admin_result = supabase.table("admins").select(
            "institution_id"
        ).eq("email", current_user.get("email")).single().execute()
        
        if admin_result.data:
            institution_id = admin_result.data.get("institution_id")
    
    if not institution_id:
        raise HTTPException(status_code=400, detail="Institution ID required")
    
    result = execute_mcp_tool(tool_name, arguments, institution_id)
    return result
