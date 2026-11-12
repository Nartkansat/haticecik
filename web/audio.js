/**
 * Web Audio Engine: Direct Soundtrack (fulldeneme.mp3) + Soft Ambient Romantic Piano
 */
class AudioManager {
  constructor() {
    this.ctx = null;
    this.gainNode = null;
    this.isPlaying = false;
    this.isMuted = false;
    this.timer = null;

    // Direct preloaded HTML audio element
    this.audio = document.getElementById("bg-audio");
    if (!this.audio) {
      this.audio = new Audio("fulldeneme.mp3");
    }
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();
    this.gainNode = this.ctx.createGain();
    // Soft ambient volume (0.12) so it never overpowers the main audio file
    this.gainNode.gain.setValueAtTime(0.12, this.ctx.currentTime);
    this.gainNode.connect(this.ctx.destination);
  }

  playPianoNote(freq, time, dur = 4.2) {
    if (!this.ctx || !this.isPlaying || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const noteGain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    // Soft, gentle sine envelope
    noteGain.gain.setValueAtTime(0.001, time);
    noteGain.gain.exponentialRampToValueAtTime(0.18, time + 0.08);
    noteGain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(noteGain);
    noteGain.connect(this.gainNode);

    osc.start(time);
    osc.stop(time + dur);
  }

  startPiano() {
    if (this.timer) clearTimeout(this.timer);

    const chords = [
      [174.61, 261.63, 329.63, 392.00], // Fmaj7
      [220.00, 261.63, 329.63, 440.00], // Am7
      [196.00, 293.66, 392.00, 440.00], // Gsus4
      [130.81, 261.63, 329.63, 392.00]  // Cmaj7
    ];

    let chordIdx = 0;
    const loop = () => {
      if (!this.isPlaying) return;
      const now = this.ctx ? this.ctx.currentTime : 0;
      const currentChord = chords[chordIdx % chords.length];
      currentChord.forEach((freq, i) => {
        this.playPianoNote(freq, now + i * 0.18, 4.5);
      });
      chordIdx++;
      this.timer = setTimeout(loop, 4000);
    };
    loop();
  }

  start() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.isPlaying = true;

    // 1. Play main soundtrack (fulldeneme.mp3) at full clarity (1.0 volume)
    if (this.audio) {
      this.audio.currentTime = 0;
      this.audio.muted = this.isMuted;
      this.audio.volume = 1.0;
      this.audio.play().catch((err) => {
        console.warn("[AudioManager] Play prevented:", err);
      });
    }

    // 2. Start soft, non-intrusive ambient piano in the background
    this.startPiano();
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
    // Both play in harmony throughout the experience
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.audio) {
      this.audio.muted = this.isMuted;
    }
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(this.isMuted ? 0 : 0.12, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  reset() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.start();
  }
}

window.AudioManager = AudioManager;
