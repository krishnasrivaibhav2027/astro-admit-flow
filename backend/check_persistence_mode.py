import sys
import os
import asyncio

# Fix for windows event loop
if os.name == 'nt':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

try:
    with open("persistence_check.txt", "w") as f:
        try:
            from chatbot_graph import shared_checkpointer
            f.write(f"Checkpointer Type: {type(shared_checkpointer)}\n")
            
            if hasattr(shared_checkpointer, 'conn'):
                f.write(f"Redis Connection: {shared_checkpointer.conn}\n")
            else:
                f.write("No 'conn' attribute found on checkpointer.\n")
                
            from langgraph.checkpoint.memory import MemorySaver
            if isinstance(shared_checkpointer, MemorySaver):
                 f.write("Confirmed: Using MemorySaver (Persistence OFF)\n")
            else:
                 f.write("Confirmed: Not MemorySaver (Persistence ON)\n")

        except Exception as e:
            f.write(f"Error importing graph: {e}\n")
except Exception as e:
    print(e)
