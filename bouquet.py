"""
Bouquet Phase: Original Photo to ASCII Code Transition
Handles the transition from high-res photograph to colored ASCII code art.
"""

import os
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

class BouquetTransition:
    def __init__(self, W, H, photo_path="bouquet.jpg", target_ascii_path="bouquet_ascii_target.jpg"):
        self.W = W
        self.H = H
        
        # Base directory
        base_dir = os.path.dirname(os.path.abspath(__file__))
        p1 = os.path.join(base_dir, photo_path) if not os.path.isabs(photo_path) else photo_path
        p2 = os.path.join(base_dir, target_ascii_path) if not os.path.isabs(target_ascii_path) else target_ascii_path
        
        if not os.path.exists(p1):
            raise FileNotFoundError(f"Original photo not found at: {p1}")
            
        im1_bgr = cv2.imread(p1)
        self.im1_rgb = cv2.cvtColor(im1_bgr, cv2.COLOR_BGR2RGB)
        
        if os.path.exists(p2):
            im2_bgr = cv2.imread(p2)
            self.im2_rgb = cv2.cvtColor(im2_bgr, cv2.COLOR_BGR2RGB)
        else:
            # Dynamically generate ASCII from im1 if target file isn't present
            self.im2_rgb = self.generate_ascii(self.im1_rgb)
            
        # Resize both to fit centered within (W, H)
        orig_h, orig_w = self.im1_rgb.shape[:2]
        scale = min(self.W / orig_w, self.H / orig_h)
        self.nw = int(orig_w * scale)
        self.nh = int(orig_h * scale)
        self.x0 = (self.W - self.nw) // 2
        self.y0 = (self.H - self.nh) // 2
        
        self.photo_fitted = cv2.resize(self.im1_rgb, (self.nw, self.nh), interpolation=cv2.INTER_AREA)
        self.ascii_fitted = cv2.resize(self.im2_rgb, (self.nw, self.nh), interpolation=cv2.INTER_AREA)
        
        # Precompute dissolve / scan threshold map
        np.random.seed(42)
        noise = np.random.rand(self.nh // 12, self.nw // 12).astype(np.float32)
        noise = cv2.resize(noise, (self.nw, self.nh), interpolation=cv2.INTER_LINEAR)
        y_grad = np.linspace(0.0, 1.0, self.nh, dtype=np.float32)[:, None]
        self.threshold_map = (y_grad * 0.70 + noise * 0.30).astype(np.float32)
        
    def generate_ascii(self, rgb_img):
        """Dynamic ASCII converter matching Photo 2 format."""
        h, w = rgb_img.shape[:2]
        cw, ch = 12, 18
        cols = w // cw
        rows = h // ch
        
        small = cv2.resize(rgb_img, (cols, rows), interpolation=cv2.INTER_AREA)
        CHARS = " `.-':_,^=;><+!rc*/z?sLTv)J7(|Fi{C}fI31tlu[neoZ5Yxjya]2ESwqkP6h9d4VpOGbUAKXHm8RD#$Bg0MNWQ%&@"
        
        pil_out = Image.new('RGB', (w, h), (0, 0, 0))
        draw = ImageDraw.Draw(pil_out)
        try:
            font = ImageFont.truetype('consola.ttf', 15)
        except Exception:
            font = ImageFont.load_default()
            
        for r in range(rows):
            for c in range(cols):
                rgb = small[r, c]
                lum = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]
                if lum < 10:
                    continue
                char_idx = int((lum / 255.0) * (len(CHARS) - 1))
                ch = CHARS[char_idx]
                color = tuple(min(255, int(v * 1.15)) for v in rgb)
                draw.text((c * cw, r * ch), ch, fill=color, font=font)
                
        return np.array(pil_out)
        
    def render(self, t):
        """
        Renders a frame for time t (seconds) in the Bouquet phase:
        - 0.0s - 2.0s: Fade in ASCII code art
        - 2.0s - 4.0s: ASCII code art shown in full view
        - 4.0s - 8.0s: Digital scan / matrix dissolve transition into original photo
        - > 8.0s: Original photo shown in full crisp beauty
        """
        canvas = np.zeros((self.H, self.W, 3), dtype=np.uint8)
        
        if t < 2.0:
            # Fade in ASCII art from black
            fade = min(1.0, max(0.0, t / 2.0))
            blended = (self.ascii_fitted.astype(np.float32) * fade).astype(np.uint8)
        elif t < 4.0:
            # Hold ASCII art
            blended = self.ascii_fitted
        elif t < 8.0:
            # Transition phase from ASCII to original photo
            p = (t - 4.0) / 4.0  # 0.0 to 1.0
            
            # Non-linear easing
            prog = p * p * (3.0 - 2.0 * p)
            
            # Threshold dissolve mask with soft transition border
            soft_mask = np.clip((prog - self.threshold_map) / 0.12, 0.0, 1.0)[:, :, None]
            
            # Blend: ASCII (1 - soft_mask) -> Original Photo (soft_mask)
            blended = (self.ascii_fitted.astype(np.float32) * (1.0 - soft_mask) +
                       self.photo_fitted.astype(np.float32) * soft_mask)
            
            # Glowing scanline at the frontier
            scan_y = int(np.clip(prog * self.nh, 0, self.nh - 1))
            line_thickness = 4
            y_start = max(0, scan_y - line_thickness)
            y_end = min(self.nh, scan_y + line_thickness)
            if y_end > y_start:
                # Add cyan-magenta digital scanline glow
                glow_color = np.array([255, 120, 220], dtype=np.float32)
                for gy in range(y_start, y_end):
                    dist = abs(gy - scan_y) / float(line_thickness + 1)
                    glow_intensity = (1.0 - dist) * 0.75
                    blended[gy] = np.clip(blended[gy] + glow_color * glow_intensity, 0, 255)
                    
            blended = blended.astype(np.uint8)
        else:
            # Original photo in full clarity
            blended = self.photo_fitted
            
        canvas[self.y0:self.y0 + self.nh, self.x0:self.x0 + self.nw] = blended
        return canvas

