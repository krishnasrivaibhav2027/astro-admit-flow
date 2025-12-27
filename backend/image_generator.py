"""
Clean Image Generator for Vertex AI Imagen
Handles authentication and image generation without deprecated code
"""

import os
import logging
import warnings
from pathlib import Path
from typing import List, Optional, Dict, Any
from google.oauth2 import service_account
import vertexai
from vertexai.vision_models import ImageGenerationModel
import uuid

# Suppress deprecation warnings
warnings.filterwarnings('ignore', category=UserWarning, message='.*deprecated as of June 24.*')

logger = logging.getLogger(__name__)

# --- CRITICAL AUTHENTICATION FIX ---
# Hardcode the known credentials path provided by the user
KNOWN_CREDENTIALS_PATH = r"D:\GitRepos\astro-admit-flow\backend\gen-ai-project-472608-3789bb2bf91e.json"

if os.path.exists(KNOWN_CREDENTIALS_PATH):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = KNOWN_CREDENTIALS_PATH
    logger.info(f"✓ [MODULE LEVEL] Set GOOGLE_APPLICATION_CREDENTIALS={KNOWN_CREDENTIALS_PATH}")
else:
    logger.warning(f"⚠ [MODULE LEVEL] Could not find specific credentials at: {KNOWN_CREDENTIALS_PATH}")
# -----------------------------------

class ImageGenerator:
    """Handle image generation using Google Vertex AI with proper authentication"""
    
    def __init__(self, credentials_path: Optional[str] = None):
        """
        Initialize the image generator with explicit credentials
        
        Args:
            credentials_path: Path to service account JSON file
                            If None, will try environment variable or auto-detect
        """
        self.project_id = "gen-ai-project-472608"
        self.location = "us-central1"
        self.credentials = None
        
        # Try to load credentials
        if not credentials_path:
            credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
            
        # Try known path if still not set
        if not credentials_path and os.path.exists(KNOWN_CREDENTIALS_PATH):
            credentials_path = KNOWN_CREDENTIALS_PATH
            logger.info(f"✓ Using known credential path: {credentials_path}")
        
        # Auto-detect credential file in current directory or script directory
        if not credentials_path:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            search_paths = ['.', script_dir]
            
            for path in search_paths:
                try:
                    if not os.path.exists(path):
                        continue
                        
                    possible_files = [f for f in os.listdir(path) if f.endswith('.json') and 'gen-ai' in f]
                    if possible_files:
                        credentials_path = os.path.join(path, possible_files[0])
                        logger.info(f"✓ Auto-detected credential file: {credentials_path}")
                        break
                except Exception as e:
                    logger.debug(f"Couldn't search {path}: {e}")
        
        if not credentials_path:
            raise ValueError(
                "No credentials found!\n"
                "Please either:\n"
                "1. Set GOOGLE_APPLICATION_CREDENTIALS environment variable\n"
                "2. Pass credentials_path parameter\n"
                "3. Place your JSON key file in the project directory"
            )
        
        # Verify file exists
        if not os.path.exists(credentials_path):
            raise FileNotFoundError(
                f"Credentials file not found at: {credentials_path}\n"
                f"Current working directory: {os.getcwd()}"
            )
            
        # CRITICAL FIX: Set the environment variable explicitly
        # This ensures all Google Cloud libraries (including underlying ones) pick it up
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path
        logger.info(f"✓ Set GOOGLE_APPLICATION_CREDENTIALS={credentials_path}")
        
        try:
            # Load credentials
            self.credentials = service_account.Credentials.from_service_account_file(
                credentials_path,
                scopes=['https://www.googleapis.com/auth/cloud-platform']
            )
            
            logger.info(f"✓ Loaded credentials from: {credentials_path}")
            
            # Initialize Vertex AI
            vertexai.init(
                project=self.project_id,
                location=self.location,
                credentials=self.credentials
            )
            
            logger.info(f"✓ Vertex AI initialized for project: {self.project_id}")
            
        except Exception as e:
            logger.error(f"Failed to initialize Vertex AI: {e}")
            raise
    
    def generate_image(
        self, 
        prompt: str, 
        number_of_images: int = 1,
        negative_prompt: Optional[str] = None,
        aspect_ratio: str = "1:1"
    ) -> List:
        """
        Generate images from text prompt
        
        Args:
            prompt: Description of the image to generate
            number_of_images: Number of images (1-4)
            negative_prompt: Things to avoid in the image
            aspect_ratio: "1:1", "9:16", "16:9", "4:3", or "3:4"
            
        Returns:
            List of generated image objects
        """
        logger.info(f"[IMAGEN] Generating {number_of_images} image(s)...")
        logger.debug(f"Prompt: {prompt[:100]}...")
        
        # Load model
        model = ImageGenerationModel.from_pretrained("imagegeneration@006")
        
        # Generate images
        response = model.generate_images(
            prompt=prompt,
            number_of_images=number_of_images,
            negative_prompt=negative_prompt,
            aspect_ratio=aspect_ratio,
            safety_filter_level="block_some",
            person_generation="allow_adult",
        )
        
        # Handle response (newer SDK versions return ImageGenerationResponse)
        images = response.images if hasattr(response, 'images') else response
        
        logger.info(f"✓ Successfully generated {len(images)} image(s)")
        return images
    
    def save_image(self, image, output_path: str) -> str:
        """Save a single generated image"""
        os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
        image.save(output_path)
        logger.info(f"✓ Image saved to: {output_path}")
        return output_path
    
    def save_images(self, images, output_dir: str = "generated_images", prefix: str = "image") -> List[str]:
        """Save multiple generated images"""
        os.makedirs(output_dir, exist_ok=True)
        saved_paths = []
        
        for i, image in enumerate(images):
            path = os.path.join(output_dir, f"{prefix}_{i}.png")
            saved_path = self.save_image(image, path)
            saved_paths.append(saved_path)
        
        return saved_paths


