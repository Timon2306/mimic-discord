from PIL import Image, ImageFilter
from collections import deque
import numpy as np

img = Image.open('mimic.jpg').convert('RGBA')
width, height = img.size
pixels = img.load()

# Find background mask using BFS flood fill from the borders
visited = np.zeros((width, height), dtype=bool)
bg_mask = np.zeros((width, height), dtype=bool)

queue = deque()

# Add all border pixels to queue if they are light/white
def is_near_white(r, g, b, threshold=230):
    return r >= threshold and g >= threshold and b >= threshold

for x in range(width):
    for y in [0, height - 1]:
        r, g, b, _ = pixels[x, y]
        if is_near_white(r, g, b):
            queue.append((x, y))
            visited[x, y] = True
            bg_mask[x, y] = True

for y in range(height):
    for x in [0, width - 1]:
        if not visited[x, y]:
            r, g, b, _ = pixels[x, y]
            if is_near_white(r, g, b):
                queue.append((x, y))
                visited[x, y] = True
                bg_mask[x, y] = True

# BFS
while queue:
    cx, cy = queue.popleft()
    for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        nx, ny = cx + dx, cy + dy
        if 0 <= nx < width and 0 <= ny < height and not visited[nx, ny]:
            visited[nx, ny] = True
            r, g, b, _ = pixels[nx, ny]
            # If color is light/white
            if is_near_white(r, g, b, threshold=225):
                bg_mask[nx, ny] = True
                queue.append((nx, ny))

# Now create output image with smooth alpha
out_img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
out_pixels = out_img.load()

for x in range(width):
    for y in range(height):
        r, g, b, _ = pixels[x, y]
        if bg_mask[x, y]:
            out_pixels[x, y] = (r, g, b, 0)
        else:
            # Check edge antialiasing
            out_pixels[x, y] = (r, g, b, 255)

out_img.save('mimic.png', 'PNG')
out_img.save('public/mimic.png', 'PNG')
print('Successfully saved transparent mimic.png')
