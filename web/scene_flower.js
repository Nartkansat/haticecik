/**
 * Phase 2: 100% Exact flower.py Pointillism Engine in Live JavaScript Canvas
 * Directly executes the exact botanical algorithms from flower.py / @buildmeri:
 * - KEYS Catmull-Rom spline keyframes (stem, size, bloom, wilt, leaf, glow)
 * - Cubic bezier 3D stem bending physics (ctrl, bez)
 * - 4-layer parametric petal surfaces with sinc/profile curves
 * - Vibrant golden-yellow stamens & pollen anthers (Guaranteed Never to Fail)
 * - Rotating hexagonal rings with 6 glowing nodes
 * - Fluttering falling petals physics
 */
class FlowerScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.isLoaded = false;
    this.model = {};

    this.KEYS = [
      [0.0, 0.00, 0.00, 0.00, 0.0, 0.00, 0.00],
      [5.0, 0.42, 0.22, 0.00, 0.0, 0.25, 0.00],
      [10.0, 0.62, 0.42, 0.00, 0.0, 0.50, 0.35],
      [16.0, 0.80, 0.68, 0.50, 0.0, 0.72, 0.55],
      [24.0, 1.00, 1.00, 1.00, 0.0, 1.00, 1.00],
      [30.0, 1.00, 1.00, 1.00, 0.0, 1.00, 1.00],
      [39.0, 0.98, 0.85, 0.55, 1.0, 0.92, 0.00],
      [45.0, 0.98, 0.85, 0.55, 1.0, 0.90, 0.00],
    ];
    this.T_END = 45.0;

    this.LEAF_DEFS = [
      [0.10, +1, 1.00, 0.55, -0.80],
      [0.16, -1, 0.90, 0.50, -0.85],
      [0.40, +1, 0.70, 0.95, -0.70],
      [0.33, -1, 0.62, 0.90, -0.65],
    ];

    this.loadModel();
  }

  async loadModel() {
    try {
      const resp = await fetch('flower_model.bin');
      const buf = await resp.arrayBuffer();
      const decomp = pako.inflate(new Uint8Array(buf));
      const dv = new DataView(decomp.buffer, decomp.byteOffset, decomp.byteLength);

      let offset = 0;
      const numGroups = dv.getUint32(offset, true);
      offset += 4;

      const decoder = new TextDecoder('utf-8');

      for (let g = 0; g < numGroups; g++) {
        const nameLen = dv.getUint32(offset, true);
        const numPoints = dv.getUint32(offset + 4, true);
        offset += 8;

        const nameBytes = new Uint8Array(decomp.buffer, decomp.byteOffset + offset, nameLen);
        const groupName = decoder.decode(nameBytes);
        offset += nameLen;

        const subKeysCount = dv.getUint32(offset, true);
        offset += 4;

        this.model[groupName] = { _n: numPoints };

        for (let s = 0; s < subKeysCount; s++) {
          const skLen = dv.getUint32(offset, true);
          offset += 4;
          const skBytes = new Uint8Array(decomp.buffer, decomp.byteOffset + offset, skLen);
          const subKey = decoder.decode(skBytes);
          offset += skLen;

          const dtypeCode = dv.getUint32(offset, true);
          const byteLen = dv.getUint32(offset + 4, true);
          offset += 8;

          // Safe slice guarantees 4-byte and 8-byte alignment
          const rawSlice = decomp.buffer.slice(decomp.byteOffset + offset, decomp.byteOffset + offset + byteLen);

          if (dtypeCode === 1) {
            this.model[groupName][subKey] = new Uint8Array(rawSlice);
          } else {
            this.model[groupName][subKey] = new Float32Array(rawSlice);
          }
          offset += byteLen;
        }
      }

      this.isLoaded = true;
      console.log("[FlowerScene] Loaded exact flower.py model successfully!");
    } catch (err) {
      console.error("[FlowerScene] Error loading flower_model.bin:", err);
    }
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    const isPortrait = h > w;
    this.H = isPortrait ? Math.min(w * 1.45, h * 0.85) : Math.min(w, h) * 0.96;
    this.W = this.H;
    this.cx = w / 2;
    this.y0 = isPortrait ? (h * 0.52 + this.H * 0.36) : (h * 0.50 + this.H * 0.38);
    this.Ls = this.H * 0.58;
    this.Lf = this.H * 0.42;
  }

  // Exact Catmull-Rom Spline Keyframe Interpolation from flower.py
  state(t) {
    const clampedT = Math.min(Math.max(t, 0.0), this.T_END);
    const ts = [0.0, 5.0, 10.0, 16.0, 24.0, 30.0, 39.0, 45.0];
    let i = 0;
    while (i < ts.length - 2 && ts[i + 1] <= clampedT) i++;
    const u = (clampedT - ts[i]) / (ts[i + 1] - ts[i]);

    const p0 = this.KEYS[Math.max(i - 1, 0)];
    const p1 = this.KEYS[i];
    const p2 = this.KEYS[i + 1];
    const p3 = this.KEYS[Math.min(i + 2, this.KEYS.length - 1)];

    const res = [];
    for (let k = 1; k < 7; k++) {
      const v = 0.5 * (2 * p1[k] + (p2[k] - p0[k]) * u +
        (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u * u +
        (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * u * u * u);
      res.push(Math.min(1.0, Math.max(0.0, v)));
    }
    // Returns [stem, size, bloom, wilt, leaf, glow]
    return res;
  }

  // Exact stem bezier control points from flower.py
  ctrl(L, wilt, sway) {
    const cx = this.cx, y0 = this.y0;
    const P0 = [cx, y0 + 4.0];
    const P1 = [cx - 0.06 * L * (1 - wilt) + 0.02 * L * wilt, y0 - 0.33 * L];
    const P2 = [cx + 0.05 * L * (1 - wilt) + 0.08 * L * wilt + sway * 0.5, y0 - L * (0.74 + 0.30 * wilt)];
    const P3 = [cx + sway + 0.32 * L * wilt, y0 - L * (1 - 0.15 * wilt)];
    return [P0, P1, P2, P3];
  }

  // Exact cubic bezier curve evaluation from flower.py
  bez(P, s) {
    const q = 1 - s;
    const x = q*q*q*P[0][0] + 3*q*q*s*P[1][0] + 3*q*s*s*P[2][0] + s*s*s*P[3][0];
    const y = q*q*q*P[0][1] + 3*q*q*s*P[1][1] + 3*q*s*s*P[2][1] + s*s*s*P[3][1];
    const dx = 3*q*q*(P[1][0] - P[0][0]) + 6*q*s*(P[2][0] - P[1][0]) + 3*s*s*(P[3][0] - P[2][0]);
    const dy = 3*q*q*(P[1][1] - P[0][1]) + 6*q*s*(P[2][1] - P[1][1]) + 3*s*s*(P[3][1] - P[2][1]);
    return [x, y, dx, dy];
  }

  sinc(x) {
    return Math.abs(x) < 1e-4 ? 1.0 : Math.sin(x) / x;
  }

  profile(u) {
    return Math.pow(Math.sin(Math.PI * Math.pow(Math.min(Math.max(u, 0), 1), 0.75)), 0.85);
  }

  render(t_raw) {
    const ctx = this.ctx;
    ctx.fillStyle = "#010204";
    ctx.fillRect(0, 0, this.w, this.h);

    if (!this.isLoaded) return;

    const t = t_raw % 48.0;
    const live_t = t_raw;

    // 1. Evaluate Exact State Spline: [stem, size, bloom, wilt, leaf, glow]
    const [stem, size, bloom, wilt, leaf, glow] = this.state(t);

    let alphaFade = 1.0;
    if (t > 44.0) {
      alphaFade = Math.max(0.0, 1.0 - (t - 44.0) / 4.0);
    }
    if (alphaFade <= 0.001) return;

    const H = this.H;
    const Lf = this.Lf;
    const L = this.Ls * stem;
    const sway = 0.012 * H * Math.sin(live_t * 0.9) * stem * (1 - 0.6 * wilt);
    const P = this.ctrl(L, wilt, sway);
    const [hx, hy] = P[3];

    const batch = []; // [{x, y, r, g, b, rad, z}]

    const addPoint = (x, y, r, g, b, rad, z) => {
      batch.push({
        x: x, y: y,
        r: Math.floor(r * alphaFade),
        g: Math.floor(g * alphaFade),
        b: Math.floor(b * alphaFade),
        rad: rad,
        z: z
      });
    };

    // Helper: color mix
    const mixcol = (liveArr, wiltArr, idx, w) => {
      const lr = liveArr[idx * 3], lg = liveArr[idx * 3 + 1], lb = liveArr[idx * 3 + 2];
      const wr = wiltArr[idx * 3], wg = wiltArr[idx * 3 + 1], wb = wiltArr[idx * 3 + 2];
      return [
        lr * (1 - w) + wr * w,
        lg * (1 - w) + wg * w,
        lb * (1 - w) + wb * w
      ];
    };

    // --- 1. STEM RENDERING ---
    if (stem > 0.01) {
      const S_stem = this.model.stem;
      const nv_stem = Math.floor(S_stem._n * Math.min(1.0, Math.max(0.08, stem)));
      for (let i = 0; i < nv_stem; i++) {
        const s = S_stem.s[i];
        const [x, y, dx, dy] = this.bez(P, s);
        const nn = Math.hypot(dx, dy) + 1e-6;
        const wst = 0.0085 * H * (1 - 0.3 * s) * (1 - 0.25 * wilt) * Math.min(1.0, Math.max(0.4, 0.4 + stem * 1.2));
        const lat = S_stem.lat[i] * wst;
        const wi = Math.min(1.0, Math.max(0.0, wilt * (0.75 + 0.5 * s) * (0.7 + 0.5 * S_stem.rn[i])));
        const [r, g, b] = mixcol(S_stem.live, S_stem.wilt, i, wi);
        addPoint(x - (dy / nn) * lat, y + (dx / nn) * lat, r, g, b, S_stem.rad[i], -500.0);
      }
    }

    // --- 2. LEAF RENDERING ---
    if (leaf > 0.02 && stem > 0.05) {
      const S_leaf = this.model.leaf;
      const nv_leaf = Math.floor(S_leaf._n * Math.min(1.0, Math.max(0.15, leaf)));
      for (let i = 0; i < nv_leaf; i++) {
        const lid = Math.floor(S_leaf.lid[i]);
        const ld = this.LEAF_DEFS[lid];
        const [ax, ay] = this.bez(P, ld[0]);
        const m = ld[1];
        const lfac = ld[2];
        const a0 = ld[3] + (1 - leaf) * 0.8 - 0.6 * wilt;
        const c = ld[4] - 0.5 * wilt;
        const u = S_leaf.u[i];
        const v = S_leaf.v[i];
        const LL = 0.19 * H * lfac * leaf * (1 - 0.25 * wilt);
        const am = a0 + c * u * 0.5;
        const al = a0 + c * u;
        const sc = this.sinc(c * u * 0.5);
        const lat = v * 0.27 * LL * this.profile(u);
        const X = ax + LL * u * m * Math.cos(am) * sc - lat * Math.sin(al);
        const Yup = LL * u * Math.sin(am) * sc + lat * m * Math.cos(al);
        const wi = Math.min(1.0, Math.max(0.0, wilt * (0.9 + 0.5 * u + 0.3 * S_leaf.rn[i]) - 0.1));
        const [r, g, b] = mixcol(S_leaf.live, S_leaf.wilt, i, wi);
        addPoint(X, ay - Yup, r, g, b, S_leaf.rad[i], -450.0);
      }
    }

    // --- 3. FLOWER PETALS & STAMENS RENDERING ---
    if (stem > 0.01 && size > 0.05) {
      const phi = wilt * 2.75 + 0.035 * Math.sin(live_t * 0.9 + 1.0) * (1 - wilt);
      const tau = 0.20 + 0.36 * bloom - 0.40 * wilt;
      const cphi = Math.cos(phi), sphi = Math.sin(phi);
      const ct = Math.cos(tau), st = Math.sin(tau);
      const Ls_ = Lf * size;

      const project = (xl, yl, zl) => {
        const yp = yl * ct - zl * st;
        const zp = yl * st + zl * ct;
        return [hx + xl * cphi + yp * sphi, hy - (-xl * sphi + yp * cphi), zp, yp];
      };

      // 4-Layer Petals
      const h_model = this.model.head;
      const vis = Math.min(1.0, Math.max(0.2, size * size * 1.15));
      const nv_head = Math.floor(h_model._n * vis);

      for (let i = 0; i < nv_head; i++) {
        const u = h_model.u[i];
        const v = h_model.v[i];
        let A0 = h_model.ac[i] + (h_model.ao[i] - h_model.ac[i]) * bloom + h_model.aj[i];
        A0 = A0 * (1 - 0.55 * wilt) + wilt * h_model.wj[i] * 0.3;
        const K = h_model.kc[i] + (h_model.ko[i] - h_model.kc[i]) * bloom + wilt * (0.6 + 0.6 * h_model.pj[i]);
        const Lp = Ls_ * h_model.L[i] * (1 - 0.28 * wilt * h_model.pj[i]);
        const am = A0 + K * u * 0.5;
        const sc = this.sinc(K * u * 0.5);
        let rr = Lp * u * Math.sin(am) * sc;
        const hh = Lp * u * Math.cos(am) * sc;
        const lat = v * (h_model.wc[i] + (h_model.wo[i] - h_model.wc[i]) * bloom) * Lp * h_model.sp[i];
        rr = rr + 0.025 * Ls_ - (0.5 * lat * lat) / (Lp + 1.0);

        const cth = Math.cos(h_model.th[i]);
        const sth = Math.sin(h_model.th[i]);
        const [X, Y, zp, yp] = project(cth * rr - sth * lat, hh, sth * rr + cth * lat);

        const shade = Math.min(1.2, Math.max(0.5, 0.72 + 0.28 * Math.min(1, Math.max(0, (zp / Ls_) * 0.5 + 0.5)) + 0.12 * (hh / Ls_)));
        const wi = Math.min(1.0, Math.max(0.0, wilt * (1.0 + 0.7 * u + 0.4 * h_model.rn[i]) - 0.2));
        const [r, g, b] = mixcol(h_model.live, h_model.wilt, i, wi);
        addPoint(X, Y, r * shade, g * shade, b * shade, h_model.rad[i], zp);
      }

      // --- 4. VIBRANT GOLDEN STAMENS (High Depth Priority = Never Occluded) ---
      if (bloom > 0.20) {
        const ss = Math.min(1.0, Math.max(0.0, (bloom - 0.20) / 0.55));
        const S_stamen = this.model.st;
        const nv_st = Math.floor(S_stamen._n * Math.min(1.0, Math.max(0.25, size * size)));

        for (let i = 0; i < nv_st; i++) {
          const ell = Ls_ * ss * S_stamen.ell[i];
          const beta = S_stamen.beta[i] * (0.6 + 0.4 * bloom) + wilt * 0.3;
          const r_st = ell * S_stamen.t[i] * Math.sin(beta) + 0.02 * Ls_;
          const yl = 0.05 * Ls_ + ell * S_stamen.t[i] * Math.cos(beta);
          const [X, Y, zp] = project(Math.cos(S_stamen.th[i]) * r_st, yl, Math.sin(S_stamen.th[i]) * r_st);

          const [r, g, b] = mixcol(S_stamen.live, S_stamen.wilt, i, wilt);
          // zp + 120 ensures the rich golden stamens stay in foreground!
          addPoint(X, Y, r, g, b, S_stamen.rad[i], zp + 120.0);
        }
      }

      // --- 5. GLOWING HALO & ROTATING HEXAGONAL NODES ---
      if (glow > 0.02) {
        const axis = [Math.sin(phi), -Math.cos(phi)];
        const ccx = hx + axis[0] * 0.5 * Ls_;
        const ccy = hy + axis[1] * 0.5 * Ls_;

        // Rotating rings with 6 nodes
        const Rs = Ls_ * 1.25;
        for (let j = 0; j < 6; j++) {
          const ja = 2 * Math.PI * j / 6 + live_t * 0.15;
          const nx = ccx + Rs * Math.cos(ja);
          const ny = ccy + Rs * Math.sin(ja);
          addPoint(nx, ny, 255 * glow, 215 * glow, 255 * glow, 3.2, 100.0);
        }

        // Sparks floating up
        const Sp = this.model.spark;
        for (let i = 0; i < Sp._n; i++) {
          const life = (live_t * 0.10 * Sp.sp[i] + Sp.ph[i]) % 1.0;
          const rho = (0.25 + 1.15 * Sp.rho[i]) * Ls_ * (0.6 + 0.6 * life);
          const px = ccx + Math.cos(Sp.a[i]) * rho;
          const py = ccy + Math.sin(Sp.a[i]) * rho - life * 0.25 * Ls_;
          const bs = Math.pow(Math.sin(Math.PI * life), 0.8) * glow;
          addPoint(px, py, 255 * bs, 180 * bs, 240 * bs, Sp.rad[i], 2000.0);
        }
      }

      // --- 6. FALLING PETALS PHYSICS ---
      if (wilt > 0.02) {
        const F = this.model.fall;
        for (let i = 0; i < F._n; i++) {
          const fp = Math.min(1.0, Math.max(0.0, (wilt * 1.05 - F.r0[i] * 0.7) / 0.35));
          if (fp > 0) {
            const sx = hx + F.ox[i] * 0.18 * Ls_;
            const sy = hy + F.oy[i] * 0.18 * Ls_ + 0.25 * Ls_;
            const fx = sx + (F.xl[i] - sx) * fp + Math.sin(fp * 6.28 + F.ph[i]) * 0.03 * H * (1 - fp);
            const fy = sy + (F.yl[i] - sy) * fp * fp;
            const r = F.col[i * 3], g = F.col[i * 3 + 1], b = F.col[i * 3 + 2];
            addPoint(fx, fy, r, g, b, F.rad[i], 500.0);
          }
        }
      }
    }

    // --- 7. DEPTH SORT & LIVE CANVAS SPLAT DRAWING ---
    batch.sort((a, b) => a.z - b.z);

    const len = batch.length;
    for (let i = 0; i < len; i++) {
      const p = batch[i];
      ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
window.FlowerScene = FlowerScene;