# Singleton instance
_image_generator = None

def get_image_generator(credentials_path: Optional[str] = None) -> ImageGenerator:
    """Get or create the ImageGenerator singleton instance"""
    global _image_generator
    if _image_generator is None:
        _image_generator = ImageGenerator(credentials_path=credentials_path)
    return _image_generator


def generate_educational_illustration(prompt: str, subject: str = "general") -> Dict[str, Any]:
    """
    Generate an educational illustration using Vertex AI Imagen
    
    Args:
        prompt: Description of the illustration to generate
        subject: Subject area (physics, chemistry, mathematics, etc.)
        
    Returns:
        Dictionary with success status, image_url, and metadata
    """
    logger.info("=" * 60)
    logger.info(f"[IMAGE_GEN] Starting generation for: {prompt[:50]}...")
    logger.info("=" * 60)
    
    try:
        # Enhanced prompt for educational content
        enhanced_prompt = (
            f"Create a clear, professional educational illustration for {subject}: {prompt}. "
            f"Style: Clean diagram suitable for students, clear labels, scientific accuracy, "
            f"high visibility colors, professional quality."
        )
        
        logger.info("[IMAGE_GEN] Getting image generator instance...")
        img_gen = get_image_generator()
        logger.info("[IMAGE_GEN] ✓ Generator ready")
        
        logger.info("[IMAGE_GEN] Calling Vertex AI API...")
        images = img_gen.generate_image(
            prompt=enhanced_prompt,
            number_of_images=1,
            negative_prompt="blurry, low quality, distorted, text errors, wrong labels, unclear",
            aspect_ratio="16:9"
        )
        logger.info(f"[IMAGE_GEN] ✓ API call successful - received {len(images)} image(s)")
        
        if not images:
            raise Exception("No images generated from API")
        
        # Save the image
        output_dir = Path("static/generated_images")
        output_dir.mkdir(parents=True, exist_ok=True)
        
        filename = f"edu_{uuid.uuid4().hex[:8]}.png"
        output_path = output_dir / filename
        
        img_gen.save_image(images[0], str(output_path))
        logger.info(f"[IMAGE_GEN] ✓ Image saved: {output_path}")
        
        # Return URL path
        # Assuming server runs on localhost:8000, but frontend proxies /api usually.
        # If frontend is on 5173 and backend on 8000, we might need full URL if proxy isn't catching /static.
        # But server.py mounts /static.
        # Let's try returning the full URL for localhost to be safe.
        
        # Get base URL from env or default
        base_url = os.environ.get("API_BASE_URL", "http://127.0.0.1:8001")
        image_url = f"{base_url}/static/generated_images/{filename}"
        
        logger.info("=" * 60)
        logger.info(f"[IMAGE_GEN] ✅ SUCCESS! Image URL: {image_url}")
        logger.info("=" * 60)
        
        return {
            "success": True,
            "type": "image",
            "image_url": image_url,
            "description": f"Generated illustration for: {prompt}",
            "subject": subject
        }
        
    except Exception as e:
        logger.error("=" * 60)
        logger.error(f"[IMAGE_GEN] ❌ GENERATION FAILED")
        logger.error(f"[IMAGE_GEN] Error: {e}")
        logger.error("=" * 60)
        logger.exception("Full traceback:")
        
        # Return error response
        return {
            "success": False,
            "type": "error",
            "error": str(e),
            "description": f"Failed to generate illustration for: {prompt}"
        }


# Simple test function
def test_image_generation(test_prompt: str = "solar system with planets"):
    """Test the image generation setup"""
    print("\n" + "=" * 60)
    print("TESTING IMAGE GENERATION")
    print("=" * 60)
    
    result = generate_educational_illustration(
        prompt=test_prompt,
        subject="astronomy"
    )
    
    print("\nRESULT:")
    print(f"  Success: {result.get('success')}")
    print(f"  Type: {result.get('type')}")
    
    if result.get('success'):
        print(f"  ✅ Image URL: {result.get('image_url')}")
        print(f"  Description: {result.get('description')}")
    else:
        print(f"  ❌ Error: {result.get('error')}")
    
    print("=" * 60)
    return result


if __name__ == "__main__":
    # Run test when script is executed directly
    test_image_generation()
