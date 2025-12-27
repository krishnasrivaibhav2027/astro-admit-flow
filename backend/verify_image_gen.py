
import os
import logging
from image_generator import get_image_generator

# Setup logging
logging.basicConfig(level=logging.INFO)

def test_generation():
    print("="*50)
    print("TESTING IMAGE GENERATION")
    print("="*50)

    # Force the path explicitly for this test to be sure
    creds_path = os.path.abspath("gen-ai-project-472608-3789bb2bf91e.json")
    print(f"Using explicit credentials path: {creds_path}")
    
    try:
        if not os.path.exists(creds_path):
            print(f"ERROR: File not found at {creds_path}")
            # Try auto-detect via init
            print("Attempting auto-detection via ImageGenerator default init...")
            generator = get_image_generator()
        else:
            generator = get_image_generator(credentials_path=creds_path)
            
        print("Generator initialized.")
        
        print("Generating image...")
        images = generator.generate_image("A cute robot holding a sign that says 'Success'", number_of_images=1)
        
        if images:
            print(f"Success! Generated {len(images)} images.")
            output_path = "test_image_gen_success.png"
            generator.save_image(images[0], output_path)
            print(f"Saved to {output_path}")
        else:
            print("No images returned.")

    except Exception as e:
        print(f"FAILED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # diagnose_credentials()
    test_generation()
