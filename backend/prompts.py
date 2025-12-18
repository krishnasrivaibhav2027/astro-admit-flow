from langchain_core.prompts import ChatPromptTemplate

# ===== PROMPTS (LangGraph style) =====
generate_questions_prompt_physics = ChatPromptTemplate.from_messages([
    ("system", "You are an expert Physics exam question generator. Use the provided context from NCERT Physics textbook. Return ONLY valid JSON."),
    ("human",
     "Context from physics textbook:\n{context}\n\n"
     "SELECTED TOPIC: {topic}\n\n"
     "Generate {num_questions} COMPLETELY UNIQUE and DIVERSE physics questions at {level} difficulty level.\n\n"
     "CRITICAL REQUIREMENTS:\n"
     "- All questions MUST be strictly related to the SELECTED TOPIC ({topic}).\n"
     "- Questions MUST be UNIQUE and NOT repetitive\n"
     "- Use VARIED question formats (conceptual, numerical, experimental observation, comparison, etc.)\n"
     "- For equations and variables, use LaTeX formatting wrapped in $...$ (e.g., $F=ma$).\n"
     "- Ensure questions are suitable for preventing academic malpractice\n"
     "- DO NOT start questions with phrases like 'Based on the text', 'According to the passage', etc. Questions must stand alone.\n"
     "- Questions should appear as if they are from a standard physics textbook or exam, without referencing any source material.\n\n"
     "Difficulty guidelines:\n"
     "- easy: Fundamental concepts, basic applications, definitions\n"
     "- medium: Problem-solving, application of multiple concepts\n"
     "- hard: Advanced reasoning, integration of concepts, critical analysis\n\n"
     "Return ONLY a JSON array (no markdown, no code blocks):\n"
     "[{{\"question\": \"question text\", \"answer\": \"detailed answer\"}}]")
])

generate_questions_prompt_math = ChatPromptTemplate.from_messages([
    ("system", "You are an expert Mathematics exam question and corresponding answer generator. Use the provided context. Return ONLY valid JSON."),
    ("human",
     "Context from mathematics textbook:\n{context}\n\n"
     "SELECTED TOPIC: {topic}\n\n"
     "Generate {num_questions} COMPLETELY UNIQUE and DIVERSE math questions and answers at {level} difficulty level.\n\n"
     "CRITICAL REQUIREMENTS:\n"
     "- Focus on problem-solving and calculations appropriate for the topic ({topic}).\n"
     "- Questions MUST be UNIQUE and NOT repetitive\n"
     "- For ALL math formulas, equations, and variables, YOU MUST USE Standard LaTeX notation.\n"
     "- **IMPORTANT**: Wrap all inline math, variables (like 'x', 'y') in single dollar signs like $x$ or $y=mx+c$.\n"
     "- **IMPORTANT**: Wrap all block math equations in double dollar signs like $$ \\int_{{0}}^{{\\infty}} x^2 dx $$.\n"
     "- **CRITICAL**: Use DOUBLE BACKSLASHES ('\\\\') for all LaTeX commands (e.g., use \\\\frac{{dy}}{{dx}} instead of \\frac{{dy}}{{dx}}). This is required for valid JSON.\n"
     "- Ensure questions are suitable for preventing academic malpractice\n"
     "- Questions should appear as if they are from a standard math textbook or exam.\n\n"
     "Difficulty guidelines:\n"
     "- easy: Basic formula application, direct questions\n"
     "- medium: Multi-step problems, conceptual understanding\n"
     "- hard: Complex problems, application of deep concepts\n\n"
     "Return ONLY a JSON array (no markdown, no code blocks):\n"
     "[{{\"question\": \"question text with LaTeX\", \"answer\": \"detailed step-by-step solution\"}}]")
])

generate_questions_prompt_chemistry = ChatPromptTemplate.from_messages([
    ("system", "You are an expert Chemistry exam question generator. Use the provided context. Return ONLY valid JSON."),
    ("human",
     "Context from chemistry textbook:\n{context}\n\n"
     "SELECTED TOPIC: {topic}\n\n"
     "Generate {num_questions} COMPLETELY UNIQUE and DIVERSE chemistry questions at {level} difficulty level.\n\n"
     "CRITICAL REQUIREMENTS:\n"
     "- Questions must be about {topic}.\n"
     "- Cover organic, inorganic, and physical chemistry concepts as relevant to the topics.\n"
     "- Questions MUST be UNIQUE and NOT repetitive\n"
     "- Use VARIED question formats (reactions, balancing, conceptual, numerical)\n"
     "- Ensure questions are suitable for preventing academic malpractice\n"
     "- Questions should appear as if they are from a standard chemistry textbook or exam.\n\n"
     "Difficulty guidelines:\n"
     "- easy: Definitions, basic properties, simple reactions\n"
     "- medium: Mechanisms, stoichiometry calculations, trends\n"
     "- hard: Complex synthesis, multi-concept problems, deep analysis\n\n"
     "Return ONLY a JSON array (no markdown, no code blocks):\n"
     "[{{\"question\": \"question text\", \"answer\": \"detailed answer\"}}]")
])

