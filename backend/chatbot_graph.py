import logging
import json
import operator
from typing import Annotated, Sequence, TypedDict, List, Union

from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage, AIMessage, ToolMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import MemorySaver 
try:
    from langgraph.checkpoint.redis import RedisSaver
except ImportError:
    RedisSaver = None

import os
from redis import Redis

from chatbot_tools import (
    get_student_performance, 
    search_youtube_videos, 
    generate_educational_illustration,
    get_detailed_test_analysis,
    get_question_explanation,
    get_temporal_progress
)
from settings_manager import settings_manager
from utils_llm import get_llm

# --- State Definition ---
class StudentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    student_id: str
    student_name: str
    student_data: dict

# --- Nodes ---

def load_student_context(state: StudentState):
    """
    Node to fetch comprehensive student performance data.
    Includes aggregate stats, detailed test analysis, and temporal progress.
    """
    student_id = state.get("student_id")
    if not student_id:
        return {"student_data": {}}
        
    # 1. Aggregate Performance (existing)
    perf_data = get_student_performance(student_id)
    
    # 2. NEW: Detailed Recent Test Analysis (question-level)
    detailed_analysis = get_detailed_test_analysis(student_id, limit=3)
    
    # 3. NEW: Temporal Progress (score trends)
    progress_data = get_temporal_progress(student_id)
    
    # Combine all data for the chatbot
    combined_data = {
        **perf_data,
        "recent_test_analysis": detailed_analysis,
        "temporal_progress": progress_data
    }
    
    return {"student_data": combined_data}

def chatbot_node(state: StudentState):
    """
    Main Chat Node with Enhanced Analyst Capabilities.
    """
    messages = state["messages"]
    student_data = state.get("student_data", {})
    name = state.get("student_name", "Student")
    student_id = state.get("student_id", "")
    
    # 1. Prepare Tools
    # NOTE: Only stateless tools are exposed to LLM. Analyst data is already
    # pre-loaded in the system prompt via load_student_context(), so the LLM
    # should use that data instead of calling tools.
    from langchain_core.tools import tool

    @tool
    def search_youtube(query: str):
        """Searches YouTube for educational videos. Use this when the student asks for resources, links, or needs visual explanation."""
        return search_youtube_videos(query)
    
    @tool
    def generate_illustration(prompt: str, subject: str = "general"):
        """Generates an educational illustration or diagram. Use for visual representations of concepts."""
        return generate_educational_illustration(prompt, subject)
        
    tools = [search_youtube, generate_illustration]
    
    # 2. Prepare LLM
    llm = get_llm()
    llm_with_tools = llm.bind_tools(tools)
    
    # 3. Build Enhanced Context for System Prompt
    summary = student_data.get("formatted_summary", "No data")
    weak_areas = student_data.get("weak_areas", [])
    strong_areas = student_data.get("strong_areas", [])
    
    # Extract recent test analysis for immediate context
    recent_analysis = student_data.get("recent_test_analysis", {})
    weak_topics = recent_analysis.get("weak_topics", [])
    error_patterns = recent_analysis.get("error_patterns", [])
    suggestions = recent_analysis.get("improvement_suggestions", [])
    recent_wrong = recent_analysis.get("recent_wrong_questions", [])
    
    # Extract progress trends
    progress = student_data.get("temporal_progress", {})
    trends = progress.get("trends", {})
    
    # Helper to escape curly braces for LangChain template safety
    def escape_braces(text: str) -> str:
        """Escape curly braces to prevent LangChain template parsing issues."""
        return text.replace("{", "{{").replace("}", "}}")
    
    # Format trends without curly braces that could be misinterpreted
    trends_str = "No trend data available"
    if trends:
        trends_lines = []
        for subject, trend in trends.items():
            trends_lines.append(f"  {subject}: {trend}")
        trends_str = "\n".join(trends_lines)
    
    # Build rich context string (escape any dynamic content that might have braces)
    context_str = f"""
[STUDENT PROFILE]
Performance Summary: {escape_braces(summary)}
Strong Areas: {escape_braces(', '.join(strong_areas) if strong_areas else 'None identified yet')}
Weak Areas: {escape_braces(', '.join(weak_areas) if weak_areas else 'None identified yet')}

[RECENT TEST ANALYSIS]
Weak Topics (from recent tests): {escape_braces(', '.join(weak_topics) if weak_topics else 'None')}
Error Patterns: {escape_braces(', '.join(error_patterns) if error_patterns else 'No patterns detected')}
Suggested Improvements: {escape_braces('; '.join(suggestions[:3]) if suggestions else 'No suggestions')}

[PROGRESS TRENDS]
{trends_str}

[RECENT MISTAKES - For Analyst Mode]
"""
    # Add recent wrong questions for quick reference (escape braces in question text)
    for i, wq in enumerate(recent_wrong[:3], 1):
        question_text = escape_braces(wq.get('question_text', '')[:80])
        context_str += f"\n{i}. [{wq.get('subject', 'N/A')}/{wq.get('topic', 'N/A')}] {question_text}..."
    
    system_prompt = f"""You are TARS, an elite AI Tutor and Performance Analyst in an intelligent admission test system.

You have access to the student's complete performance data (shown above) and specialized tools. Your role is to provide deeply personalized, actionable guidance.

{context_str}

## YOUR MODES OF OPERATION:

### 1. ANALYST MODE (Primary - use when student just completed a test or asks about performance)
When in Analyst mode, you MUST:
- Use the RECENT TEST ANALYSIS data shown above to answer about their performance
- Reference the weak topics, error patterns, and improvement suggestions from the data
- If recent mistakes are listed above, reference those specific topics
- You CAN suggest what topics/concepts need to be covered (conceptual roadmap)
- Only provide detailed TIME-BASED schedules (daily/weekly plans) if the student specifically asks

### 2. EXPLAINER MODE (When student asks conceptual questions)
- Use the student's weak topics shown above to contextualize explanations
- If visual aids would help, use `generate_illustration` tool
- Relate concepts to their recent mistakes when relevant

### 3. RESOURCE PROVIDER MODE (When student asks for study materials)
- Use `search_youtube` tool to find targeted videos
- Prioritize resources that address their specific weak topics from the data above
- Explain WHY each resource is relevant to their needs

### 4. PROGRESS TRACKER MODE (When student asks about improvement)
- Use the PROGRESS TRENDS data shown above
- Celebrate improvements, acknowledge struggles constructively
- Connect progress to specific actions they've taken

## CRITICAL RULES:
1. NEVER give generic advice. Always tie guidance to the SPECIFIC data shown above.
2. The analysis data is ALREADY loaded - use it directly, don't say "I need to analyze first".
3. When student asks "What did I get wrong?", refer to the RECENT MISTAKES section above.
4. Address student by name when available.
5. Use LaTeX for math: $E=mc^2$ for inline, $$\\\\int f(x) dx$$ for block.
6. When generating images, use markdown: ![description](url)

## RESPONSE STRUCTURE:
1. Brief acknowledgment (1-2 sentences)
2. Data-driven analysis (reference actual numbers/topics from the data above)
3. Actionable next steps (specific, not generic)

The student's name is: {name}

Be encouraging but honest. Be specific, not generic. Be the tutor they deserve.
"""
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="messages"),
    ])
    
    chain = prompt | llm_with_tools
    
    response = chain.invoke({"messages": messages})
    return {"messages": [response]}

