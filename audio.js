/**
 * Web Audio Engine: Direct Single Soundtrack (fulldeneme.mp3)
 */
class AudioManager {
  constructor() {
    this.audio = document.getElementById("bg-audio");
    if (!this.audio) {
      this.audio = new Audio("fulldeneme.mp3");
    }
    this.isPlaying = false;
    this.isMuted = false;
  }

  start() {
    this.isPlaying = true;
    if (!this.audio) return;
    this.audio.currentTime = 0;
    this.audio.muted = this.isMuted;
    this.audio.volume = 1.0;

    const p = this.audio.play();
    if (p !== undefined) {
      p.then(() => {
        console.log("[AudioManager] fulldeneme.mp3 started playing cleanly!");
      }).catch((err) => {
        console.warn("[AudioManager] Play prevented:", err);
      });
    }
  }

  seek(seconds) {
    if (this.audio) {
      const dur = this.audio.duration;
      if (dur && !isNaN(dur)) {
        this.audio.currentTime = Math.min(seconds, dur);
      } else {
        this.audio.currentTime = seconds;
      }
      if (this.isPlaying && this.audio.paused) {
        this.audio.play().catch(() => {});
      }
    }
  }

  updateTime(t) {
    // Single track plays continuously throughout the experience
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.audio) {
      this.audio.muted = this.isMuted;
    }
    return this.isMuted;
  }

  reset() {
    this.start();
  }
}

window.AudioManager = AudioManager;
