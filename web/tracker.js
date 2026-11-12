/**
 * Live Analytics & User Event Tracker for Google Sheets
 * Uses sendBeacon and no-cors fetch to deliver telemetry without blocking the UI.
 */
class Tracker {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl;
    this.sessionId = this.getOrCreateSessionId();
    this.startTime = Date.now();
    this.device = this.detectDevice();
    this.screen = `${window.screen.width}x${window.screen.height} (dpr ${window.devicePixelRatio || 1})`;
    this.phasesLogged = new Set();

    // Auto-log page open on load
    this.send("sayfa_acildi", { details: document.referrer ? `Referans: ${document.referrer}` : "Doğrudan Giriş" });

    // Track page exit / duration before unload
    this.setupExitTracking();
  }

  getOrCreateSessionId() {
    let sid = sessionStorage.getItem("app_sid");
    if (!sid) {
      sid = "s_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now().toString(36);
      sessionStorage.setItem("app_sid", sid);
    }
    return sid;
  }

  detectDevice() {
    const ua = navigator.userAgent || "";
    if (/android/i.test(ua)) return "Android Mobil";
    if (/iphone|ipad|ipod/i.test(ua)) return "iPhone / iOS";
    if (/macintosh|mac os x/i.test(ua)) return "Mac Masaüstü";
    if (/windows/i.test(ua)) return "Windows PC";
    if (/linux/i.test(ua)) return "Linux Masaüstü";
    return "Diğer Cihaz";
  }

  getElapsedSeconds() {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  send(eventName, extra = {}) {
    if (!this.webhookUrl) return;

    const payload = {
      event: eventName,
      sessionId: this.sessionId,
      duration: this.getElapsedSeconds(),
      device: this.device,
      screen: this.screen,
      details: extra.details || "-"
    };

    const jsonStr = JSON.stringify(payload);

    try {
      // sendBeacon with text/plain prevents CORS preflight issues
      if (navigator.sendBeacon) {
        const blob = new Blob([jsonStr], { type: "text/plain;charset=UTF-8" });
        navigator.sendBeacon(this.webhookUrl, blob);
      } else {
        fetch(this.webhookUrl, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain" },
          body: jsonStr
        }).catch(() => {});
      }
    } catch (e) {
      // Silent fail so user experience is never affected
    }
  }

  logPhase(phaseName) {
    if (this.phasesLogged.has(phaseName)) return;
    this.phasesLogged.add(phaseName);
    this.send("asama_gecisi", { details: phaseName });
  }

  setupExitTracking() {
    const onExit = () => {
      this.send("sayfadan_ayrildi", {
        details: `Toplam Kalma Süresi: ${this.getElapsedSeconds()} sn`
      });
    };

    window.addEventListener("pagehide", onExit, { capture: true });
    window.addEventListener("beforeunload", onExit, { capture: true });
  }
}

window.Tracker = Tracker;