# --- Graph Construction ---

# Global state for lazy initialization
_chatbot_graph = None
_checkpointer = None

async def get_graph():
    """
    Lazy initialization of the chatbot graph.
    Must be called within an async context (with event loop running).
    """
    global _chatbot_graph, _checkpointer
    
    if _chatbot_graph is not None:
        return _chatbot_graph
    
    workflow = StateGraph(StudentState)
    
    # Add Nodes
    workflow.add_node("data_loader", load_student_context)
    workflow.add_node("chatbot", chatbot_node)
    
    # Add Tools Node
    # NOTE: Only stateless tools go in ToolNode. 
    # Analyst tools (analyze_my_test, explain_question, get_my_progress) are called 
    # directly in chatbot_node where student_id is available from state.
    from langchain_core.tools import tool
    
    @tool
    def search_youtube(query: str):
        """Searches YouTube for educational videos."""
        return search_youtube_videos(query)
    
    @tool
    def generate_illustration(prompt: str, subject: str = "general"):
        """Generates an educational illustration or diagram."""
        return generate_educational_illustration(prompt, subject)
    
    # Only include stateless tools in ToolNode
    tool_node = ToolNode([search_youtube, generate_illustration])
    workflow.add_node("tools", tool_node)
    
    # Edges
    workflow.set_entry_point("data_loader")
    workflow.add_edge("data_loader", "chatbot")
    
    # Conditional edge for tools
    def should_continue(state: StudentState):
        messages = state["messages"]
        if not messages:
            return END
        last_message = messages[-1]
        # Properly check if last message has tool_calls
        if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
            return "tools"
        return END
        
    workflow.add_conditional_edges("chatbot", should_continue)
    workflow.add_edge("tools", "chatbot") # Return to chatbot after tool use
    
    # Checkpointer - Use AsyncRedisSaver (now within async context)
    redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
    
    try:
        from langgraph.checkpoint.redis import AsyncRedisSaver
        
        logging.info(f"🔄 Connecting to Redis (Async) at {redis_url}...")
        _checkpointer = AsyncRedisSaver(redis_url)
        
        # Call asetup to initialize Redis indices
        if hasattr(_checkpointer, 'asetup'):
            await _checkpointer.asetup()
        
        logging.info(f"✅ LangGraph using ASYNC REDIS persistence")
        
    except Exception as e:
        logging.error(f"❌ Failed to init AsyncRedisSaver: {e}")
        raise e
    
    _chatbot_graph = workflow.compile(checkpointer=_checkpointer)
    return _chatbot_graph

# Expose shared_checkpointer for other modules
shared_checkpointer = None

async def get_checkpointer():
    """Get the checkpointer, initializing if needed."""
    global shared_checkpointer
    await get_graph()  # Ensure graph is initialized
    shared_checkpointer = _checkpointer
    return _checkpointer