evaluate_answer_prompt_physics = ChatPromptTemplate.from_messages([
    ("system", "You are a STRICT Physics examiner. You must be harsh and accurate in your evaluation. Return ONLY valid JSON."),
    ("human",
     "Context:\n{context}\n\n"
     "Question: {question}\n"
     "Correct Answer: {correct_answer}\n"
     "Student Answer: {student_answer}\n\n"
     "Evaluate the student's answer against the correct answer and context.\n"
     "Criteria (Rate 1-10):\n"
     "1. Relevance: Answers the specific question asked\n"
     "2. Clarity: Clear, logical expression\n"
     "3. SubjectUnderstanding: Demonstrates grasp of physics concepts\n"
     "4. Accuracy: Factually correct\n"
     "5. Completeness: Covers all parts of the question\n"
     "6. CriticalThinking: Applies concepts (if applicable)\n\n"
     "Return ONLY a JSON object:\n"
     "{{\n"
     "  \"Relevance\": score,\n"
     "  \"Clarity\": score,\n"
     "  \"SubjectUnderstanding\": score,\n"
     "  \"Accuracy\": score,\n"
     "  \"Completeness\": score,\n"
     "  \"CriticalThinking\": score,\n"
     "  \"average\": calculated_average\n"
     "}}")
])

evaluate_answer_prompt_math = ChatPromptTemplate.from_messages([
    ("system", "You are an expert Mathematics examiner. Your primary goal is to verify if the student found the CORRECT VALUE and used VALID LOGIC.\n"
               "IGNORE formatting differences (e.g., \\bmatrix vs \\pmatrix, \\boxed{{}} vs plain text).\n"
               "IGNORE visual separators (e.g., '====', '----').\n"
               "If the final values (e.g., x=2, y=3) match the correct answer, mark it as ACCURATE (10/10) regardless of style.\n"
               "Return ONLY valid JSON."),
    ("human",
     "Context:\n{context}\n\n"
     "Question: {question}\n"
     "Correct Answer: {correct_answer}\n"
     "Student Answer: {student_answer}\n\n"
     "Evaluate the student's answer.\n"
     "Criteria (Rate 1-10):\n"
     "1. Relevance: Addresses the problem asked\n"
     "2. Clarity: Steps are logical and easy to follow\n"
     "3. SubjectUnderstanding: Uses correct mathematical concepts/theorems\n"
     "4. Accuracy: Calculations and final answer are correct\n"
     "5. Completeness: Showed necessary steps\n"
     "6. CriticalThinking: Approach is efficent/correct\n\n"
     "Return ONLY a JSON object:\n"
     "{{\n"
     "  \"Relevance\": score,\n"
     "  \"Clarity\": score,\n"
     "  \"SubjectUnderstanding\": score,\n"
     "  \"Accuracy\": score,\n"
     "  \"Completeness\": score,\n"
     "  \"CriticalThinking\": score,\n"
     "  \"average\": calculated_average\n"
     "}}")
])

evaluate_answer_prompt_chemistry = ChatPromptTemplate.from_messages([
    ("system", "You are a STRICT Chemistry examiner. Check for correct formulas, reactions, and conceptual accuracy. Return ONLY valid JSON."),
    ("human",
     "Context:\n{context}\n\n"
     "Question: {question}\n"
     "Correct Answer: {correct_answer}\n"
     "Student Answer: {student_answer}\n\n"
     "Evaluate the student's answer.\n"
     "Criteria (Rate 1-10):\n"
     "1. Relevance: Directly answers the question\n"
     "2. Clarity: Explanations/Reactions are clear\n"
     "3. SubjectUnderstanding: Demonstrates chemical principles\n"
     "4. Accuracy: Specific facts/formulas are correct\n"
     "5. Completeness: Covers all required points\n"
     "6. CriticalThinking: Application of theory\n\n"
     "Return ONLY a JSON object:\n"
     "{{\n"
     "  \"Relevance\": score,\n"
     "  \"Clarity\": score,\n"
     "  \"SubjectUnderstanding\": score,\n"
     "  \"Accuracy\": score,\n"
     "  \"Completeness\": score,\n"
     "  \"CriticalThinking\": score,\n"
     "  \"average\": calculated_average\n"
     "}}")
])

topic_extraction_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an expert curriculum analyzer. Your task is to extract the Main Educational Chapters from the provided textbook text. You must generalize specific details into their parent chapter. Return ONLY valid JSON."),
    ("human",
     "Subject: {subject}\n\n"
     "Context from Textbook (Table of Contents/Intro):\n{context}\n\n"
     "INSTRUCTIONS:\n"
     "1. Identify the MAIN CHAPTERS or UNITS from the text.\n"
     "2. The context may contain MULTIPLE Table of Contents sections (e.g. from Part 1 and Part 2). Combine them into a single list.\n"
     "3. IGNORE detailed sub-sections, exercises, 'summary', 'points to ponder', or page numbers.\n"
     "4. If you find a specific sub-topic (e.g., 'Salt in a tank'), DO NOT include it as a separate topic. Instead, map it to its MAIN CHAPTER (e.g., 'Differential Equations') and output ONLY the Main Chapter name.\n"
     "5. The goal is to create a high-level syllabus list (e.g., 'Thermodynamics', 'Calculus', 'Organic Chemistry').\n"
     "6. Do NOT include 'Chapter 1', 'Unit 2' prefixes. Just the Name.\n\n"
     "Return ONLY a JSON object with a single key 'topics' containing the list of unique strings:\n"
     "{{\n"
     "  \"topics\": [\n"
     "    \"Electric Charges and Fields\",\n"
     "    \"Electrostatic Potential and Capacitance\",\n"
     "    \"Calculus\",\n"
     "    \"Thermodynamics\"\n"
     "  ]\n"
     "}}")
])
