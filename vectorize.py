import cv2
import numpy as np
import os

img_path = r'C:\Users\Wenqinghu\.gemini\antigravity\brain\4e118681-6745-4771-aec9-dc5fe2a824c0\media__1784440120950.png'
img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
h, w = img.shape
print(f"Image size: {w}x{h}")

# Thresholding to extract black line art
_, thresh = cv2.threshold(img, 200, 255, cv2.THRESH_BINARY_INV)

# Find contours
contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_TC89_KCOS)

svg_paths = []
for cnt in contours:
    if cv2.contourArea(cnt) < 5:
        continue
    # Simplify contour slightly for clean SVG rendering
    epsilon = 0.001 * cv2.arcLength(cnt, True)
    approx = cv2.approxPolyDP(cnt, epsilon, True)
    pts = approx.squeeze()
    if len(pts) < 3:
        continue
    d = f"M {pts[0][0]} {pts[0][1]} " + " ".join([f"L {p[0]} {p[1]}" for p in pts[1:]]) + " Z"
    svg_paths.append(d)

print(f"Extracted {len(svg_paths)} SVG contour paths.")

svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="100%" height="100%">
  <g fill="var(--text-main, #2C2C2C)">
'''
for d in svg_paths:
    svg_content += f'    <path d="{d}" />\n'
svg_content += '  </g>\n</svg>'

out_file = r'C:\Users\Wenqinghu\.gemini\antigravity\scratch\knitting-helper\cat_line_art.svg'
with open(out_file, 'w', encoding='utf-8') as f:
    f.write(svg_content)

print(f"Successfully saved 1:1 vector SVG to {out_file}")
