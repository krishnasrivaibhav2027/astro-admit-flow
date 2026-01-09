"""
Redis Client with caching support for chat history.
Handles both single-worker and multi-worker deployments.
"""
import os
import logging
import redis
import json
from dotenv import load_dotenv

load_dotenv()

class RedisClient:
    _instance = None
    _client = None
    _is_redis_stack = False
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RedisClient, cls).__new__(cls)
        return cls._instance

    def _initialize(self):
        """Initialize Redis connection. Safe to call multiple times."""
        if self._initialized and self._client:
            return
            
        try:
            redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
            self._client = redis.from_url(redis_url, decode_responses=True)
            self._client.ping()
            self._initialized = True
            logging.info(f"✅ Connected to Redis at {redis_url}")
            
            # Check for RediSearch module
            try:
                info = self._client.info("modules")
                module_list = self._client.module_list()
                has_search = any(m.get('name') == 'search' or m.get('name') == 'ft' for m in module_list)
                
                if has_search:
                    self._is_redis_stack = True
                    logging.info("✅ Redis Stack (RediSearch) detected. Vector Search ENABLED.")
                else:
                    self._is_redis_stack = False
                    logging.warning("⚠️ Standard Redis detected. Vector Search DISABLED (Fall back to Supabase).")
                    
            except Exception as e:
                logging.warning(f"⚠️ Could not verify Redis modules: {e}. Assuming Standard Redis.")
                self._is_redis_stack = False
                
        except Exception as e:
            logging.error(f"❌ Failed to connect to Redis: {e}")
            self._client = None
            self._is_redis_stack = False
            self._initialized = False

    def _ensure_connected(self):
        """Ensure Redis connection is initialized before operations."""
        if not self._initialized or not self._client:
            self._initialize()
        return self._client is not None

    def get_client(self):
        self._ensure_connected()
        return self._client

    def is_stack(self):
        self._ensure_connected()
        return self._is_redis_stack
    
    # ===== Cache Helper Methods =====
    
    def cache_set(self, key: str, data: any, ttl_seconds: int = 300) -> bool:
        """
        Store JSON-serializable data in Redis with TTL.
        Returns True on success, False on failure.
        """
        if not self._ensure_connected():
            print(f"[CACHE SET] SKIPPED - Redis not connected: {key}")
            return False
        try:
            json_data = json.dumps(data)
            self._client.setex(key, ttl_seconds, json_data)
            print(f"[CACHE SET] {key} (TTL: {ttl_seconds}s)")
            return True
        except Exception as e:
            print(f"[CACHE SET ERROR] {key}: {e}")
            logging.warning(f"[CACHE SET ERROR] {key}: {e}")
            return False
    
    def cache_get(self, key: str) -> any:
        """
        Retrieve and parse cached JSON data.
        Returns None on miss or failure.
        """
        if not self._ensure_connected():
            print(f"[CACHE GET] SKIPPED - Redis not connected: {key}")
            return None
        try:
            data = self._client.get(key)
            if data:
                print(f"[CACHE HIT] {key}")
                return json.loads(data)
            print(f"[CACHE MISS] {key}")
            return None
        except Exception as e:
            print(f"[CACHE GET ERROR] {key}: {e}")
            logging.warning(f"[CACHE GET ERROR] {key}: {e}")
            return None
    
    def cache_delete(self, key: str) -> bool:
        """
        Delete a specific cache entry.
        Returns True on success.
        """
        if not self._ensure_connected():
            return False
        try:
            self._client.delete(key)
            print(f"[CACHE DELETE] {key}")
            return True
        except Exception as e:
            print(f"[CACHE DELETE ERROR] {key}: {e}")
            logging.warning(f"[CACHE DELETE ERROR] {key}: {e}")
            return False
    
    def cache_delete_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching a pattern (e.g., 'chat:threads:*').
        Returns count of deleted keys.
        """
        if not self._ensure_connected():
            return 0
        try:
            keys = self._client.keys(pattern)
            if keys:
                count = self._client.delete(*keys)
                print(f"[CACHE DELETE PATTERN] {pattern}: {count} keys")
                return count
            return 0
        except Exception as e:
            print(f"[CACHE DELETE PATTERN ERROR] {pattern}: {e}")
            logging.warning(f"[CACHE DELETE PATTERN ERROR] {pattern}: {e}")
            return 0

# Global instance - lazy initialization
redis_manager = RedisClient()

def get_redis():
    return redis_manager.get_client()
