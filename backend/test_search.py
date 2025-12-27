from youtube_search import YoutubeSearch
import json

def test_search():
    print("Testing YouTube Search...")
    try:
        results = YoutubeSearch('calculus derivatives', max_results=5).to_dict()
        print(f"✅ Success! Found {len(results)} videos.")
        print(json.dumps(results[:1], indent=2))
        return True
    except Exception as e:
        print(f"❌ Failed: {e}")
        return False

if __name__ == "__main__":
    test_search()
