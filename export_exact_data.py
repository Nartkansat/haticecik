"""
Exports 100% mathematically exact data from Python modules for live JavaScript execution:
1. eye_data.bin: Exact cell-by-cell character and color stream from eye.py (990 frames).
2. flower_model.bin: Exact 33,000 3D botanical points and palettes from flower.py.
3. bouquet_ascii_gold.jpg: High-res ASCII bouquet with vibrant golden stamens.
"""

import os
import struct
import zlib
import time
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont

import eye
import flower
import bouquet

def export_eye_data(out_dir):
    print("--- 1. Exporting exact eye.py data ---")
    W, H = 1280, 720
    cw, ch = 10, 20
    rows = 36
    eye.ASPECT = 1.6
    eye.init(cw, ch, rows)
    
    COLS = eye.COLS
    ROWS = eye.ROWS
    FPS = 30
    TOTAL_FRAMES = int(33.0 * FPS) # 990 frames
    
    print(f"Eye grid: {COLS}x{ROWS} ({COLS*ROWS} cells), {TOTAL_FRAMES} frames")
    
    header = struct.pack("<IIIII", COLS, ROWS, cw, ch, TOTAL_FRAMES)
    frame_bytes = bytearray()
    
    t0 = time.perf_counter()
    for f in range(TOTAL_FRAMES):
        t = f / float(FPS)
        idx, q = eye.render_cells(t, 1.0 / FPS)
        
        # idx: uint8 (COLS * ROWS)
        frame_bytes.extend(idx.astype(np.uint8).tobytes())
        # q: 3 x uint8 (COLS * ROWS * 3)
        frame_bytes.extend(q.astype(np.uint8).tobytes())
        
        if (f + 1) % 200 == 0:
            print(f"  Rendered eye frame {f + 1}/{TOTAL_FRAMES}")
            
    compressed = zlib.compress(header + frame_bytes, level=9)
    out_path = os.path.join(out_dir, "eye_data.bin")
    with open(out_path, "wb") as fp:
        fp.write(compressed)
        
    dt = time.perf_counter() - t0
    print(f"DONE eye_data.bin: {len(compressed)/1024:.1f} KB in {dt:.1f}s")


def export_flower_model(out_dir):
    print("--- 2. Exporting exact flower.py model ---")
    W, H = 720, 720
    plant = flower.Plant(W, H)
    
    buf = bytearray()
    keys = ['stem', 'leaf', 'head', 'st', 'halo', 'ring', 'spark', 'fall', 'cr']
    
    buf.extend(struct.pack("<I", len(keys)))
    
    for k in keys:
        item = getattr(plant, k)
        first_k = list(item.keys())[0]
        n_points = len(item[first_k])
        name_bytes = k.encode('utf-8')
        
        buf.extend(struct.pack("<II", len(name_bytes), n_points))
        buf.extend(name_bytes)
        
        sub_keys = list(item.keys())
        buf.extend(struct.pack("<I", len(sub_keys)))
        
        for sk in sub_keys:
            val = item[sk]
            sk_bytes = sk.encode('utf-8')
            buf.extend(struct.pack("<I", len(sk_bytes)))
            buf.extend(sk_bytes)
            
            # Format: 0 = float32, 1 = uint8
            if val.dtype == np.uint8:
                dtype_code = 1
                raw = val.tobytes()
            else:
                dtype_code = 0
                raw = val.astype(np.float32).tobytes()
                
            buf.extend(struct.pack("<II", dtype_code, len(raw)))
            buf.extend(raw)
            
    compressed = zlib.compress(buf, level=9)
    out_path = os.path.join(out_dir, "flower_model.bin")
    with open(out_path, "wb") as fp:
        fp.write(compressed)
        
    print(f"DONE flower_model.bin: {len(compressed)/1024:.1f} KB (Contains all 33,000 points & palettes)")


def export_bouquet_ascii_gold(out_dir):
    print("--- 3. Exporting golden ASCII bouquet ---")
    bq = bouquet.BouquetTransition(768, 1024)
    out_img = bq.ascii_fitted # Has the enhanced golden stamens
    out_bgr = cv2.cvtColor(out_img, cv2.COLOR_RGB2BGR)
    out_path = os.path.join(out_dir, "bouquet_ascii_gold.jpg")
    cv2.imwrite(out_path, out_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
    print(f"DONE bouquet_ascii_gold.jpg: {os.path.getsize(out_path)/1024:.1f} KB")


def main():
    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web")
    os.makedirs(out_dir, exist_ok=True)
    
    export_eye_data(out_dir)
    export_flower_model(out_dir)
    export_bouquet_ascii_gold(out_dir)
    print("ALL EXACT ASSETS EXPORTED SUCCESSFULLY!")

if __name__ == "__main__":
    main()

