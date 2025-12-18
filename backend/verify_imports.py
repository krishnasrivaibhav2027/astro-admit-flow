
try:
    from langchain_core.prompts import ChatPromptTemplate
    print("SUCCESS: Imported ChatPromptTemplate from langchain_core.prompts")
except ImportError as e:
    print(f"ERROR: {e}")
except Exception as e:
    print(f"ERROR: {e}")
