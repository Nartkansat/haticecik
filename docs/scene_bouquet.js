/**
 * Phase 3: Exact Bouquet ASCII -> Real Photo Transition Engine
 * Uses the exact golden ASCII art and dissolves in real-time into the original photograph!
 */
class BouquetScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.photo = new Image();
    this.ascii = new Image();
    this.isLoaded = false;
    let loadedCount = 0;

    const onLoad = () => {
      loadedCount++;
      if (loadedCount === 2) {
        this.isLoaded = true;
        this.calcDimensions();
      }
    };

    this.photo.onload = onLoad;
    this.ascii.onload = onLoad;

    this.photo.src = "bouquet.jpg";
    this.ascii.src = "bouquet_ascii_gold.jpg";
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    if (this.isLoaded) {
      this.calcDimensions();
    }
  }

  calcDimensions() {
    const pw = this.photo.naturalWidth || 768;
    const ph = this.photo.naturalHeight || 1024;
    const scale = Math.min(this.w / pw, this.h / ph) * 0.98;

    this.drawW = Math.floor(pw * scale);
    this.drawH = Math.floor(ph * scale);
    this.drawX = Math.floor((this.w - this.drawW) / 2);
    this.drawY = Math.floor((this.h - this.drawH) / 2);
  }

  render(t) {
    const ctx = this.ctx;
    ctx.fillStyle = "#010204";
    ctx.fillRect(0, 0, this.w, this.h);

    if (!this.isLoaded) return;
    if (!this.drawW) this.calcDimensions();

    // t is seconds elapsed in Phase 3
    if (t < 2.0) {
      // 0s - 2s: Fade in ASCII art from black
      const fade = Math.min(1.0, Math.max(0.0, t / 2.0));
      ctx.globalAlpha = fade;
      ctx.drawImage(this.ascii, this.drawX, this.drawY, this.drawW, this.drawH);
      ctx.globalAlpha = 1.0;
    } else if (t < 4.0) {
      // 2s - 4s: Display pure ASCII art with subtle pulse
      const pulse = 1.0 + 0.02 * Math.sin((t - 2.0) * 2.5);
      ctx.drawImage(this.ascii, this.drawX, this.drawY, this.drawW, this.drawH);
    } else if (t < 8.0) {
      // 4s - 8s: Digital Matrix Scanline Dissolve (ASCII -> Real Photo)
      const p = (t - 4.0) / 4.0; // 0.0 to 1.0
      const prog = p * p * (3.0 - 2.0 * p); // smoothstep

      // Draw ASCII as base
      ctx.drawImage(this.ascii, this.drawX, this.drawY, this.drawW, this.drawH);

      // Reveal real photo behind scanline
      const scanY = this.drawY + prog * this.drawH;

      ctx.save();
      ctx.beginPath();
      ctx.rect(this.drawX, this.drawY, this.drawW, prog * this.drawH);
      ctx.clip();
      ctx.drawImage(this.photo, this.drawX, this.drawY, this.drawW, this.drawH);
      ctx.restore();

      // Glowing Cyan-Magenta Laser Scanline
      const grad = ctx.createLinearGradient(0, scanY - 6, 0, scanY + 6);
      grad.addColorStop(0, "rgba(255, 120, 220, 0)");
      grad.addColorStop(0.5, "rgba(255, 240, 255, 0.95)");
      grad.addColorStop(1, "rgba(80, 220, 255, 0)");

      ctx.fillStyle = grad;
      ctx.fillRect(this.drawX, scanY - 6, this.drawW, 12);
    } else {
      // > 8s: Crisp, full-color real photo displayed in full clarity
      ctx.drawImage(this.photo, this.drawX, this.drawY, this.drawW, this.drawH);
    }
  }
}
window.BouquetScene = BouquetScene;
