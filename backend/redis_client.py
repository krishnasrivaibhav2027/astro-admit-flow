
import os
import logging
import redis
from dotenv import load_dotenv

load_dotenv()

class RedisClient:
    _instance = None
    _client = None
    _is_redis_stack = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RedisClient, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        try:
            redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
            self._client = redis.from_url(redis_url, decode_responses=True)
            self._client.ping()
            logging.info(f"✅ Connected to Redis at {redis_url}")
            
            # Check for RediSearch module
            try:
                info = self._client.info("modules")
                # info['modules'] is usually a list of dicts if using standard response, 
                # but redis-py might parse it differently. 
                # Simplest check: try a dummy FT.SEARCH command or check 'ft' in module list
                module_list = self._client.module_list()
                
                # module_list returns list of ModuleInfo objects or dicts
                has_search = any(m.get('name') == 'search' or m.get('name') == 'ft' for m in module_list)
                
                if has_search:
                    self._is_redis_stack = True
                    logging.info("✅ Redis Stack (RediSearch) detected. Vector Search ENABLED.")
                else:
                    self._is_redis_stack = False
                    logging.warning("⚠️ Standard Redis detected. Vector Search DISABLED (Fall back to Supabase). Graph features still available.")
                    
            except Exception as e:
                # Some older redis versions or specific configs might fail module_list
                logging.warning(f"⚠️ Could not verify Redis modules: {e}. Assuming Standard Redis.")
                self._is_redis_stack = False
                
        except Exception as e:
            logging.error(f"❌ Failed to connect to Redis: {e}")
            self._client = None
            self._is_redis_stack = False

    def get_client(self):
        return self._client

    def is_stack(self):
        return self._is_redis_stack

# Global instance
redis_manager = RedisClient()

def get_redis():
    return redis_manager.get_client()
