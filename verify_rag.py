
import sys
import os

# Ensure root is in path
sys.path.append(os.getcwd())

print("🧪 Testing RAG Expansion...")

try:
    # Try importing directly if backend is in path, or as module
    try:
        from backend.rag_setup import setup_all_subjects
        from backend.rag_module import get_context, get_physics_context
    except ImportError:
        # If that fails, maybe we need to add backend to path and import directly
        sys.path.append(os.path.join(os.getcwd(), 'backend'))
        from rag_setup import setup_all_subjects
        from rag_module import get_context, get_physics_context

except ImportError as e:
    print(f"❌ Import failed: {e}")
    # Print sys.path to debug
    print(f"Path: {sys.path}")
    sys.exit(1)

print("\n1️⃣  Testing Setup (should handle missing PDFs gracefully)...")
try:
    setup_all_subjects()
    print("✅ Setup script ran without crashing.")
except Exception as e:
    print(f"❌ Setup script crashed: {e}")

print("\n2️⃣  Testing Context Retrieval...")

# Test Physics (Should exist if NCERT-Physics.pdf is there)
print("\n   👉 Testing Physics (Legacy)...")
ctx_phy = get_physics_context("Newton", k=1)
if ctx_phy:
    print(f"   ✅ Got Physics context: {len(ctx_phy)} chunks")
else:
    print("   ⚠️  No Physics context (Expected if no DB/PDF)")

print("\n   👉 Testing Math (New)...")
ctx_math = get_context("Integrals", subject="math")
if ctx_math:
    print(f"   ✅ Got Math context: {len(ctx_math)} chunks")
else:
    print("   ℹ️  No Math context (Expected since no PDF)")

print("\n   👉 Testing Chemistry (New)...")
ctx_chem = get_context("Periodic Table", subject="chemistry")
if ctx_chem:
    print(f"   ✅ Got Chemistry context: {len(ctx_chem)} chunks")
else:
    print("   ℹ️  No Chemistry context (Expected since no PDF)")

print("\n✅ Verification Complete.")
