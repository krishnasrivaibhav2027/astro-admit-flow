#!/usr/bin/env python3
"""
Convert robot icon to favicon formats
"""
from PIL import Image
import os

# Open the robot icon
img = Image.open('/app/frontend/public/robot-icon.jpg')

# Convert to RGB if necessary
if img.mode != 'RGB':
    img = img.convert('RGB')

# Create different sizes for favicon
sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]

# Save as PNG (for link tag)
img_resized = img.resize((512, 512), Image.Resampling.LANCZOS)
img_resized.save('/app/frontend/public/icon-512.png', 'PNG')

img_resized = img.resize((192, 192), Image.Resampling.LANCZOS)
img_resized.save('/app/frontend/public/icon-192.png', 'PNG')

# Create favicon.ico with multiple sizes
images = []
for size in sizes:
    resized = img.resize(size, Image.Resampling.LANCZOS)
    images.append(resized)

# Save as ICO
images[0].save('/app/frontend/public/favicon.ico', format='ICO', sizes=sizes, append_images=images[1:])

# Also save as apple touch icon
img_resized = img.resize((180, 180), Image.Resampling.LANCZOS)
img_resized.save('/app/frontend/public/apple-touch-icon.png', 'PNG')

print("✅ Icon conversion complete!")
print("   - favicon.ico (16x16 to 256x256)")
print("   - icon-192.png (192x192)")
print("   - icon-512.png (512x512)")
print("   - apple-touch-icon.png (180x180)")
