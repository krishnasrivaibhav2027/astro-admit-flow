import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI


def main():
    load_dotenv()
    api_key = os.environ.get("GEMINI_API_KEY")
    print("Using GEMINI_API_KEY:", api_key[:6] + "..." if api_key else None)

    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.0, api_key=api_key)

    try:
        print("Invoking LLM with test prompt...")
        resp = llm.invoke("Say hello in one short sentence.")
        print("LLM response content:\n", resp.content)
    except Exception as e:
        print("LLM invocation failed with error:")
        print(str(e))


if __name__ == '__main__':
    main()
