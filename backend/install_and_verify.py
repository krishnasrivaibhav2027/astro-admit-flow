import subprocess
import sys

def run_install():
    log_file = "install_log.txt"
    with open(log_file, "w", encoding="utf-8") as f:
        f.write("Starting installation check...\n")
        
        # 1. Run Pip Install
        try:
            cmd = [sys.executable, "-m", "pip", "install", "langchain-openai"]
            f.write(f"Running command: {' '.join(cmd)}\n")
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True
            )
            
            f.write("\n--- STDOUT ---\n")
            f.write(result.stdout)
            f.write("\n--- STDERR ---\n")
            f.write(result.stderr)
            
            if result.returncode == 0:
                f.write("\n✅ Pip install finished successfully.\n")
            else:
                f.write(f"\n❌ Pip install failed with code {result.returncode}.\n")
                
        except Exception as e:
            f.write(f"\n❌ Exception during pip install: {e}\n")

        # 2. Verify Import
        f.write("\nVerifying import...\n")
        try:
            import langchain_openai
            f.write(f"✅ Import successful! Location: {langchain_openai.__file__}\n")
        except ImportError as e:
            f.write(f"❌ Import failed: {e}\n")
            
        # 3. Print Sys Path
        f.write("\n--- Sys Path ---\n")
        for p in sys.path:
            f.write(f"{p}\n")

if __name__ == "__main__":
    run_install()
