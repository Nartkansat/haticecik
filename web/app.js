/**
 * Master Application Coordinator: Pure Live Canvas Code Engine
 * Seamlessly transitions between Eye, Pointillism Flower, and Bouquet scenes in 60 FPS.
 */
document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("stage");
  const introModal = document.getElementById("intro-modal");
  const btnStart = document.getElementById("btn-start");
  const btnReplay = document.getElementById("btn-replay");
  const btnAudio = document.getElementById("btn-audio");
  const btnFullscreen = document.getElementById("btn-fullscreen");
  const iconSoundOn = document.getElementById("icon-sound-on");
  const iconSoundOff = document.getElementById("icon-sound-off");

  // Initialize Scenes & Tracker
  const TRACKER_URL = "https://script.google.com/macros/s/AKfycbwTgsoqCzs2H4ukxviI1fxsOk_uFKhK5IzEok4xVKWtL657z8HeJrinaN1H-oL1NIo/exec";
  const tracker = typeof Tracker !== "undefined" ? new Tracker(TRACKER_URL) : { send: () => {}, logPhase: () => {} };

  const eyeScene = new EyeScene(canvas);
  const flowerScene = new FlowerScene(canvas);
  const bouquetScene = new BouquetScene(canvas);
  const audioManager = new AudioManager();

  let isRunning = false;
  let startTime = 0;
  let pausedTime = 0;
  let isPaused = false;
  let lastTime = 0;

  // Resize handling with device pixel ratio
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    eyeScene.resize(w, h);
    flowerScene.resize(w, h);
    bouquetScene.resize(w, h);
  }

  window.addEventListener("resize", resize);
  resize();

  // Master Render Loop
  function tick(now) {
    if (!isRunning) return;

    if (!startTime) startTime = now;
    const elapsed = (now - startTime) / 1000.0;
    const dt = Math.min((now - (lastTime || now)) / 1000.0, 0.1);
    lastTime = now;

    const t = elapsed;
    audioManager.updateTime(t);

    if (t >= 25.8 && t < 33.0) {
      tracker.logPhase("I LOVE YOU Yazisi Goruldu");
    }

    if (t < 33.0) {
      // Phase 1: Procedural Eye & Heart "I LOVE YOU" (0s - 33s)
      eyeScene.render(t, dt);
    } else if (t < 63.0) {
      // Phase 2: Live Pointillism Flower (33s - 63s)
      tracker.logPhase("Faz 2: Canli Cicek Sahnesi");
      // 1.6x speed matches the 48-second simulation to 30 real seconds
      const t_fl = (t - 33.0) * 1.6;
      flowerScene.render(t_fl);
    } else {
      // Phase 3: Bouquet Live ASCII -> Real Photo (63s+)
      tracker.logPhase("Faz 3: Buket Fotografi Sahnesi");
      const t_bq = t - 63.0;
      bouquetScene.render(t_bq);

      if (t_bq >= 8.5) {
        btnReplay.classList.add("visible");
      }
    }

    requestAnimationFrame(tick);
  }

  // Jump to specific time (for testing: keys 1, 2, 3)
  function jumpTo(targetSec) {
    startTime = performance.now() - (targetSec * 1000);
    btnReplay.classList.remove("visible");
    audioManager.seek(targetSec);
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "1") jumpTo(0.0);
    if (e.key === "2") jumpTo(33.0);
    if (e.key === "f" || e.key === "F") jumpTo(45.0); // Jump directly to flower in full bloom
    if (e.key === "3" || e.key === "b" || e.key === "B") jumpTo(63.0);
    if (e.key === "r" || e.key === "R") jumpTo(0.0);
  });

  // Start Experience
  btnStart.addEventListener("click", () => {
    introModal.classList.add("hidden");
    tracker.send("baslat_tiklandi", { details: "Kullanici deneyimi baslatti" });

    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }

    isRunning = true;
    startTime = performance.now();
    lastTime = startTime;
    audioManager.start();

    requestAnimationFrame(tick);
  });

  // Replay
  btnReplay.addEventListener("click", () => {
    btnReplay.classList.remove("visible");
    tracker.send("tekrar_baslat_tiklandi", { details: "Kullanici Tekrar Baslat butonuna basti" });
    jumpTo(0.0);
    audioManager.reset();
  });

  // Sound Toggle
  btnAudio.addEventListener("click", () => {
    const isMuted = audioManager.toggleMute();
    tracker.send("ses_degistirildi", { details: isMuted ? "Sessize alindi" : "Ses acildi" });
    if (isMuted) {
      iconSoundOn.style.display = "none";
      iconSoundOff.style.display = "block";
    } else {
      iconSoundOn.style.display = "block";
      iconSoundOff.style.display = "none";
    }
  });

  // Fullscreen Toggle
  btnFullscreen.addEventListener("click", () => {
    tracker.send("tam_ekran_degistirildi");
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });

  // Mobile Touch Ergonomics: Tap anywhere to temporarily reveal floating controls
  let touchTimer = null;
  const controlsEl = document.getElementById("controls");
  function showControlsTemporarily() {
    if (!controlsEl) return;
    controlsEl.classList.add("touch-visible");
    clearTimeout(touchTimer);
    touchTimer = setTimeout(() => {
      controlsEl.classList.remove("touch-visible");
    }, 3500);
  }

  window.addEventListener("touchstart", showControlsTemporarily, { passive: true });
  window.addEventListener("mousemove", showControlsTemporarily, { passive: true });
});

