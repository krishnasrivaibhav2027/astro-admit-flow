import sys
import os
from pathlib import Path
from fastapi.routing import APIRoute

# Add current dir to sys.path
sys.path.append(os.getcwd())

try:
    from server import app
    print("\n🔍 LISTING ALL REGISTERED ROUTES:\n")
    print(f"{'METHOD':<10} {'PATH':<50} {'NAME'}")
    print("-" * 80)
    
    sorted_routes = sorted(app.routes, key=lambda r: getattr(r, "path", ""))
    
    for route in sorted_routes:
        if isinstance(route, APIRoute):
            methods = ", ".join(route.methods)
            print(f"{methods:<10} {route.path:<50} {route.name}")
            
    print("\n✅ Route verify complete.")
    
except Exception as e:
    print(f"❌ Error loading app: {e}")
    import traceback
    traceback.print_exc()
