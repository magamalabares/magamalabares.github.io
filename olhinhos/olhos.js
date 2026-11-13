/* Núcleo do gerador de olhinhos – Sinint amigurumis
 * - desenho de cada olho (degradê + efeitos esfumados) em <canvas>
 * - layout da folha A4 em milímetros
 * - saída em PDF (jsPDF) e prévia em <canvas> usando o mesmo layout
 * É a tradução fiel do script Python gerar_olhinhos.py.
 */
(function () {
  "use strict";

  const W = 210, H = 297;               // A4 em mm
  const TOP = 20;                       // início do conteúdo (abaixo da logo)
  const BOTTOM_LIMIT = H - 24;          // conteúdo não passa daqui (rodapé com a régua)
  const PT = 25.4 / 72;                 // 1 pt em mm
  const EYE_PX = 900;                   // resolução de cada olho (≈1900 DPI em 12 mm)

  // ---------- cores ----------
  function hexToRgb(h) {
    h = h.replace("#", "");
    if (h.length === 3) h = h.split("").map(c => c + c).join("");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();
  }
  // equivalentes ao colorsys do Python (HLS)
  function rgbToHls(r, g, b) {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, l, 0];
    const d = mx - mn, s = l <= 0.5 ? d / (mx + mn) : d / (2 - mx - mn);
    const rc = (mx - r) / d, gc = (mx - g) / d, bc = (mx - b) / d;
    let h = r === mx ? bc - gc : g === mx ? 2 + rc - bc : 4 + gc - rc;
    h = ((h / 6) % 1 + 1) % 1;
    return [h, l, s];
  }
  function hlsToRgb(h, l, s) {
    if (s === 0) return [l, l, l];
    const m2 = l <= 0.5 ? l * (1 + s) : l + s - l * s, m1 = 2 * l - m2;
    const v = (hue) => {
      hue = ((hue % 1) + 1) % 1;
      if (hue < 1 / 6) return m1 + (m2 - m1) * hue * 6;
      if (hue < 0.5) return m2;
      if (hue < 2 / 3) return m1 + (m2 - m1) * (2 / 3 - hue) * 6;
      return m1;
    };
    return [v(h + 1 / 3), v(h), v(h - 1 / 3)];
  }
  // deixa as cores mais vivas para compensar cola de glitter + cabochão
  function viv(hex, sat = 1.22) {
    const [r, g, b] = hexToRgb(hex).map(v => v / 255);
    let [h, l, s] = rgbToHls(r, g, b);
    s = Math.min(1, s * sat);
    if (l > 0.78) l -= 0.035;
    const [R, G, B] = hlsToRgb(h, l, s);
    return rgbToHex(R * 255, G * 255, B * 255);
  }
  function lighten(hex, t) {
    const [r, g, b] = hexToRgb(hex);
    return rgbToHex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t);
  }
  function rgba(hex, a) { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }

  // ---------- desfoque gaussiano (3 passadas de box blur) no canal alfa ----------
  function blurAlpha(canvas, sigma) {
    const ctx = canvas.getContext("2d"), w = canvas.width, h = canvas.height;
    const img = ctx.getImageData(0, 0, w, h), d = img.data;
    let a = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) a[i] = d[i * 4 + 3];
    const n = 3, wIdeal = Math.sqrt((12 * sigma * sigma / n) + 1);
    let wl = Math.floor(wIdeal); if (wl % 2 === 0) wl--;
    const m = Math.round((12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4));
    const sizes = []; for (let i = 0; i < n; i++) sizes.push(i < m ? wl : wl + 2);
    let tmp = new Float32Array(w * h);
    const boxH = (src, dst, rr) => {
      const iarr = 1 / (rr + rr + 1);
      for (let y = 0; y < h; y++) {
        let ti = y * w, li = ti, ri = ti + rr, fv = src[ti], lv = src[ti + w - 1], val = (rr + 1) * fv;
        for (let j = 0; j < rr; j++) val += src[ti + Math.min(j, w - 1)];
        for (let j = 0; j <= rr; j++) { val += src[Math.min(ri++, y * w + w - 1)] - fv; dst[ti++] = val * iarr; }
        for (let j = rr + 1; j < w - rr; j++) { val += src[ri++] - src[li++]; dst[ti++] = val * iarr; }
        for (let j = w - rr; j < w; j++) { val += lv - src[li++]; dst[ti++] = val * iarr; }
      }
    };
    const boxV = (src, dst, rr) => {
      const iarr = 1 / (rr + rr + 1);
      for (let x = 0; x < w; x++) {
        let ti = x, li = ti, ri = ti + rr * w, fv = src[ti], lv = src[ti + w * (h - 1)], val = (rr + 1) * fv;
        for (let j = 0; j < rr; j++) val += src[ti + Math.min(j, h - 1) * w];
        for (let j = 0; j <= rr; j++) { val += src[Math.min(ri, x + w * (h - 1))] - fv; dst[ti] = val * iarr; ri += w; ti += w; }
        for (let j = rr + 1; j < h - rr; j++) { val += src[ri] - src[li]; dst[ti] = val * iarr; li += w; ri += w; ti += w; }
        for (let j = h - rr; j < h; j++) { val += lv - src[li]; dst[ti] = val * iarr; li += w; ti += w; }
      }
    };
    for (const s of sizes) { const rr = (s - 1) / 2; boxH(a, tmp, rr); boxV(tmp, a, rr); }
    for (let i = 0; i < w * h; i++) d[i * 4 + 3] = Math.max(0, Math.min(255, a[i]));
    ctx.putImageData(img, 0, 0);
  }
  function makeCanvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h || w; return c; }
  // pinta uma máscara (forma branca com alfa) em uma cor com opacidade máxima "peak"
  function drawMasked(ctx, mask, color, peak) {
    const c = makeCanvas(mask.width, mask.height), x = c.getContext("2d");
    x.drawImage(mask, 0, 0);
    x.globalCompositeOperation = "source-in"; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
    ctx.save(); ctx.globalAlpha = peak; ctx.drawImage(c, 0, 0); ctx.restore();
  }
  // degradê radial com queda gaussiana: alpha = peak * exp(-d²/2σ²)
  function gaussRadial(ctx, cx, cy, sigma, color, peak) {
    const R = sigma * 4, g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    for (let k = 0; k <= 24; k++) { const t = k / 24, d = t * 4; g.addColorStop(t, rgba(color, peak * Math.exp(-d * d / 2))); }
    ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
  }

  const MIST_SEEDS = [[0.95, .62], [1.25, .48], [1.62, .58], [2.05, .44], [2.45, .6], [2.9, .5], [0.6, .46], [2.75, .55]];

  // ---------- um olho ----------
  // side: 0 = olho esquerdo do par, 1 = direito (névoa espelhada; estrela diferente na Gwen)
  function renderEye(ch, side, px = EYE_PX, opts = {}) {
    // linha dividida: cada metade é um personagem; numa prévia isolada, o lado 0 mostra um e o lado 1 o outro
    if (ch._metades) return renderEye(ch._metades[side ? 1 : 0], side, px, opts);
    const cv = makeCanvas(px), ctx = cv.getContext("2d", { willReadFrequently: true }), r = px / 2, fx = ch.fx || {};
    if (opts.background) { ctx.fillStyle = opts.background; ctx.fillRect(0, 0, px, px); }
    ctx.save();
    ctx.beginPath(); ctx.arc(r, r, r, 0, Math.PI * 2); ctx.clip();
    // degradê principal (olho direito pode ter degradê próprio: "olhos diferentes no par")
    const dir = side === 1 && Array.isArray(ch.colors2) && ch.colors2.length >= 2;
    const cols = dir ? ch.colors2 : ch.colors, stops = dir ? ch.stops2 : ch.stops;
    const g = ctx.createLinearGradient(0, 0, 0, px);
    cols.forEach((c, i) => g.addColorStop(Math.max(0, Math.min(1, stops[i] / 100)), viv(c)));
    ctx.fillStyle = g; ctx.fillRect(0, 0, px, px);
    // sombra suave no topo
    if (fx.top) {
      const N = 14; ctx.fillStyle = rgba(fx.top.color, fx.top.a * 0.7 / N * 1.6);
      for (let i = 0; i < N; i++) {
        const t = 0.35 + 0.65 * (i + 1) / N, ff = fx.top.f * 1.25 * t;
        ctx.beginPath(); ctx.ellipse(r, 0, 1.15 * r, 2 * ff * r, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    // meia-lua clara embaixo
    if (fx.cres) {
      const N = 16; ctx.fillStyle = rgba(viv(fx.cres.color), fx.cres.a * 0.75 / N * 1.7);
      for (let i = 0; i < N; i++) {
        const t = 0.3 + 0.7 * (i + 1) / N, hh = fx.cres.h * 1.2 * t;
        ctx.beginPath(); ctx.ellipse(r, px, 0.95 * r * (0.6 + 0.4 * t), 2 * hh * r, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    // brilhos no centro
    (fx.glow || []).forEach(gl => gaussRadial(ctx, r, r - gl.oy * r, gl.size * r * 0.5, viv(gl.color, 1.1), gl.peak));
    // arco suave no topo (make_themes.py, "arc"): transição em OKLCH, sem cinza nem neon
    if (fx.arc) desenharArco(ctx, px, fx.arc);
    // anéis octogonais esfumados
    if (fx.octo) {
      const m = makeCanvas(px), mx = m.getContext("2d");
      mx.strokeStyle = "#fff"; mx.lineWidth = Math.max(2, r * 0.05); mx.lineJoin = "round";
      fx.octo.rings.forEach(fr => {
        mx.beginPath();
        for (let j = 0; j <= 8; j++) {
          const a = (22.5 + 45 * j) * Math.PI / 180, x = r + r * fr * Math.cos(a), y = r - r * fr * Math.sin(a);
          j ? mx.lineTo(x, y) : mx.moveTo(x, y);
        }
        mx.stroke();
      });
      blurAlpha(m, r * 0.035);
      drawMasked(ctx, m, viv(fx.octo.color, 1.1), fx.octo.peak);
    }
    // borda escura esfumada
    if (fx.rim) {
      const w = fx.rim.w * r, gr = ctx.createRadialGradient(r, r, 0, r, r, r), col = viv(fx.rim.color, 1.1);
      for (let k = 0; k <= 32; k++) { const rho = k / 32 * r; gr.addColorStop(k / 32, rgba(col, fx.rim.peak * Math.exp(-((r - rho) ** 2) / (2 * w * w)))); }
      ctx.fillStyle = gr; ctx.fillRect(0, 0, px, px);
    }
    // névoa nas bordas
    if (fx.mist) {
      const m = makeCanvas(px), mx = m.getContext("2d"); mx.fillStyle = "#fff";
      MIST_SEEDS.forEach(([u, sz], k) => {
        let ang = (fx.mist.from + (fx.mist.to - fx.mist.from) * ((u * 0.37 + k * 0.131) % 1)) * Math.PI / 180;
        if (side === 1 && ch.espelhar !== false) ang = Math.PI - ang;
        const x = r + r * 0.95 * Math.cos(ang), y = r - r * 0.95 * Math.sin(ang);
        mx.beginPath(); mx.ellipse(x, y, r * sz * 0.75, r * sz * 0.5, 0, 0, Math.PI * 2); mx.fill();
      });
      blurAlpha(m, r * 0.13);
      drawMasked(ctx, m, viv(fx.mist.color, 1.1), fx.mist.peak);
    }
    // estrelas da Gwen
    if (fx.gwen) {
      const sc = r, sy = r - r * 0.04;
      let R = r * 0.36, col = "#0B4652", base = 0.04, rot = 0;
      if (side === 1) {
        rot = 45; col = "#FF1FA8"; base = 0.085; R = r * 0.37;
        ctx.fillStyle = rgba(viv("#0A4E78"), 0.035);
        for (let i = 0; i < 24; i++) { ctx.beginPath(); ctx.arc(sc, sy, r * (0.62 - 0.012 * i), 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.fillStyle = rgba(col, base);
      const N = 20;
      for (let i = 0; i < N; i++) {
        const k2 = 2.0 - 1.15 * i / (N - 1);
        ctx.beginPath();
        for (let j = 0; j < 8; j++) {
          const a = (90 + rot + 45 * j) * Math.PI / 180, rr = R * k2 * (j % 2 === 0 ? 1 : 0.44);
          const x = sc + rr * Math.cos(a), y = sy - rr * Math.sin(a);
          j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
    if (ch.camadas && ch.camadas.length) aplicarCamadas(cv, ch, side);
    return cv;
  }
  const sideMatters = ch => !!(ch._metades || (ch.camadas && ch.camadas.length) || ch.colors2 || (ch.fx && (ch.fx.mist || ch.fx.gwen)));

  /* =====================================================================
   * MOTIVOS — porte de magic_eyes.py (classe Eye) e ds_eyes.py
   * Cada personagem procedural é uma lista ordenada de camadas (personagens.js).
   * O olho vira uma imagem em ponto flutuante e cada camada é composta por cima,
   * como no Python: over(cor, alfa), glow gaussiano, rim, e paint = máscara
   * desenhada + GaussianBlur(desf·r) × pico × tone.
   * Coordenadas como no Python: x para a direita e y para CIMA, em unidades de r.
   * Larguras de linha seguem o PIL a 900 px (r = 450): max(2, int(450·w)).
   * ===================================================================== */
  const R_REF = 450;
  const larg = (w, r, minimo = 2) => Math.max(minimo, Math.floor(R_REF * w)) * r / R_REF;
  const SPARK = [[-0.42, 0.42, 1.0], [0.5, 0.18, 0.7], [-0.15, -0.55, 0.55], [0.32, -0.38, 0.45], [0.05, 0.62, 0.4]];
  const GALAXY_DOTS = [[-.55, .3, .5], [-.3, .6, .35], [.1, .45, .4], [.45, .5, .3], [.6, .1, .45], [-.65, -.1, .35], [-.4, -.45, .3], [.2, -.2, .25],
    [.5, -.45, .35], [-.1, .15, .3], [.3, .2, .22], [-.2, -.2, .25], [0, -.65, .3], [.7, -.2, .25], [-.5, .05, .22]];
  const KANJI_FONTE = '"SinintKanji", "Noto Serif JP", "Noto Serif CJK JP", "Yu Mincho", "MS Mincho", serif';

  function vivRgb(hex, sat) { return hexToRgb(viv(hex, sat)).map(v => v / 255); }
  function starPts(cx, cy, R, k = 5, inner = 0.45, rot = -90) {
    const pts = [];
    for (let j = 0; j < 2 * k; j++) { const a = (rot + 180 / k * j) * Math.PI / 180, rr = j % 2 === 0 ? R : R * inner; pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); }
    return pts;
  }
  function heartPts(cx, cy, R) {
    const pts = [];
    for (let i = 0; i < 200; i++) {
      const t = 2 * Math.PI * i / 200, x = 16 * Math.sin(t) ** 3;
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      pts.push([cx + x / 17 * R, cy - y / 17 * R + 0.1 * R]);
    }
    return pts;
  }
  const linspace = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
  function poli(c, pts) { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.fill(); }
  function linha(c, pts, w, fechada) { c.lineWidth = w; c.lineJoin = "round"; c.lineCap = "butt"; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); if (fechada) c.closePath(); c.stroke(); }
  function elipse(c, x0, y0, x1, y1) { c.beginPath(); c.ellipse((x0 + x1) / 2, (y0 + y1) / 2, Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, 0, 0, Math.PI * 2); c.fill(); }
  // contorno de elipse como o PIL: a espessura fica para DENTRO da caixa
  function elipseContorno(c, x0, y0, x1, y1, w) { c.lineWidth = w; c.beginPath(); c.ellipse((x0 + x1) / 2, (y0 + y1) / 2, Math.max(0.1, Math.abs(x1 - x0) / 2 - w / 2), Math.max(0.1, Math.abs(y1 - y0) / 2 - w / 2), 0, 0, Math.PI * 2); c.stroke(); }
  function chama(c, r, cx, cy, h, w, lean) {
    const pts = [];
    linspace(0, 1, 40).forEach(t => { const x = -w * Math.sin(Math.PI * (1 - t) * .9) * (1 - t) ** .3, y = -h * t; pts.push([cx + (x + lean * t * t * h) * r, cy + y * r]); });
    linspace(1, 0, 40).forEach(t => { const x = w * Math.sin(Math.PI * (1 - t) * .9) * (1 - t) ** .3, y = -h * t; pts.push([cx + (x + lean * t * t * h) * r, cy + y * r]); });
    poli(c, pts);
  }
  function raios(c, r, n, r0, r1, w, rot, jit, ponta) {
    for (let j = 0; j < n; j++) {
      const a = (rot + 360 / n * j) * Math.PI / 180, L = r1 * (jit && jit.length ? jit[j % jit.length] : 1);
      linha(c, [[r + r0 * r * Math.cos(a), r - r0 * r * Math.sin(a)], [r + L * r * Math.cos(a), r - L * r * Math.sin(a)]], larg(w, r));
      if (ponta) { const x = r + L * r * Math.cos(a), y = r - L * r * Math.sin(a), R = ponta * r; elipse(c, x - R, y - R, x + R, y + R); }
    }
  }

  /* Formas: desenham em branco numa máscara n×n. Recebem (c, r, L, m, lado, fase)
   * m = −1 quando o motivo é espelhado no olho direito; fase = deslocamento das ondas no olho direito. */
  const FORMAS = {
    meialua(c, r, L) { const h = L.h ?? .34; elipse(c, r - .9 * r, 2 * r - 2.2 * h * r, r + .9 * r, 2 * r + 2.2 * h * r); },
    sombra(c, r, L) { const f = L.f ?? .22; elipse(c, r - 1.2 * r, -2.4 * f * r, r + 1.2 * r, 2.4 * f * r); },
    estrela(c, r, L) { poli(c, starPts(r + (L.x || 0) * r, r - (L.y || 0) * r, (L.R ?? .38) * r, L.pontas || 5, L.inner ?? .45, -90)); },
    coracao(c, r, L) { poli(c, heartPts(r + (L.x || 0) * r, r - (L.y || 0) * r, (L.R ?? .4) * r)); },
    chamas(c, r, L) { (L.itens || []).forEach(([dx, h, w, l]) => chama(c, r, r + dx * r, r * (L.base ?? 1.95), h, w, l)); },
    raios(c, r, L) { raios(c, r, L.n ?? 12, L.r0 ?? .12, L.r1 ?? .5, L.w ?? .035, L.rot || 0, L.jit, L.ponta); },
    estrias(c, r, L) { raios(c, r, L.n ?? 40, L.r0 ?? .25, L.r1 ?? .97, L.w ?? .008, 0, L.jit || [1, .82, .94, .7, .9, .78, 1, .86]); },
    sol(c, r, L) {
      const n = L.n ?? 12, b = L.base ?? .1;
      for (let j = 0; j < n; j++) {
        const a = (90 + 360 / n * j) * Math.PI / 180, Lr = (j % 2 === 0 ? (L.longo ?? .78) : (L.curto ?? .5)) * r;
        poli(c, [[r + b * r * Math.cos(a + 1.5), r - b * r * Math.sin(a + 1.5)], [r + Lr * Math.cos(a), r - Lr * Math.sin(a)], [r + b * r * Math.cos(a - 1.5), r - b * r * Math.sin(a - 1.5)]]);
      }
    },
    aneis(c, r, L) {
      const k = L.k || 0, w = larg(L.w ?? .03, r);
      (L.fr || [.5]).forEach(f => {
        if (k) { const pts = []; for (let j = 0; j < k; j++) { const a = ((L.rot || 0) + 360 / k * j) * Math.PI / 180; pts.push([r + r * f * Math.cos(a), r - r * f * Math.sin(a)]); } linha(c, pts, w, true); }
        else elipseContorno(c, r - f * r, r - f * r, r + f * r, r + f * r, w);
      });
    },
    ondas(c, r, L, m, lado, fase) {
      (L.ys || [.55, .85, 1.15, 1.45]).forEach((y0, k) => {
        const pts = linspace(0, 2 * r, 70).map(x => [x, r * y0 + (L.amp ?? .07) * r * Math.sin(x / r * (L.freq ?? 3.4) + (L.fase || 0) + fase + k * (L.passo ?? 1))]);
        linha(c, pts, larg(L.w ?? .035, r));
      });
    },
    faixas(c, r, L, m, lado, fase) {
      const ph = (L.fase || 0) + fase, pts = linspace(0, 2 * r, 60).map(x => [x, r * (L.y0 ?? .62) + (L.amp ?? .08) * r * Math.sin(x / r * (L.freq ?? 3) + ph)]);
      poli(c, pts.concat(pts.slice().reverse().map(([x, y]) => [x, y + (L.alt ?? .14) * r])));
    },
    liquido(c, r, L, m, lado, fase) {
      const pts = linspace(0, 2 * r, 80).map(x => [x, r * (L.y0 ?? 1.05) + (L.amp ?? .06) * r * Math.sin(x / r * (L.freq ?? 4.2) + (L.fase || 0) + fase)]);
      poli(c, pts.concat([[2 * r, 2 * r], [0, 2 * r]]));
    },
    gotas(c, r, L, m) {
      (L.itens || []).forEach(([x, Lh, w]) => { const cx = r + x * r * m; c.fillRect(cx - w * r, 0, 2 * w * r, Lh * r); elipse(c, cx - w * r, Lh * r - w * r, cx + w * r, Lh * r + w * r); });
    },
    redemoinho(c, r, L, m) {
      const w = larg(L.w ?? .02, r);
      for (let k = 1; k <= (L.n ?? 8); k++) {
        const f = (L.passo ?? .1) * k, ox = (L.dx ?? .03) * k * m, sx = L.sx ?? 1.05, sy = L.sy ?? .92;
        elipseContorno(c, r + ox * r - f * r * sx, r - f * r * sy, r + ox * r + f * r * sx, r + f * r * sy, w);
      }
    },
    escamas(c, r, L) {
      const s = (L.s ?? .22) * r, w = larg(L.w ?? .016, r); c.lineWidth = w;
      for (let row = -5; row <= 5; row++) for (let col = -5; col <= 5; col++) {
        const cx = r + col * s + (((row % 2) + 2) % 2) * s / 2, cy = r + row * s * .62;
        c.beginPath(); c.arc(cx, cy, Math.max(0.1, s / 2 - w / 2), 0, Math.PI); c.stroke();
      }
    },
    hachuras(c, r, L) {
      const n = L.n ?? 7, w = larg(L.w ?? .022, r);
      for (let k = -n; k <= n; k++) {
        const y = r + k * (L.passo ?? .075) * r, half = r * (L.larg ?? .55) * Math.sqrt(Math.max(0, 1 - (k / (L.div ?? 8.2)) ** 2));
        linha(c, [[r - half, y], [r + half, y]], w);
      }
    },
    rachaduras(c, r, L, m) { const w = larg(L.w ?? .018, r); (L.linhas || []).forEach(pts => linha(c, pts.map(([x, y]) => [r + x * r * m, r - y * r]), w)); },
    nuvens(c, r, L, m) {
      (L.itens || [[-.35, .25, 1], [.4, -.15, .85], [-.1, -.55, .7]]).forEach(([cx, cy, k]) => {
        const x0 = r + cx * r * m, y0 = r - cy * r;
        [[-.18, 0, .16], [0, .07, .2], [.2, .01, .15], [.05, -.06, .17]].forEach(([dx, dy, rr]) => {
          const R = rr * k * r, X = x0 + dx * k * r, Y = y0 - dy * k * r; elipse(c, X - R, Y - R, X + R, Y + R);
        });
      });
    },
    lua(c, r, L, m) {
      const R = (L.R ?? .44) * r, cx = r + (L.x ?? .02) * r * m, cy = r - (L.y ?? .05) * r;
      elipse(c, cx - R, cy - R, cx + R, cy + R);
      const ox = (L.corte ?? .2) * r * m, Rc = R * (L.k ?? .92), cyc = cy - (L.cy ?? .1) * r;
      c.save(); c.globalCompositeOperation = "destination-out"; elipse(c, cx + ox - Rc, cyc - Rc, cx + ox + Rc, cyc + Rc); c.restore();
    },
    petalas(c, r, L, m) {
      if (L.modo === "anel") {   // flor: pétalas em volta do centro
        for (let j = 0; j < (L.n ?? 12); j++) {
          const a = ((L.rot ?? 15) + 360 / (L.n ?? 12) * j) * Math.PI / 180, px = r + (L.dist ?? .55) * r * Math.cos(a), py = r - (L.dist ?? .55) * r * Math.sin(a);
          const pts = []; for (let t = 0; t < 40; t++) { const u = 2 * Math.PI * t / 40, ex = (L.a ?? .3) * r * Math.cos(u), ey = (L.b ?? .1) * r * Math.sin(u); pts.push([px + ex * Math.cos(a) - ey * Math.sin(a), py - (ex * Math.sin(a) + ey * Math.cos(a))]); }
          poli(c, pts);
        }
        return;
      }
      (L.itens || []).forEach(([x, y, ang, k]) => {   // pétalas de cerejeira soltas
        const cx = r + x * r * m, cy = r - y * r, a = ang * m * Math.PI / 180, Lp = (L.L ?? .2) * k * r, Wp = (L.W ?? .12) * k * r;
        const pts = linspace(0, 2 * Math.PI, 60).map(t => {
          const px = Lp * Math.cos(t); let py = Wp * Math.sin(t) * (1 - .35 * Math.cos(t));
          if (Math.cos(t) > .8) py *= 1 - 2.5 * (Math.cos(t) - .8);
          return [cx + px * Math.cos(a) - py * Math.sin(a), cy - (px * Math.sin(a) + py * Math.cos(a))];
        });
        poli(c, pts);
      });
    },
    brilhinhos(c, r, L, m) { (L.pts || SPARK.slice(0, 3)).forEach(([x, y, k]) => { const R = (L.tam ?? .06) * k * r; poli(c, starPts(r + x * m * r, r - y * r, R, 4, 0.28, -90)); }); },
    pontinhos(c, r, L, m) { (L.pts || GALAXY_DOTS).forEach(([x, y, k]) => { const R = (L.tam ?? .035) * k * r, cx = r + x * m * r, cy = r - y * r; elipse(c, cx - R, cy - R, cx + R, cy + R); }); },
    fenda(c, r, L) { const lw = L.larg ?? .1; elipse(c, r - lw * r, (L.y0 ?? .18) * r, r + lw * r, (L.y1 ?? 1.82) * r); },
    forma(c, r, L, m) {
      const P = ([x, y]) => [r + x * r * m, r - y * r];
      const w = L.contorno ? larg(L.contorno, r) : 0;
      (L.polis || []).forEach(p => w ? linha(c, p.map(P), w, true) : poli(c, p.map(P)));
      (L.segs || []).forEach(s => linha(c, s.map(P), w || larg(L.w ?? .02, r, 0)));
    },
    kanji(c, r, L, m, lado) {
      const txt = (L.textos || ["", ""])[lado] || ""; if (!txt) return;
      const chars = [...txt], size = (L.tams || [.5, .62])[lado] ?? .6;
      c.font = `700 ${Math.floor(2 * r * size / chars.length ** .55)}px ${KANJI_FONTE}`; c.textBaseline = "alphabetic"; c.textAlign = "left";
      const caixa = ch => tinta(c.font, ch);
      const oy = (L.oy || 0) * r;
      if (chars.length === 1) { const bb = caixa(txt); c.fillText(txt, r - (bb.r - bb.l) / 2 - bb.l, r - (bb.b - bb.t) / 2 - bb.t - oy); return; }
      const bbs = chars.map(caixa), tot = bbs.reduce((s, bb) => s + bb.b - bb.t, 0) + .06 * r * (chars.length - 1);
      // −0,026 r: no Pillow a pilha sai um pouco mais alta (medido na prévia de referência)
      let y = r - tot / 2 - oy - .026 * r;
      chars.forEach((ch, i) => { const bb = bbs[i]; c.fillText(ch, r - (bb.r - bb.l) / 2 - bb.l, y - bb.t); y += bb.b - bb.t + .06 * r; });
    },
  };
  // caixa da TINTA de um caractere (como o textbbox do Pillow), relativa à linha de base.
  // O measureText do navegador devolve a caixa geral da fonte para estes glifos, então a tinta é medida desenhando.
  const tintaCache = new Map();
  function tinta(font, ch) {
    const k = font + "|" + ch; if (tintaCache.has(k)) return tintaCache.get(k);
    const px = parseFloat(/(\d+(?:\.\d+)?)px/.exec(font)[1]), n = Math.ceil(px * 2), o = Math.ceil(px * 0.5);
    const cv = makeCanvas(n), c = cv.getContext("2d", { willReadFrequently: true });
    c.font = font; c.textBaseline = "alphabetic"; c.fillStyle = "#fff"; c.fillText(ch, o, o + px);
    const d = c.getImageData(0, 0, n, n).data; let x0 = n, y0 = n, x1 = -1, y1 = -1;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (d[(y * n + x) * 4 + 3] > 127) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const bb = x1 < 0 ? { l: 0, r: 0, t: 0, b: 0 } : { l: x0 - o, r: x1 + 1 - o, t: y0 - (o + px), b: y1 + 1 - (o + px) };
    tintaCache.set(k, bb); return bb;
  }
  // valores padrão de desfoque e saturação de cada tipo (como nas chamadas do Python)
  const PADRAO_CAMADA = { meialua: { desf: .12, sat: 1.1 }, sombra: { desf: .12, sat: 1.0 }, brilhinhos: { desf: .012 }, pontinhos: { desf: .015 }, estrias: { desf: .01, forte: true }, kanji: { desf: .006, forte: true } };

  // imagem do olho em ponto flutuante (equivalente a Eye.img no Python)
  function Olho(cv) {
    const n = cv.width, ctx = cv.getContext("2d", { willReadFrequently: true }), dados = ctx.getImageData(0, 0, n, n), d = dados.data;
    const img = new Float32Array(n * n * 3);
    for (let i = 0, j = 0; i < n * n; i++, j += 4) { img[i * 3] = d[j] / 255; img[i * 3 + 1] = d[j + 1] / 255; img[i * 3 + 2] = d[j + 2] / 255; }
    return {
      n, r: n / 2, img,
      // s.img = s.img·(1−a) + cor·a, com a = alfa(i) já limitado a [0, 1]
      over(cor, alfa) {
        for (let i = 0; i < n * n; i++) {
          const a = alfa(i); if (a <= 0) continue; const k = a >= 1 ? 1 : a, b = 1 - k, p = i * 3;
          const c = typeof cor === "function" ? cor(i) : cor;
          img[p] = img[p] * b + c[0] * k; img[p + 1] = img[p + 1] * b + c[1] * k; img[p + 2] = img[p + 2] * b + c[2] * k;
        }
      },
      fim() {
        for (let i = 0, j = 0; i < n * n; i++, j += 4) {
          d[j] = Math.round(Math.min(1, Math.max(0, img[i * 3])) * 255); d[j + 1] = Math.round(Math.min(1, Math.max(0, img[i * 3 + 1])) * 255); d[j + 2] = Math.round(Math.min(1, Math.max(0, img[i * 3 + 2])) * 255);
        }
        ctx.putImageData(dados, 0, 0);
      },
    };
  }

  function aplicarCamadas(cv, ch, side) {
    const E = Olho(cv), n = E.n, r = E.r, tom = ch.tom ?? 1, espelha = side === 1 && ch.espelhar !== false;
    for (const L0 of ch.camadas) {
      const L = { ...(PADRAO_CAMADA[L0.t] || {}), ...L0 };
      if ((L.lado === "e" && side !== 0) || (L.lado === "d" && side !== 1)) continue;
      const m = L.esp && espelha ? -1 : 1, fase = espelha ? (L.fase2 || 0) : 0;
      if (L.t === "brilho") {   // glow: alfa = pico·exp(−d²/2σ²), sem o tone
        const sig = (L.tam ?? .6) * r * .5, gx = r + (L.x || 0) * m * r, gy = r - (L.y || 0) * r, cor = vivRgb(L.cor, L.sat ?? 1.1), k = 1 / (2 * sig * sig);
        E.over(cor, i => { const x = i % n - gx, y = (i / n | 0) - gy; return L.pico * Math.exp(-(x * x + y * y) * k); });
      } else if (L.t === "borda") {   // rim: borda escura esfumada, sem o tone
        const cor = vivRgb(L.cor, 1.1), w = (L.w ?? .1) * r, k = 1 / (2 * w * w);
        E.over(cor, i => { const x = i % n - r, y = (i / n | 0) - r, d = r - Math.sqrt(x * x + y * y); return L.pico * Math.exp(-d * d * k); });
      } else if (L.t === "setores") {   // Doma: setores em arco-íris pastel
        const cs = (L.cores || ["#F6A8D8", "#F8E07A", "#A8EE9A", "#8ADCF2", "#C8A8F4", "#F6A8D8"]).map(c => vivRgb(c, 1.0)), st = cs.map((_, i) => 360 * i / (cs.length - 1));
        E.over(i => {
          const x = i % n - r, y = (i / n | 0) - r; let a = (Math.atan2(-y, x) * 180 / Math.PI + 360) % 360; if (m < 0) a = (180 - a + 360) % 360;
          let j = 0; while (j < st.length - 2 && a > st[j + 1]) j++;
          const t = (a - st[j]) / (st[j + 1] - st[j]); return [0, 1, 2].map(q => cs[j][q] + (cs[j + 1][q] - cs[j][q]) * t);
        }, () => L.pico ?? .85);
      } else if (FORMAS[L.t]) {   // paint: máscara desenhada + desfoque gaussiano
        const mc = makeCanvas(n), c = mc.getContext("2d", { willReadFrequently: true });
        c.fillStyle = c.strokeStyle = "#fff";
        const esc = L.esc ?? 1;
        if (esc !== 1) { c.translate(r, r); c.scale(esc, esc); c.translate(-r, -r); }
        FORMAS[L.t](c, r, L, m, side, fase);
        const desf = L.desf ?? .03;
        if (desf > 0) blurAlpha(mc, desf * r);
        const a = c.getImageData(0, 0, n, n).data, k = (L.pico ?? .5) * (L.forte ? 1 : tom) / 255;
        E.over(vivRgb(L.cor, L.sat ?? 1.0), i => a[i * 4 + 3] * k);
      }
    }
    E.fim();
  }

  // ---------- arco no topo (OKLCH), de make_themes.py ----------
  function desenharArco(ctx, n, arc) {
    const r = n / 2, R2 = 1.75 * r, off = arc.off ?? .3, soft = arc.soft ?? .35;
    const lin = u => u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4, delin = u => u <= 0.0031308 ? 12.92 * u : 1.055 * Math.max(0, u) ** (1 / 2.4) - 0.055;
    const lab = hex => {
      const [r_, g_, b_] = hexToRgb(viv(hex)).map(v => lin(v / 255));
      const l = Math.cbrt(0.4122214708 * r_ + 0.5363325363 * g_ + 0.0514459929 * b_), m = Math.cbrt(0.2119034982 * r_ + 0.6806995451 * g_ + 0.1073969566 * b_), s = Math.cbrt(0.0883024619 * r_ + 0.2817188376 * g_ + 0.6299787005 * b_);
      return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
    };
    const [L1, A1, B1] = lab(arc.color), [L2, A2, B2] = lab(arc.base || arc.color);
    const C1 = Math.hypot(A1, B1), h1 = Math.atan2(B1, A1), C2 = Math.hypot(A2, B2), h2 = Math.atan2(B2, A2);
    const dh = ((h2 - h1 + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    const camada = makeCanvas(n), cc = camada.getContext("2d"), im = cc.createImageData(n, n), d = im.data;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const d2 = Math.hypot(x - r, y - (off * r + R2)); let t = Math.min(1, Math.max(0, (d2 - R2) / (soft * r) + 0.5)); t = t * t * (3 - 2 * t);
      const L = L2 + (L1 - L2) * t - 0.13 * Math.sin(Math.PI * t), C = C2 + (C1 - C2) * t, hh = h1 + dh * (1 - t), A = C * Math.cos(hh), B = C * Math.sin(hh);
      const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3, m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3, s = (L - 0.0894841775 * A - 1.2914855480 * B) ** 3;
      const p = (y * n + x) * 4;
      d[p] = 255 * Math.min(1, Math.max(0, delin(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)));
      d[p + 1] = 255 * Math.min(1, Math.max(0, delin(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)));
      d[p + 2] = 255 * Math.min(1, Math.max(0, delin(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)));
      d[p + 3] = 255 * Math.min(1, Math.max(0, t * 1.4));
    }
    cc.putImageData(im, 0, 0); ctx.drawImage(camada, 0, 0);
  }

  // ---------- layout da folha ----------
  // centros dos 6 pares de olhos (mesma grade do Python)
  const PAIR_W = 26, X0 = 19, GAP = ((W - 6) - X0 - 6 * PAIR_W) / 5;
  const CENTERS = Array.from({ length: 6 }, (_, i) => { const px = X0 + i * (PAIR_W + GAP); return [px + 6, px + PAIR_W - 6]; });

  function sortKey(n) { return n.normalize("NFKD").replace(/[̀-ͯ'\-]/g, "").toLowerCase(); }

  function blockRows(ch, sizes) {
    const rows = [];
    sizes.forEach(s => { for (let q = 0; q < (ch.qty || 1); q++) rows.push(s); });
    return rows;
  }
  function blockHeight(ch, sizes) {
    const rows = blockRows(ch, sizes);
    return 8 + 3.5 + rows.reduce((a, b) => a + b, 0) + 3.5 * (rows.length - 1) + 5;
  }
  /* opts: { title, sizes:[12,10], alphabetical:true, byTheme:false }
   * devolve [{title, index, total, blocks:[{ch, y}]}] */
  function paginate(chars, opts) {
    const sizes = opts.sizes && opts.sizes.length ? opts.sizes.slice().sort((a, b) => b - a) : [12, 10];
    let sections = [];
    if (opts.byTheme) {
      const map = new Map();
      chars.forEach(c => { const t = c.theme || "Outros"; if (!map.has(t)) map.set(t, []); map.get(t).push(c); });
      map.forEach((list, t) => sections.push({ title: t, list }));
    } else sections = [{ title: opts.title || "", list: chars.slice() }];
    const pages = [];
    // Ordem alfabética como nos PDFs de referência: primeiro os personagens normais, depois os dobrados (qty 2).
    const alfa = (a, b) => ((a.qty || 1) > 1) - ((b.qty || 1) > 1) || sortKey(a.name).localeCompare(sortKey(b.name), "pt");
    sections.forEach(sec => {
      const list = opts.alphabetical ? sec.list.slice().sort(alfa) : sec.list;
      const secPages = []; let cur = [], y = TOP;
      list.forEach(ch => {
        const h = blockHeight(ch, sizes);
        if (cur.length && y + h > BOTTOM_LIMIT + 0.01) { secPages.push(cur); cur = []; y = TOP; }
        cur.push({ ch, y }); y += h;
      });
      if (cur.length) secPages.push(cur);
      secPages.forEach((blocks, i) => pages.push({ title: opts.byTheme ? sec.title : (opts.title || ""), index: i + 1, total: secPages.length, blocks, sizes }));
    });
    return pages;
  }

  // ---------- desenho da folha (comum ao PDF e à prévia) ----------
  function sparklePts(x, y, s) {
    const d = [[0, -1], [0.22, -0.22], [1, 0], [0.22, 0.22], [0, 1], [-0.22, 0.22], [-1, 0], [-0.22, -0.22]];
    return d.map(([dx, dy]) => [x + dx * s, y + dy * s]);
  }
  const BROWN = "#4A2C1E";

  function drawPage(P, page, eyeImg) {
    // No script Python (ReportLab), o espaçamento de 0,8 pt do nome do personagem continua valendo para
    // os textos seguintes da página (rótulos 12MM/10MM e régua). Reproduzido aqui para o PDF sair igual.
    // Os textos centralizados usam a largura sem o espaçamento, como o drawCentredString do ReportLab.
    let resto = 0;
    const centro = (t, x, y, o) => P.text(t, x - P.textWidth(t, o.font, o.size, o.bold) / 2, y, { ...o, charSpace: resto });
    // topo: logo (desenho com 9 mm de altura a partir de 6 × 5 mm) + título
    if (P.logo) P.image(P.logo, 6, 5, 9 * P.logoRatio, 9, "logo");
    // rodapé: selo "S★" com 6,5 mm de altura, alinhado à direita em W − 6 e com a base a 7 mm da borda
    if (P.selo) { const h = 6.5, w = h * P.seloRatio; P.image(P.selo, W - 6 - w, H - 7 - h, w, h, "selo"); }
    if (page.title) P.text(page.title, W - 6, 11.6, { font: "Fredoka", size: 13, color: BROWN, align: "right" });
    if (page.total > 1) P.text(`folha ${page.index} de ${page.total}`, W - 6, 15.2, { font: "Quicksand", size: 7.5, color: BROWN, align: "right" });
    page.blocks.forEach(({ ch, y }) => {
      const hc = ch.band;
      // faixa do nome
      const x0 = 6, x1 = W - 6, hgt = 8;
      P.band(x0, y, x1 - x0, hgt, hc);
      P.stitch(x0 + 1.1, y + 1.1, x1 - x0 - 2.2, hgt - 2.2, 2.9, x => corFaixa(hc, (x - x0) / (x1 - x0)));
      const cs = 0.8 * PT, size = 13.5;
      const tw = P.textWidth(ch.name, "Fredoka", size) + cs * (ch.name.length - 1);
      P.text(ch.name, W / 2 - tw / 2, y + hgt / 2 + 1.65, { font: "Fredoka", size, color: "#FFFFFF", charSpace: cs });
      resto = cs;
      [-1, 1].forEach(sx => {
        const xa = W / 2 + sx * (tw / 2 + 4.2), xb = W / 2 + sx * (tw / 2 + 7);
        P.poly(sparklePts(xa, y + hgt / 2, 1.05), "#FFFFFF", 0.85, corFaixa(hc, (xa - x0) / (x1 - x0)));
        P.poly(sparklePts(xb, y + hgt / 2 - 0.3, 0.6), "#FFFFFF", 0.5, corFaixa(hc, (xb - x0) / (x1 - x0)));
      });
      // linhas de olhos
      let yy = y + 8 + 3.5;
      const rows = blockRows(ch, page.sizes);
      rows.forEach((s, k) => {
        const cy = yy + s / 2;
        P.pill(4, cy - 2.5, 12, 5, hc.split("|")[0]);
        centro(`${s}MM`, 10, cy + 0.8, { font: "Quicksand", bold: true, size: 6.6, color: "#FFFFFF" });
        // Até 12 mm a grade é a do script Python (olhos do par a 14 mm de distância).
        // Acima disso o par se abre para sobrar 2 mm entre os dois olhos, sem encostar.
        const abre = Math.max(0, (s + 2 - 14) / 2);
        // linha dividida: os 3 primeiros pares são de um personagem e os 3 últimos do outro
        CENTERS.forEach(([a, b], i) => {
          const c = ch._metades ? ch._metades[i < 3 ? 0 : 1] : ch;
          P.eye(eyeImg(c, 0), a - abre, cy, s); P.eye(eyeImg(c, 1), b + abre, cy, s);
        });
        yy += s + (k < rows.length - 1 ? 3.5 : 5);
      });
    });
    // régua de 5 cm + instruções
    const ry = H - 10, rx = 10;
    P.line(rx, ry, rx + 50, ry, "#333333", 0.3 * PT);
    for (let i = 0; i <= 50; i++) { const h = (i % 10 === 0 ? 3 : i % 5 === 0 ? 1.8 : 1); P.line(rx + i, ry, rx + i, ry - h, "#333333", 0.3 * PT); }
    for (let i = 0; i <= 50; i += 10) centro(String(i / 10), rx + i, ry + 2.6, { font: "Quicksand", size: 6, color: "#333333" });
    P.text("cm", rx + 52, ry + 0.8, { font: "Quicksand", size: 6, color: "#333333", charSpace: resto });
    P.text("Imprima em TAMANHO REAL (100%), sem 'ajustar à página'.", rx + 62, ry - 0.8, { font: "Quicksand", size: 7.2, color: "#333333", charSpace: resto });
    P.text("Confira com uma régua: a linha ao lado deve medir exatamente 5 cm.", rx + 62, ry + 2.4, { font: "Quicksand", size: 7.2, color: "#333333", charSpace: resto });
  }

  // Logo obrigatória e selo do rodapé (SVGs em logo.js, recortados no desenho) em canvas de alta resolução.
  const svgCache = {};
  function svgCanvas(svg, w, h) {
    if (!svgCache[svg]) svgCache[svg] = loadImage("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg)).then(img => {
      const c = makeCanvas(w, h); c.getContext("2d").drawImage(img, 0, 0, w, h); return c;
    });
    return svgCache[svg];
  }
  const tamSvg = svg => { const m = /viewBox="[\d.\-]+ [\d.\-]+ ([\d.]+) ([\d.]+)"/.exec(svg); return m ? +m[1] / +m[2] : 1; };
  const logoCanvas = () => { const k = tamSvg(window.SININT_LOGO_SVG); return svgCanvas(window.SININT_LOGO_SVG, Math.round(300 * k), 300); };
  const seloCanvas = () => { if (!window.SININT_SELO_SVG) return Promise.resolve(null); const k = tamSvg(window.SININT_SELO_SVG); return svgCanvas(window.SININT_SELO_SVG, Math.round(600 * k), 600); };

  // faixa do nome: uma cor (claro → cor → cor → claro) ou duas cores "a|b" com transição suave no meio
  function bandStops(hc) {
    if (hc.includes("|")) { const [a, b] = hc.split("|"); return [[0, lighten(a, .16)], [.2, a], [.44, a], [.56, b], [.8, b], [1, lighten(b, .16)]]; }
    return [[0, lighten(hc, .16)], [.3, hc], [.7, hc], [1, lighten(hc, .16)]];
  }
  function bandCanvas(hc) {
    const c = makeCanvas(1200, 48), x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 1200, 0);
    bandStops(hc).forEach(([t, cor]) => g.addColorStop(t, cor));
    x.fillStyle = g; x.fillRect(0, 0, 1200, 48); return c;
  }

  // cor da faixa na posição t (0–1), interpolando os stops em sRGB como o gradiente do canvas
  function corFaixa(hc, t) {
    const st = bandStops(hc); t = Math.min(1, Math.max(0, t));
    let i = 1; while (i < st.length - 1 && st[i][0] < t) i++;
    const [t0, c0] = st[i - 1], [t1, c1] = st[i], k = t1 > t0 ? (t - t0) / (t1 - t0) : 0;
    const a = hexToRgb(c0), b = hexToRgb(c1);
    return rgbToHex(...a.map((v, j) => v + (b[j] - v) * k));
  }
  // "cor por cima com opacidade a" misturada à mão (o PDF fica sem transparência)
  function misturar(cor, fundo, a) {
    const c = hexToRgb(cor), f = hexToRgb(fundo);
    return rgbToHex(...c.map((v, j) => f[j] + (v - f[j]) * a));
  }

  // SVG simples (path com M/L/H/V/Q/C/Z, polygon, rotate) desenhado como vetor no jsPDF, cor sólida.
  function svgNoPdf(doc, svg, x, y, h) {
    const vb = /viewBox="([\d.\-]+) ([\d.\-]+) ([\d.]+) ([\d.]+)"/.exec(svg).slice(1).map(Number), k = h / vb[3];
    const el = /<(path|polygon)\b([^>]*)\/?>/g; let m;
    while ((m = el.exec(svg))) {
      const at = n => { const r = new RegExp(`\\b${n}="([^"]*)"`).exec(m[2]); return r ? r[1] : null; };
      let tf = p => p;
      const rot = /rotate\(([\d.\-]+)[ ,]+([\d.\-]+)[ ,]+([\d.\-]+)\)/.exec(at("transform") || "");
      if (rot) {
        const a = +rot[1] * Math.PI / 180, cx = +rot[2], cy = +rot[3], co = Math.cos(a), si = Math.sin(a);
        tf = ([px, py]) => [cx + (px - cx) * co - (py - cy) * si, cy + (px - cx) * si + (py - cy) * co];
      }
      const pt = (px, py) => { const [u, v] = tf([px, py]); return [x + (u - vb[0]) * k, y + (v - vb[1]) * k]; };
      doc.setFillColor(at("fill") || "#000000");
      if (m[1] === "polygon") {
        const n = at("points").trim().split(/[\s,]+/).map(Number);
        for (let i = 0; i < n.length; i += 2) { const [u, v] = pt(n[i], n[i + 1]); i ? doc.lineTo(u, v) : doc.moveTo(u, v); }
        doc.close();
      } else {
        const tk = at("d").match(/[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g);
        let i = 0, cmd = "", cx = 0, cy = 0, sx = 0, sy = 0;
        const num = () => +tk[i++];
        while (i < tk.length) {
          if (/[A-Za-z]/.test(tk[i])) cmd = tk[i++];
          const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase(), ox = rel ? cx : 0, oy = rel ? cy : 0;
          if (C === "Z") { doc.close(); cx = sx; cy = sy; continue; }
          if (C === "M") { cx = ox + num(); cy = oy + num(); sx = cx; sy = cy; doc.moveTo(...pt(cx, cy)); cmd = rel ? "l" : "L"; }
          else if (C === "L") { cx = ox + num(); cy = oy + num(); doc.lineTo(...pt(cx, cy)); }
          else if (C === "H") { cx = ox + num(); doc.lineTo(...pt(cx, cy)); }
          else if (C === "V") { cy = oy + num(); doc.lineTo(...pt(cx, cy)); }
          else if (C === "Q") {
            const qx = ox + num(), qy = oy + num(), ex = ox + num(), ey = oy + num();
            doc.curveTo(...pt(cx + 2 / 3 * (qx - cx), cy + 2 / 3 * (qy - cy)), ...pt(ex + 2 / 3 * (qx - ex), ey + 2 / 3 * (qy - ey)), ...pt(ex, ey));
            cx = ex; cy = ey;
          } else if (C === "C") {
            const a1 = ox + num(), b1 = oy + num(), a2 = ox + num(), b2 = oy + num(); cx = ox + num(); cy = oy + num();
            doc.curveTo(...pt(a1, b1), ...pt(a2, b2), ...pt(cx, cy));
          } else throw new Error("comando SVG não suportado: " + cmd);
        }
      }
      doc.fill();
    }
  }

  // ---------- PDF ----------
  // Sem nenhuma transparência (sem GState, sem imagem com alfa): drivers de jato de tinta "achatam"
  // camadas semitransparentes em degraus e aparecem listras nos esfumados.
  async function buildPDF(chars, opts, onProgress) {
    const { jsPDF } = window.jspdf, A = window.SININT_ASSETS;
    const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
    doc.addFileToVFS("Fredoka-SemiBold.ttf", A.fredoka); doc.addFont("Fredoka-SemiBold.ttf", "Fredoka", "normal");
    doc.addFileToVFS("Quicksand-Medium.ttf", A.quicksand); doc.addFont("Quicksand-Medium.ttf", "Quicksand", "normal");
    doc.addFileToVFS("Quicksand-Bold.ttf", A.quicksandBold); doc.addFont("Quicksand-Bold.ttf", "Quicksand", "bold");
    await carregarKanji();
    const logo = await logoCanvas(), selo = await seloCanvas();
    const pages = paginate(chars, opts);
    const cache = new Map(), bands = new Map();
    let done = 0; const total = chars.length;
    const eyeImg = (ch, side) => {
      const s = sideMatters(ch) ? side : 0, key = ch._id + "_" + s;
      if (!cache.has(key)) cache.set(key, { key, data: renderEye(ch, s, EYE_PX, { background: "#FFFFFF" }).toDataURL("image/jpeg", 0.95) });
      return cache.get(key);
    };
    const P = {
      logo, logoRatio: logo.width / logo.height, selo, seloRatio: selo ? selo.width / selo.height : 1,
      // logo e selo entram como vetor (cores sólidas), direto dos SVGs de logo.js
      image(img, x, y, w, h, key) { svgNoPdf(doc, key === "selo" ? window.SININT_SELO_SVG : window.SININT_LOGO_SVG, x, y, h); },
      text(t, x, y, o) {
        doc.setFont(o.font, o.bold ? "bold" : "normal"); doc.setFontSize(o.size); doc.setTextColor(o.color);
        doc.text(t, x, y, { align: o.align || "left", charSpace: o.charSpace || 0 });
      },
      textWidth(t, font, size, bold) { doc.setFont(font, bold ? "bold" : "normal"); doc.setFontSize(size); return doc.getTextWidth(t); },
      band(x, y, w, h, hc) {
        if (!bands.has(hc)) bands.set(hc, bandCanvas(hc).toDataURL("image/jpeg", 0.95));
        doc.saveGraphicsState(); doc.roundedRect(x, y, w, h, h / 2, h / 2, null); doc.clip(); doc.discardPath();
        doc.addImage(bands.get(hc), "JPEG", x, y, w, h, "band" + hc); doc.restoreGraphicsState();
      },
      // pesponto branco a 42% sobre a faixa: como a faixa é um degradê, o contorno é desenhado em fatias
      // verticais (recorte), cada uma com a cor já misturada; fatias vizinhas da mesma cor se juntam
      stitch(x, y, w, h, rad, fundo) {
        const passo = 0.5, lw = 0.45 * PT, fatias = [];
        for (let a = x - lw; a < x + w + lw; a += passo) {
          const cor = misturar("#FFFFFF", fundo(a + passo / 2), 0.42), u = fatias[fatias.length - 1];
          if (u && u.cor === cor) u.b = a + passo; else fatias.push({ a, b: a + passo, cor });
        }
        doc.setLineWidth(lw); doc.setLineDashPattern([2.2 * PT, 1.8 * PT], 0);
        fatias.forEach(f => {
          doc.saveGraphicsState(); doc.rect(f.a, y - 1, f.b - f.a, h + 2, null); doc.clip(); doc.discardPath();
          doc.setDrawColor(f.cor); doc.roundedRect(x, y, w, h, rad, rad, "S"); doc.restoreGraphicsState();
        });
        doc.setLineDashPattern([], 0);
      },
      poly(pts, color, alpha, fundo) {
        doc.saveGraphicsState(); doc.setFillColor(misturar(color, fundo || "#FFFFFF", alpha));
        const lines = pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]]);
        doc.lines(lines, pts[0][0], pts[0][1], [1, 1], "F", true); doc.restoreGraphicsState();
      },
      pill(x, y, w, h, color) { doc.setFillColor(color); doc.roundedRect(x, y, w, h, h / 2, h / 2, "F"); },
      eye(img, cx, cy, d) {
        const r = d / 2;
        doc.saveGraphicsState(); doc.circle(cx, cy, r, null); doc.clip(); doc.discardPath();
        doc.addImage(img.data, "JPEG", cx - r, cy - r, d, d, img.key); doc.restoreGraphicsState();
      },
      line(x1, y1, x2, y2, color, w) { doc.setDrawColor(color); doc.setLineWidth(w); doc.line(x1, y1, x2, y2); },
    };
    for (let i = 0; i < pages.length; i++) {
      if (i) doc.addPage();
      drawPage(P, pages[i], eyeImg);
      done = Math.min(total, done + pages[i].blocks.length);
      if (onProgress) onProgress(i + 1, pages.length);
      await new Promise(r => setTimeout(r, 0));   // deixa a tela respirar
    }
    const temas = [...new Set(chars.map(c => c.theme))];
    const titulo = opts.title || (temas.length === 1 ? "Olhinhos " + temas[0] : "Olhinhos");
    doc.setProperties({ title: titulo + " – Sinint amigurumis", creator: "Gerador de olhinhos Sinint" });
    return doc;
  }

  // ---------- prévia da folha em canvas ----------
  function drawPreview(canvas, page, scale) {
    const ctx = canvas.getContext("2d"), A = window.SININT_ASSETS;
    canvas.width = Math.round(W * scale); canvas.height = Math.round(H * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
    const eyes = new Map();
    const eyeImg = (ch, side) => {
      const s = sideMatters(ch) ? side : 0, key = ch._id + "_" + s + "_" + (ch._v || 0);
      if (!eyes.has(key)) eyes.set(key, renderEye(ch, s, Math.max(48, Math.round(12 * scale * 2))));
      return eyes.get(key);
    };
    const fontCss = (o) => `${o.bold ? 700 : (o.font === "Fredoka" ? 600 : 500)} ${o.size * PT}px ${o.font === "Fredoka" ? "SinintFredoka" : "SinintQuicksand"}`;
    const P = {
      logo: drawPreview._logo, logoRatio: drawPreview._logo ? drawPreview._logo.width / drawPreview._logo.height : 1,
      selo: drawPreview._selo, seloRatio: drawPreview._selo ? drawPreview._selo.width / drawPreview._selo.height : 1,
      image(img, x, y, w, h) { ctx.drawImage(img, x, y, w, h); },
      text(t, x, y, o) {
        ctx.font = fontCss(o); ctx.fillStyle = o.color; ctx.textAlign = o.align || "left"; ctx.textBaseline = "alphabetic";
        if (o.charSpace) { try { ctx.letterSpacing = o.charSpace + "px"; } catch (e) { } }
        ctx.fillText(t, x, y); try { ctx.letterSpacing = "0px"; } catch (e) { }
      },
      textWidth(t, font, size, bold) { ctx.font = fontCss({ font, size, bold }); return ctx.measureText(t).width; },
      band(x, y, w, h, hc) {
        const g = ctx.createLinearGradient(x, 0, x + w, 0);
        bandStops(hc).forEach(([t, cor]) => g.addColorStop(t, cor));
        ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill();
      },
      stitch(x, y, w, h, rad) {
        ctx.save(); ctx.strokeStyle = "rgba(255,255,255,.42)"; ctx.lineWidth = 0.45 * PT; ctx.setLineDash([2.2 * PT, 1.8 * PT]);
        ctx.beginPath(); ctx.roundRect(x, y, w, h, rad); ctx.stroke(); ctx.restore();
      },
      poly(pts, color, alpha) { ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill(); ctx.restore(); },
      pill(x, y, w, h, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill(); },
      eye(img, cx, cy, d) { ctx.drawImage(img, cx - d / 2, cy - d / 2, d, d); },
      line(x1, y1, x2, y2, color, w) { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); },
    };
    drawPage(P, page, eyeImg);
  }

  function loadImage(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }

  // fonte dos kanji (subset de Noto Serif JP Bold em assets-kanji.js) — precisa estar carregada antes de desenhar
  let kanjiPronto = null;
  function carregarKanji() {
    if (!kanjiPronto) kanjiPronto = (async () => {
      if (!window.SININT_KANJI || typeof FontFace === "undefined") return;
      try { const f = new FontFace("SinintKanji", `url(data:font/otf;base64,${window.SININT_KANJI})`, { weight: "700" }); await f.load(); document.fonts.add(f); } catch (e) { /* cai na fonte serifada do sistema */ }
    })();
    return kanjiPronto;
  }

  window.Olhos = { renderEye, paginate, buildPDF, drawPreview, loadImage, logoCanvas, seloCanvas, carregarKanji, bandStops, FORMAS, viv, sortKey, blockHeight, W, H, SPARK, GALAXY_DOTS };
})();
