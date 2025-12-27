import asyncio
import os
import logging

# Windows fix
if os.name == 'nt':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def test_persistence():
    try:
        from chatbot_graph import chatbot_graph, shared_checkpointer
        from langchain_core.messages import HumanMessage
        
    with open("simulate_result.txt", "w", encoding="utf-8") as f:
        f.write("1. Graph and Checkpointer loaded.\n")
        f.write(f"Checkpointer: {type(shared_checkpointer)}\n")
        
        if not shared_checkpointer:
            f.write("ERROR: Shared checkpointer is None.\n")
            return

        if hasattr(shared_checkpointer, 'asetup'):
            await shared_checkpointer.asetup()

        thread_id = "chat_TEST_STUDENT_123_456"
        config = {"configurable": {"thread_id": thread_id}}
        
        f.write(f"2. Running graph update for thread: {thread_id}\n")
        
        await chatbot_graph.aupdate_state(config, {"messages": [HumanMessage(content="Test persistence message")]})
        
        f.write("3. State updated. Checking keys in Redis...\n")
        
        from redis.asyncio import Redis
        redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
        r = Redis.from_url(redis_url)
        
        keys = []
        async for k in r.scan_iter("*"):
             keys.append(k.decode('utf-8'))
             
        f.write(f"Total Keys: {len(keys)}\n")
        found = False
        for k in keys:
            f.write(f" - {k}\n")
            if thread_id in k:
                found = True
                
        if found:
            f.write("\nSUCCESS: Found thread_id in Redis keys!\n")
        else:
            f.write("\nFAILURE: Did not find thread_id in Redis keys.\n")
            
        await r.close()
        
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_persistence())
