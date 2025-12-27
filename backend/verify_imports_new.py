
try:
    print("Check 1: Importing chatbot_tools...")
    import chatbot_tools
    print("✅ chatbot_tools imported")

    print("Check 2: Importing chatbot_graph...")
    import chatbot_graph
    print("✅ chatbot_graph imported")

    print("Check 3: Importing chatbot_routes...")
    import chatbot_routes
    print("✅ chatbot_routes imported")
    
    # We avoid importing server.py fully because it starts apps/connections, 
    # but we can try to import it if we mock things or just trust previous steps.
    # Let's just check the new modules.
    
except Exception as e:
    print(f"❌ Import failed: {e}")
    import traceback
    traceback.print_exc()
