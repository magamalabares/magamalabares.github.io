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
  const EYE_PX = 720;                   // resolução de cada olho (≈1500 DPI em 12 mm)

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
    const cv = makeCanvas(px), ctx = cv.getContext("2d"), r = px / 2, fx = ch.fx || {};
    if (opts.background) { ctx.fillStyle = opts.background; ctx.fillRect(0, 0, px, px); }
    ctx.save();
    ctx.beginPath(); ctx.arc(r, r, r, 0, Math.PI * 2); ctx.clip();
    // degradê principal
    const g = ctx.createLinearGradient(0, 0, 0, px);
    ch.colors.forEach((c, i) => g.addColorStop(Math.max(0, Math.min(1, ch.stops[i] / 100)), viv(c)));
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
        if (side === 1) ang = Math.PI - ang;
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
    return cv;
  }
  const sideMatters = ch => !!(ch.fx && (ch.fx.mist || ch.fx.gwen));

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
    // topo: logo + título
    if (P.logo) P.image(P.logo, 6, 5, 9 * P.logoRatio, 9, "logo");
    // rodapé: selo "S★" (7 × 7 mm) no canto direito, à altura da régua
    if (P.selo) P.image(P.selo, W - 5 - 7, H - 5 - 7, 7, 7, "selo");
    if (page.title) P.text(page.title, W - 6, 11.6, { font: "Fredoka", size: 13, color: BROWN, align: "right" });
    if (page.total > 1) P.text(`folha ${page.index} de ${page.total}`, W - 6, 15.2, { font: "Quicksand", size: 7.5, color: BROWN, align: "right" });
    page.blocks.forEach(({ ch, y }) => {
      const hc = ch.band;
      // faixa do nome
      const x0 = 6, x1 = W - 6, hgt = 8;
      P.band(x0, y, x1 - x0, hgt, hc);
      P.stitch(x0 + 1.1, y + 1.1, x1 - x0 - 2.2, hgt - 2.2, 2.9);
      const cs = 0.8 * PT, size = 13.5;
      const tw = P.textWidth(ch.name, "Fredoka", size) + cs * (ch.name.length - 1);
      P.text(ch.name, W / 2 - tw / 2, y + hgt / 2 + 1.65, { font: "Fredoka", size, color: "#FFFFFF", charSpace: cs });
      resto = cs;
      [-1, 1].forEach(sx => {
        P.poly(sparklePts(W / 2 + sx * (tw / 2 + 4.2), y + hgt / 2, 1.05), "#FFFFFF", 0.85);
        P.poly(sparklePts(W / 2 + sx * (tw / 2 + 7), y + hgt / 2 - 0.3, 0.6), "#FFFFFF", 0.5);
      });
      // linhas de olhos
      let yy = y + 8 + 3.5;
      const rows = blockRows(ch, page.sizes);
      rows.forEach((s, k) => {
        const cy = yy + s / 2;
        P.pill(4, cy - 2.5, 12, 5, hc);
        centro(`${s}MM`, 10, cy + 0.8, { font: "Quicksand", bold: true, size: 6.6, color: "#FFFFFF" });
        // Até 12 mm a grade é a do script Python (olhos do par a 14 mm de distância).
        // Acima disso o par se abre para sobrar 2 mm entre os dois olhos, sem encostar.
        const abre = Math.max(0, (s + 2 - 14) / 2);
        CENTERS.forEach(([a, b]) => { P.eye(eyeImg(ch, 0), a - abre, cy, s); P.eye(eyeImg(ch, 1), b + abre, cy, s); });
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

  // Logo obrigatória e selo do rodapé (SVGs em logo.js) desenhados em canvas de alta resolução:
  // logo 2200 × 300 px (~850 DPI nos 66 × 9 mm), selo 600 × 600 px (~2200 DPI nos 7 × 7 mm).
  const svgCache = {};
  function svgCanvas(svg, w, h) {
    if (!svgCache[svg]) svgCache[svg] = loadImage("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg)).then(img => {
      const c = makeCanvas(w, h); c.getContext("2d").drawImage(img, 0, 0, w, h); return c;
    });
    return svgCache[svg];
  }
  const logoCanvas = () => svgCanvas(window.SININT_LOGO_SVG, 2200, 300);
  const seloCanvas = () => window.SININT_SELO_SVG ? svgCanvas(window.SININT_SELO_SVG, 600, 600) : Promise.resolve(null);

  function bandCanvas(hc) {
    const c = makeCanvas(1200, 48), x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 1200, 0);
    g.addColorStop(0, lighten(hc, .16)); g.addColorStop(.3, hc); g.addColorStop(.7, hc); g.addColorStop(1, lighten(hc, .16));
    x.fillStyle = g; x.fillRect(0, 0, 1200, 48); return c;
  }

  // ---------- PDF ----------
  async function buildPDF(chars, opts, onProgress) {
    const { jsPDF } = window.jspdf, A = window.SININT_ASSETS;
    const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
    doc.addFileToVFS("Fredoka-SemiBold.ttf", A.fredoka); doc.addFont("Fredoka-SemiBold.ttf", "Fredoka", "normal");
    doc.addFileToVFS("Quicksand-Medium.ttf", A.quicksand); doc.addFont("Quicksand-Medium.ttf", "Quicksand", "normal");
    doc.addFileToVFS("Quicksand-Bold.ttf", A.quicksandBold); doc.addFont("Quicksand-Bold.ttf", "Quicksand", "bold");
    const logo = await logoCanvas(), selo = await seloCanvas();
    const png = new Map();
    const pngDe = c => { if (!png.has(c)) png.set(c, c.toDataURL("image/png")); return png.get(c); };
    const pages = paginate(chars, opts);
    const cache = new Map(), bands = new Map();
    let done = 0; const total = chars.length;
    const eyeImg = (ch, side) => {
      const s = sideMatters(ch) ? side : 0, key = ch._id + "_" + s;
      if (!cache.has(key)) cache.set(key, { key, data: renderEye(ch, s, EYE_PX, { background: "#FFFFFF" }).toDataURL("image/jpeg", 0.95) });
      return cache.get(key);
    };
    const gs = (o) => new doc.GState(o);
    const P = {
      logo, logoRatio: logo.width / logo.height, selo,
      image(img, x, y, w, h, key) { doc.addImage(pngDe(img), "PNG", x, y, w, h, key); },
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
      stitch(x, y, w, h, rad) {
        doc.saveGraphicsState(); doc.setGState(gs({ "stroke-opacity": 0.42 }));
        doc.setDrawColor("#FFFFFF"); doc.setLineWidth(0.45 * PT); doc.setLineDashPattern([2.2 * PT, 1.8 * PT], 0);
        doc.roundedRect(x, y, w, h, rad, rad, "S"); doc.setLineDashPattern([], 0); doc.restoreGraphicsState();
      },
      poly(pts, color, alpha) {
        doc.saveGraphicsState(); doc.setGState(gs({ opacity: alpha })); doc.setFillColor(color);
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
      drawPage(P, pages[i], (ch, side) => { const im = eyeImg(ch, side); return im; });
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
      logo: drawPreview._logo, logoRatio: drawPreview._logo ? drawPreview._logo.width / drawPreview._logo.height : 1, selo: drawPreview._selo,
      image(img, x, y, w, h) { ctx.drawImage(img, x, y, w, h); },
      text(t, x, y, o) {
        ctx.font = fontCss(o); ctx.fillStyle = o.color; ctx.textAlign = o.align || "left"; ctx.textBaseline = "alphabetic";
        if (o.charSpace) { try { ctx.letterSpacing = o.charSpace + "px"; } catch (e) { } }
        ctx.fillText(t, x, y); try { ctx.letterSpacing = "0px"; } catch (e) { }
      },
      textWidth(t, font, size, bold) { ctx.font = fontCss({ font, size, bold }); return ctx.measureText(t).width; },
      band(x, y, w, h, hc) {
        const g = ctx.createLinearGradient(x, 0, x + w, 0);
        g.addColorStop(0, lighten(hc, .16)); g.addColorStop(.3, hc); g.addColorStop(.7, hc); g.addColorStop(1, lighten(hc, .16));
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

  window.Olhos = { renderEye, paginate, buildPDF, drawPreview, loadImage, logoCanvas, seloCanvas, viv, sortKey, blockHeight, W, H };
})();
