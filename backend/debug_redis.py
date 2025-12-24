
import redis
import sys

print(f"Redis Version: {redis.__version__}")
print(f"Redis File: {redis.__file__}")

try:
    from redis.commands.search.indexDefinition import IndexDefinition
    print("Import 1 Success: redis.commands.search.indexDefinition")
except ImportError as e:
    print(f"Import 1 Failed: {e}")

try:
    from redis.commands.search.index_definition import IndexDefinition
    print("Import 2 Success: redis.commands.search.index_definition")
except ImportError as e:
    print(f"Import 2 Failed: {e}")

try:
    import redis.commands.search
    print("Contents of redis.commands.search:")
    print(dir(redis.commands.search))
except ImportError as e:
    print(f"Failed to import redis.commands.search: {e}")
