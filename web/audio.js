/**
 * Web Audio Engine: First Part (ilkısım.mp3), Second Part (ikincikısım.mp3 - I LOVE YOU) & Ambient Piano
 */
class AudioManager {
  constructor() {
    this.ctx = null;
    this.gainNode = null;
    this.isPlaying = false;
    this.isMuted = false;
    this.pianoStarted = false;
    this.part2Played = false;
    this.timer = null;

    // Connect to preloaded HTML audio elements
    this.firstPartAudio = document.getElementById("audio-first-part");
    if (!this.firstPartAudio) {
      this.firstPartAudio = new Audio("ilkkisim.mp3");
    }

    this.secondPartAudio = document.getElementById("audio-second-part");
    if (!this.secondPartAudio) {
      this.secondPartAudio = new Audio("ikincikisim.mp3");
    }
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.setValueAtTime(0.35, this.ctx.currentTime);
    this.gainNode.connect(this.ctx.destination);
  }

  playPianoNote(freq, time, dur = 3.8) {
    if (!this.ctx || !this.isPlaying || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const noteGain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    noteGain.gain.setValueAtTime(0.001, time);
    noteGain.gain.exponentialRampToValueAtTime(0.35, time + 0.05);
    noteGain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(noteGain);
    noteGain.connect(this.gainNode);

    osc.start(time);
    osc.stop(time + dur);
  }

  start() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.isPlaying = true;
    this.pianoStarted = false;
    this.part2Played = false;

    // Play ilkısım.mp3 for the first part
    this.playFirstPart();
  }

  playFirstPart() {
    if (!this.firstPartAudio) return;
    this.firstPartAudio.currentTime = 0;
    this.firstPartAudio.muted = this.isMuted;
    this.firstPartAudio.volume = 1.0;
    
    const playPromise = this.firstPartAudio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        console.log("[AudioManager] ses/ilkısım.mp3 started playing successfully!");
      }).catch(err => {
        console.warn("[AudioManager] Play prevented:", err);
      });
    }
  }

  playSecondPart() {
    if (this.part2Played) return;
    this.part2Played = true;

    if (!this.secondPartAudio) return;
    this.secondPartAudio.currentTime = 0;
    this.secondPartAudio.muted = this.isMuted;
    this.secondPartAudio.volume = 1.0;

    const playPromise = this.secondPartAudio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        console.log("[AudioManager] ses/ikincikısım.mp3 (I LOVE YOU) started playing!");
      }).catch(err => {
        console.warn("[AudioManager] Second part play error:", err);
      });
    }
  }

  updateTime(t) {
    if (!this.isPlaying) return;

    // At t >= 25.8s, "I LOVE YOU" text emerges in the cosmic heart: trigger ikincikısım.mp3
    if (t >= 25.8 && !this.part2Played && t < 33.0) {
      this.playSecondPart();
    }

    // At t >= 33.0s, Phase 2 (Live Flower) begins: ensure voice clips are paused and piano runs
    if (t >= 33.0) {
      if (this.firstPartAudio && !this.firstPartAudio.paused) {
        this.firstPartAudio.pause();
      }
      if (this.secondPartAudio && !this.secondPartAudio.paused) {
        this.secondPartAudio.pause();
      }
      if (!this.pianoStarted) {
        this.startPiano();
      }
    }
  }

  seek(seconds) {
    if (seconds < 25.8) {
      this.part2Played = false;
    }
    if (seconds < 19.4) {
      if (this.firstPartAudio) {
        this.firstPartAudio.currentTime = seconds;
        if (this.isPlaying && this.firstPartAudio.paused) {
          this.firstPartAudio.play().catch(() => {});
        }
      }
      if (this.secondPartAudio && !this.secondPartAudio.paused) {
        this.secondPartAudio.pause();
      }
      this.stopPiano();
    } else if (seconds >= 25.8 && seconds < 33.0) {
      if (this.firstPartAudio && !this.firstPartAudio.paused) {
        this.firstPartAudio.pause();
      }
      this.playSecondPart();
      this.stopPiano();
    } else if (seconds >= 33.0) {
      if (this.firstPartAudio && !this.firstPartAudio.paused) {
        this.firstPartAudio.pause();
      }
      if (this.secondPartAudio && !this.secondPartAudio.paused) {
        this.secondPartAudio.pause();
      }
      if (this.isPlaying && !this.pianoStarted) {
        this.startPiano();
      }
    }
  }

  startPiano() {
    if (this.pianoStarted) return;
    this.pianoStarted = true;
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
        this.playPianoNote(freq, now + i * 0.16, 4.2);
      });
      chordIdx++;
      this.timer = setTimeout(loop, 3800);
    };
    loop();
  }

  stopPiano() {
    this.pianoStarted = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(this.isMuted ? 0 : 0.35, this.ctx.currentTime);
    }
    if (this.firstPartAudio) {
      this.firstPartAudio.muted = this.isMuted;
    }
    if (this.secondPartAudio) {
      this.secondPartAudio.muted = this.isMuted;
    }
    return this.isMuted;
  }

  reset() {
    this.stopPiano();
    this.part2Played = false;
    if (this.secondPartAudio) {
      this.secondPartAudio.pause();
      this.secondPartAudio.currentTime = 0;
    }
    this.playFirstPart();
  }
}
window.AudioManager = AudioManager;
