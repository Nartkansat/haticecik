"""
Builds the full widescreen HD (1280x720) experience video for the web.
Properly scales and centers:
- Eye: Big, wide, high-resolution ASCII eye centered in 1280x720.
- Flower: Full HD pointillism bloom, wilting & falling petals in 1280x720.
- Bouquet: High-res ASCII -> Digital Scanline Dissolve -> Crisp Real Photo in 1280x720.
"""

import time
import os
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

import eye
import flower
import bouquet

def main():
    W, H = 1280, 720
    FPS = 30
    TOTAL_DUR = 75.0  # seconds
    TOTAL_FRAMES = int(TOTAL_DUR * FPS)
    
    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "experience.mp4")
    
    print(f"Target HD Video: {out_path} ({W}x{H} @ {FPS} fps, {TOTAL_FRAMES} frames, {TOTAL_DUR}s)")
    
    # 1. Initialize modules for 1280x720
    cw, ch = 10, 20
    rows = 36
    eye.ASPECT = 1.6
    eye.init(cw, ch, rows)
    eye_x0 = (W - eye.W) // 2
    eye_y0 = (H - eye.H) // 2
    
    plant = flower.Plant(W, H)
    bq = bouquet.BouquetTransition(W, H)
    
    try:
        font = ImageFont.truetype("consola.ttf", 16)
    except Exception:
        font = ImageFont.load_default()
        
    fourcc = cv2.VideoWriter_fourcc(*'avc1')
    writer = cv2.VideoWriter(out_path, fourcc, FPS, (W, H))
    if not writer.isOpened():
        print("Warning: avc1 failed, falling back to mp4v")
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        writer = cv2.VideoWriter(out_path, fourcc, FPS, (W, H))
        
    t_start = time.perf_counter()
    dt = 1.0 / FPS
    
    print("Rendering widescreen HD frames...")
    
    for f in range(TOTAL_FRAMES):
        t = f * dt
        
        if t < 33.0:
            # Phase 1: Eye & Heart
            idx, q = eye.render_cells(t, dt)
            im = Image.new("RGB", (W, H), (1, 2, 3))
            draw = ImageDraw.Draw(im)
            rows_n, cols_n = idx.shape
            for r in range(rows_n):
                for c in range(cols_n):
                    ch_idx = idx[r, c]
                    if ch_idx == 0:
                        continue
                    ch_char = eye.RAMP[ch_idx]
                    if ch_char == ' ':
                        continue
                    color = tuple(int(v * 255 / (eye.QL - 1)) for v in q[r, c])
                    if max(color) < 5:
                        continue
                    draw.text((eye_x0 + c * cw, eye_y0 + r * ch), ch_char, fill=color, font=font)
            frame_rgb = np.array(im)
            
        elif t < 63.0:
            # Phase 2: Flower
            t_fl = (t - 33.0) * 1.6
            frame_t = min(45.0, t_fl)
            frame_rgb = plant.render(frame_t, live_t=t_fl)
            if t_fl >= 44.0:
                fade = max(0.0, 1.0 - (t_fl - 44.0) / 4.0)
                frame_rgb = (frame_rgb.astype(np.float32) * fade).astype(np.uint8)
                
        else:
            # Phase 3: Bouquet (ASCII -> Real Photo)
            t_bq = t - 63.0
            frame_rgb = bq.render(t_bq)
            
        # Convert RGB to BGR for OpenCV VideoWriter
        frame_bgr = cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2BGR)
        writer.write(frame_bgr)
        
        if (f + 1) % 150 == 0 or f == TOTAL_FRAMES - 1:
            pct = (f + 1) / TOTAL_FRAMES * 100.0
            elapsed = time.perf_counter() - t_start
            fps_speed = (f + 1) / elapsed
            eta = (TOTAL_FRAMES - (f + 1)) / fps_speed
            print(f"[{pct:5.1f}%] Frame {f + 1}/{TOTAL_FRAMES} ({fps_speed:.1f} fps, ETA: {eta:.1f}s)", flush=True)
            
    writer.release()
    total_time = time.perf_counter() - t_start
    size_mb = os.path.getsize(out_path) / (1024 * 1024)
    print(f"DONE! Saved {out_path} ({size_mb:.2f} MB in {total_time:.1f}s)", flush=True)

if __name__ == "__main__":
    main()
