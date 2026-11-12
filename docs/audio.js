/**
 * Web Audio Engine: Precision Multi-Cue Voiceover Player (A_1 to A_5) + Soft Ambient Piano
 * Optimized for 100% Mobile (iOS Safari & Android Chrome) Audio Priming & Unlocking.
 *
 * Cues:
 * - A_1: t = 0.0s (Directly at the start)
 * - A_2: t = 37.0s (Flower scene at 37s)
 * - A_3: t = 44.0s (Flower scene at 44s)
 * - A_4: t = 52.0s (Flower scene at 52s)
 * - A_5: t = 68.0s (Lilyum / Bouquet scene at 68s)
 */
class AudioManager {
  constructor() {
    this.ctx = null;
    this.gainNode = null;
    this.isPlaying = false;
    this.isMuted = false;
    this.timer = null;

    // Get preloaded HTML audio elements
    const getAudio = (id, fallbackSrc) => {
      let el = document.getElementById(id);
      if (!el) {
        el = new Audio(fallbackSrc);
      }
      el.src = fallbackSrc;
      el.load();
      return el;
    };

    this.audioA1 = getAudio("audio-a1", "A_1.mp3");
    this.audioA2 = getAudio("audio-a2", "A_2.mp3");
    this.audioA3 = getAudio("audio-a3", "A_3.mp3");
    this.audioA4 = getAudio("audio-a4", "A_4.mp3");
    this.audioA5 = getAudio("audio-a5", "A_5.mp3");

    this.allClips = [this.audioA1, this.audioA2, this.audioA3, this.audioA4, this.audioA5];

    // Cue timeline definitions
    this.cues = [
      { name: "A_1", audio: this.audioA1, time: 0.0,  dur: 27.9, played: false },
      { name: "A_2", audio: this.audioA2, time: 37.0, dur: 5.5,  played: false },
      { name: "A_3", audio: this.audioA3, time: 44.0, dur: 3.8,  played: false },
      { name: "A_4", audio: this.audioA4, time: 52.0, dur: 4.2,  played: false },
      { name: "A_5", audio: this.audioA5, time: 68.0, dur: 18.5, played: false },
    ];
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      this.ctx = new AudioCtx();
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(0.10, this.ctx.currentTime);
      this.gainNode.connect(this.ctx.destination);
    }
  }

  playPianoNote(freq, time, dur = 4.2) {
    if (!this.ctx || !this.isPlaying || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      noteGain.gain.setValueAtTime(0.001, time);
      noteGain.gain.exponentialRampToValueAtTime(0.16, time + 0.08);
      noteGain.gain.exponentialRampToValueAtTime(0.001, time + dur);

      osc.connect(noteGain);
      noteGain.connect(this.gainNode);

      osc.start(time);
      osc.stop(time + dur);
    } catch (e) {}
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

  playClip(audioEl, offset = 0) {
    if (!audioEl) return;
    try {
      audioEl.currentTime = offset;
      audioEl.muted = this.isMuted;
      audioEl.volume = 1.0;
      const p = audioEl.play();
      if (p !== undefined) {
        p.catch(err => {
          console.warn("[AudioManager] Clip play warning:", err);
        });
      }
    } catch (e) {
      console.warn("[AudioManager] Error playing clip:", e);
    }
  }

  unlockAllForMobile() {
    // Prime and unlock all audio elements in mobile WebKit (iOS Safari & Android Chrome)
    // By initiating play() inside the user gesture, browser permanently authorizes playback!
    this.allClips.forEach(audio => {
      if (!audio) return;
      audio.muted = this.isMuted;
      audio.volume = 1.0;
      const p = audio.play();
      if (p !== undefined) {
        p.then(() => {
          if (audio !== this.audioA1) {
            audio.pause();
            audio.currentTime = 0;
          }
        }).catch(() => {
          audio.load();
        });
      }
    });

    // Prime Web Audio with a silent buffer
    if (this.ctx) {
      try {
        const buf = this.ctx.createBuffer(1, 1, 22050);
        const node = this.ctx.createBufferSource();
        node.buffer = buf;
        node.connect(this.ctx.destination);
        node.start(0);
      } catch (e) {}
    }
  }

  start() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.isPlaying = true;

    // Reset cue flags
    this.cues.forEach(c => c.played = false);

    // 1. Prime all clips in mobile browser gesture context
    this.unlockAllForMobile();

    // 2. Play A_1 immediately
    this.cues[0].played = true;
    this.playClip(this.audioA1, 0);

    // 3. Start gentle background piano
    this.startPiano();
  }

  updateTime(t) {
    if (!this.isPlaying) return;

    for (let i = 0; i < this.cues.length; i++) {
      const cue = this.cues[i];
      if (t >= cue.time && !cue.played && t < cue.time + cue.dur) {
        cue.played = true;
        console.log(`[AudioManager] Triggering ${cue.name} at ${t.toFixed(1)}s`);
        this.playClip(cue.audio, t - cue.time);
      }
    }
  }

  seek(seconds) {
    if (!this.isPlaying) return;

    for (let i = 0; i < this.cues.length; i++) {
      const cue = this.cues[i];
      const cueEnd = cue.time + cue.dur;

      if (seconds >= cue.time && seconds < cueEnd) {
        cue.played = true;
        this.playClip(cue.audio, seconds - cue.time);
      } else {
        if (cue.audio && !cue.audio.paused) {
          cue.audio.pause();
          cue.audio.currentTime = 0;
        }
        cue.played = (seconds >= cueEnd);
      }
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.allClips.forEach(clip => {
      if (clip) clip.muted = this.isMuted;
    });
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(this.isMuted ? 0 : 0.10, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  reset() {
    this.allClips.forEach(clip => {
      if (clip) {
        clip.pause();
        clip.currentTime = 0;
      }
    });

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    this.start();
  }
}

window.AudioManager = AudioManager;
