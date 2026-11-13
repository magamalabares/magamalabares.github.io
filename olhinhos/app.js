/* Interface do gerador de olhinhos – Sinint amigurumis */
(function () {
  "use strict";
  const O = window.Olhos, A = window.SININT_ASSETS;
  const $ = (s, el = document) => el.querySelector(s);
  const el = (tag, attrs = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") e.className = v; else if (k === "text") e.textContent = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v);
    }
    kids.forEach(k => k != null && e.append(k)); return e;
  };
  const clone = o => JSON.parse(JSON.stringify(o));

  // ---------- caixa do app no lugar de alert() e confirm() ----------
  // caixa({ titulo, texto, ok, cancelar }) → Promise<boolean>; sem "cancelar" vira um aviso de um botão só.
  function caixa({ titulo, texto, ok = "OK", cancelar = null }) {
    const d = $("#caixa");
    $("#caixa-titulo").textContent = titulo; $("#caixa-texto").textContent = texto;
    $("#caixa-sim").textContent = ok;
    $("#caixa-nao").hidden = !cancelar; if (cancelar) $("#caixa-nao").textContent = cancelar;
    d.returnValue = "";
    return new Promise(res => {
      d.addEventListener("close", () => res(d.returnValue === "sim"), { once: true });
      d.showModal(); (cancelar ? $("#caixa-nao") : $("#caixa-sim")).focus();
    });
  }
  const avisar = (titulo, texto) => caixa({ titulo, texto });
  const norm = s => (s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();

  // ---------- estado ----------
  const STORE = "sinint_olhinhos_v1";
  const LIB = (window.SININT_LIB || []).map(c => ({ ...c, _id: "lib:" + c.theme + "|" + c.name, _v: 0 }));
  let state = { custom: [], sel: [], settings: { title: "", sizes: [12, 10], byTheme: true, alphabetical: true } };
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || "null");
    if (saved && typeof saved === "object") {
      if (Array.isArray(saved.custom)) state.custom = saved.custom.filter(validChar);
      if (Array.isArray(saved.sel)) state.sel = saved.sel;
      if (saved.settings) state.settings = { ...state.settings, ...saved.settings };
    }
  } catch (e) { /* sem armazenamento: segue sem lembrar */ }
  // Tamanhos disponíveis. Configurações antigas (com 9 mm, que saiu) caem para o que ainda existe.
  const TAMANHOS = [14, 12, 10, 8, 6];
  state.settings.sizes = (Array.isArray(state.settings.sizes) ? state.settings.sizes : []).map(Number).filter(s => TAMANHOS.includes(s));
  if (!state.settings.sizes.length) state.settings.sizes = [12, 10];
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { } };

  const allChars = () => [...state.custom, ...LIB];
  const byId = id => allChars().find(c => c._id === id);
  state.sel = state.sel.filter(s => byId(s.id));

  function validChar(c) {
    return c && typeof c.name === "string" && Array.isArray(c.colors) && c.colors.length >= 2 &&
      Array.isArray(c.stops) && c.stops.length === c.colors.length &&
      c.colors.every(x => /^#[0-9a-f]{6}$/i.test(x)) && c.stops.every(x => typeof x === "number" && x >= 0 && x <= 100);
  }

  // ---------- fontes da interface e da prévia ----------
  async function loadFonts() {
    const faces = [
      new FontFace("SinintFredoka", `url(data:font/ttf;base64,${A.fredoka})`, { weight: "600" }),
      new FontFace("SinintQuicksand", `url(data:font/ttf;base64,${A.quicksand})`, { weight: "500" }),
      new FontFace("SinintQuicksand", `url(data:font/ttf;base64,${A.quicksandBold})`, { weight: "700" }),
    ];
    await Promise.all(faces.map(f => f.load().then(ff => document.fonts.add(ff)).catch(() => { })));
  }

  // ---------- lista de personagens ----------
  function miniEyes(ch) {
    const box = el("span", { class: "mini", "aria-hidden": "true" });
    [0, 1].forEach(s => {
      const c = O.renderEye(ch, (ch.fx && (ch.fx.mist || ch.fx.gwen)) ? s : 0, 52);
      box.append(c);
    });
    return box;
  }
  function isSel(id) { return state.sel.some(s => s.id === id); }
  function toggle(id) {
    if (isSel(id)) state.sel = state.sel.filter(s => s.id !== id);
    else { const ch = byId(id); state.sel.push({ id, qty: ch.qty || 1 }); }
    save(); renderList(); renderSelected(); schedulePreview();
  }
  function renderList() {
    const q = norm($("#busca").value), lista = $("#lista");
    lista.textContent = "";
    const groups = [];
    if (state.custom.length) groups.push(["Meus personagens", state.custom, true]);
    const themes = [...new Set(LIB.map(c => c.theme))];
    themes.forEach(t => groups.push([t, LIB.filter(c => c.theme === t), false]));
    let any = false;
    groups.forEach(([title, list, mine]) => {
      const items = list.filter(c => !q || norm(c.name).includes(q) || norm(c.theme).includes(q) || norm(title).includes(q));
      if (!items.length) return; any = true;
      const sec = el("div", { class: "tema" });
      const allOn = items.every(c => isSel(c._id));
      sec.append(el("div", { class: "tema-cab" }, el("h3", { text: title }),
        el("button", {
          type: "button", text: allOn ? "tirar todos" : "selecionar todos", onclick: () => {
            if (allOn) state.sel = state.sel.filter(s => !items.some(c => c._id === s.id));
            else items.forEach(c => { if (!isSel(c._id)) state.sel.push({ id: c._id, qty: c.qty || 1 }); });
            save(); renderList(); renderSelected(); schedulePreview();
          }
        })));
      items.forEach(ch => {
        const sel = isSel(ch._id);
        const row = el("div", { class: "item" + (sel ? " sel" : ""), role: "checkbox", "aria-checked": String(sel), tabindex: "0", title: ch.theme || "" },
          el("span", { class: "check", "aria-hidden": "true", text: sel ? "✓" : "" }), miniEyes(ch), el("span", { class: "nome", text: ch.name }),
          el("button", { class: "acao", type: "button", text: mine ? "editar" : "editar cópia", onclick: (e) => { e.stopPropagation(); openEditor(ch); } }),
          mine ? el("button", {
            class: "acao", type: "button", text: "excluir", "aria-label": "Excluir " + ch.name, onclick: async (e) => {
              e.stopPropagation();
              if (!await caixa({ titulo: `Excluir ${ch.name}?`, texto: "O personagem sai de “Meus personagens” neste navegador.", ok: "Excluir", cancelar: "Cancelar" })) return;
              state.custom = state.custom.filter(c => c._id !== ch._id); state.sel = state.sel.filter(s => s.id !== ch._id);
              save(); renderList(); renderSelected(); schedulePreview(); fillThemes();
            }
          }) : null);
        row.addEventListener("click", () => toggle(ch._id));
        row.addEventListener("keydown", e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(ch._id); } });
        sec.append(row);
      });
      lista.append(sec);
    });
    if (!any) lista.append(el("p", { class: "vazio", text: "Nenhum personagem encontrado." }));
  }

  // ---------- selecionados ----------
  function renderSelected() {
    const box = $("#selecionados"); box.textContent = "";
    state.sel.forEach(s => {
      const ch = byId(s.id); if (!ch) return;
      box.append(el("span", { class: "chip", style: `background:${ch.band}` }, ch.name,
        el("button", { type: "button", title: "Quantidade de olhinhos", text: s.qty === 2 ? "2×" : "1×", onclick: () => { s.qty = s.qty === 2 ? 1 : 2; save(); renderSelected(); schedulePreview(); } }),
        el("button", { type: "button", "aria-label": "Remover " + ch.name, text: "✕", onclick: () => toggle(s.id) })));
    });
    $("#btn-pdf").disabled = !state.sel.length;
  }

  // ---------- prévia da folha ----------
  let pages = [], pageIdx = 0, prevTimer = 0;
  const opts = () => ({ ...state.settings });
  const selectedChars = () => state.sel.map(s => { const ch = byId(s.id); return ch ? { ...ch, qty: s.qty } : null; }).filter(Boolean);
  function schedulePreview() { cancelAnimationFrame(prevTimer); prevTimer = requestAnimationFrame(renderPreview); }
  function renderPreview() {
    const chars = selectedChars(), cv = $("#previa");
    pages = chars.length ? O.paginate(chars, opts()) : [];
    $("#vazio").hidden = !!pages.length; cv.hidden = !pages.length;
    if (!pages.length) { $("#pag-info").textContent = "—"; return; }
    pageIdx = Math.max(0, Math.min(pageIdx, pages.length - 1));
    $("#pag-info").textContent = `Folha ${pageIdx + 1} de ${pages.length}`;
    $("#prev").disabled = pageIdx === 0; $("#next").disabled = pageIdx === pages.length - 1;
    const w = cv.parentElement.clientWidth - 24, scale = Math.max(1.5, (w * (window.devicePixelRatio || 1)) / O.W);
    O.drawPreview(cv, pages[pageIdx], Math.min(scale, 8));
  }

  // ---------- PDF ----------
  async function makePDF() {
    const btn = $("#btn-pdf"), chars = selectedChars(); if (!chars.length) return;
    btn.disabled = true; const old = btn.textContent;
    try {
      const doc = await O.buildPDF(chars, opts(), (i, n) => { btn.textContent = `Gerando folha ${i} de ${n}…`; });
      const themes = [...new Set(chars.map(c => c.theme))];
      const base = state.settings.title || (state.settings.byTheme && themes.length === 1 ? themes[0] : "olhinhos");
      const slug = norm(base).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "olhinhos";
      doc.save(`olhinhos_${slug}.pdf`.replace("olhinhos_olhinhos", "olhinhos"));
    } catch (e) { console.error(e); avisar("Não deu para gerar o PDF", "Tente de novo. Se continuar, recarregue a página."); }
    finally { btn.textContent = old; btn.disabled = !state.sel.length; }
  }

  // ---------- editor ----------
  const EFFECTS = [
    { key: "cres", label: "Meia-lua clara na base", def: d => ({ color: d.colors[d.colors.length - 1], a: .55, h: .34 }),
      params: [["color", "Cor"], ["a", "Intensidade", 0, 1, .05], ["h", "Altura", .1, .5, .01]] },
    { key: "top", label: "Sombra suave no topo", def: d => ({ color: d.colors[0], a: .2, f: .2 }),
      params: [["color", "Cor"], ["a", "Intensidade", 0, .6, .02], ["f", "Tamanho", .08, .4, .01]] },
    { key: "glow", label: "Brilho esfumado no centro", def: d => ({ color: d.colors[Math.floor(d.colors.length / 2)], peak: .45, size: .62, oy: 0 }), list: true,
      params: [["color", "Cor"], ["peak", "Intensidade", 0, .8, .02], ["size", "Tamanho", .3, 1, .02], ["oy", "Altura (− desce, + sobe)", -.5, .5, .02]] },
    { key: "mist", label: "Névoa nas bordas", def: () => ({ color: "#1A1030", peak: .6, from: 30, to: 150 }),
      params: [["color", "Cor"], ["peak", "Intensidade", 0, 1, .02], ["from", "De (graus)", 0, 360, 5], ["to", "Até (graus)", 0, 360, 5]] },
    { key: "rim", label: "Borda escura esfumada", def: d => ({ color: d.colors[0], peak: .35, w: .12 }),
      params: [["color", "Cor"], ["peak", "Intensidade", 0, .9, .02], ["w", "Largura", .05, .3, .01]] },
    { key: "octo", label: "Anéis octogonais suaves", def: d => ({ color: d.colors[0], peak: .22, rings: [.48, .72] }),
      params: [["color", "Cor"], ["peak", "Intensidade", 0, .6, .02]] },
    { key: "gwen", label: "Estrelas esfumadas (escura num olho, rosa no outro)", def: () => true, params: [] },
  ];
  let draft = null, editing = null, link = {};
  const dlg = $("#editor");

  function defaultDraft() {
    const colors = ["#1E3A6E", "#2E5EA8", "#4A86D4", "#74AEEA", "#A8D2F6", "#D6ECFC"];
    return { name: "", theme: "", colors, stops: [0, 18, 40, 62, 82, 100], band: colors[3], qty: 1,
      fx: { cres: { color: colors[5], a: .55, h: .34 }, top: { color: colors[0], a: .2, f: .2 } } };
  }
  function openEditor(ch) {
    editing = ch && ch._id.startsWith("meu:") ? ch._id : null;
    draft = ch ? clone({ ...ch, _id: undefined, _v: undefined }) : defaultDraft();
    draft.fx = draft.fx || {};
    // cores "ligadas": seguem o degradê até a pessoa mudar manualmente
    const last = draft.colors.length - 1, mid = Math.floor(draft.colors.length / 2);
    link = { top: !!draft.fx.top && draft.fx.top.color === draft.colors[0],
      cres: !!draft.fx.cres && draft.fx.cres.color === draft.colors[last],
      band: !ch || draft.band === draft.colors[mid] };
    $("#ed-titulo").textContent = editing ? `Editar ${ch.name}` : ch ? `Nova versão de ${ch.name}` : "Novo personagem";
    $("#ed-salvar").textContent = editing ? "Salvar alterações" : "Salvar em meus personagens";
    $("#ed-nome").value = draft.name; $("#ed-tema").value = draft.theme || ""; fillThemes();
    $("#ed-faixa-cor").value = draft.band;
    document.querySelectorAll('input[name="ed-qty"]').forEach(r => r.checked = Number(r.value) === (draft.qty || 1));
    $("#ed-erro").textContent = "";
    buildStops(); buildEffects(); updateEditorPreview();
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    $("#ed-nome").focus();
  }
  function syncLinked(rebuild) {
    const last = draft.colors.length - 1, mid = Math.floor(draft.colors.length / 2);
    if (link.top && draft.fx.top) draft.fx.top.color = draft.colors[0];
    if (link.cres && draft.fx.cres) draft.fx.cres.color = draft.colors[last];
    if (link.band) { draft.band = draft.colors[mid]; $("#ed-faixa-cor").value = draft.band.toLowerCase(); }
    if (rebuild) buildEffects();
  }
  function buildStops() {
    const box = $("#ed-cores"); box.textContent = "";
    draft.colors.forEach((c, i) => {
      const color = el("input", { type: "color", value: c.toLowerCase(), "aria-label": `Cor ${i + 1}` });
      const hex = el("input", { type: "text", value: c.toUpperCase(), maxlength: "7", "aria-label": `Código da cor ${i + 1}` });
      const pos = el("input", { type: "number", min: "0", max: "100", step: "0.5", value: String(draft.stops[i]), "aria-label": `Posição da cor ${i + 1} em %` });
      color.addEventListener("input", () => { draft.colors[i] = color.value.toUpperCase(); hex.value = draft.colors[i]; syncLinked(false); updateEditorPreview(); });
      color.addEventListener("change", () => syncLinked(true));
      hex.addEventListener("input", () => { const v = hex.value.trim(); if (/^#?[0-9a-f]{6}$/i.test(v)) { draft.colors[i] = ("#" + v.replace("#", "")).toUpperCase(); color.value = draft.colors[i].toLowerCase(); syncLinked(true); updateEditorPreview(); } });
      pos.addEventListener("input", () => { const v = parseFloat(pos.value); if (!isNaN(v)) { draft.stops[i] = Math.max(0, Math.min(100, v)); updateEditorPreview(); } });
      const rm = el("button", { class: "rm", type: "button", "aria-label": `Remover cor ${i + 1}`, text: "✕", onclick: () => { if (draft.colors.length <= 2) return; draft.colors.splice(i, 1); draft.stops.splice(i, 1); syncLinked(true); buildStops(); updateEditorPreview(); } });
      box.append(el("div", { class: "cor-linha" }, color, hex, el("label", { class: "param" }, pos), rm));
    });
  }
  function buildEffects() {
    const fs = $("#ed-efeitos"); fs.querySelectorAll(".efeito").forEach(n => n.remove());
    EFFECTS.forEach(E => {
      const on = !!draft.fx[E.key];
      const wrap = el("div", { class: "efeito" });
      const cb = el("input", { type: "checkbox" }); cb.checked = on;
      const params = el("div", { class: "params" + (on ? "" : " off") });
      const get = () => E.list ? (draft.fx[E.key] || [])[0] : draft.fx[E.key];
      const fill = () => {
        params.textContent = ""; const obj = get(); if (!obj || obj === true) return;
        E.params.forEach(([k, label, mn, mx, st]) => {
          let input;
          if (k === "color") {
            input = el("input", { type: "color", value: obj.color.toLowerCase() });
            input.addEventListener("input", () => { obj.color = input.value.toUpperCase(); if (E.key in link) link[E.key] = false; updateEditorPreview(); });
          } else {
            input = el("input", { type: "range", min: String(mn), max: String(mx), step: String(st), value: String(obj[k]) });
            input.addEventListener("input", () => { obj[k] = parseFloat(input.value); updateEditorPreview(); });
          }
          params.append(el("label", { class: "param" }, label, input));
        });
      };
      cb.addEventListener("change", () => {
        if (cb.checked) { const v = E.def(draft); draft.fx[E.key] = E.list ? [v] : v; if (E.key === "top" || E.key === "cres") link[E.key] = true; } else delete draft.fx[E.key];
        params.classList.toggle("off", !cb.checked); fill(); updateEditorPreview();
      });
      fill();
      wrap.append(el("label", { class: "mg-check" }, cb, el("span", { text: E.label })), params);
      fs.append(wrap);
    });
  }
  let edTimer = 0;
  function updateEditorPreview() {
    cancelAnimationFrame(edTimer);
    edTimer = requestAnimationFrame(() => {
      const ch = { ...draft, name: $("#ed-nome").value || "NOME" };
      const g = ch.colors.map((c, i) => `${O.viv(c)} ${ch.stops[i]}%`).join(", ");
      $("#ed-barra").style.background = `linear-gradient(90deg, ${g})`;
      [["#ed-o0", 0], ["#ed-o1", 1]].forEach(([id, s]) => { const cv = $(id), x = cv.getContext("2d"); x.clearRect(0, 0, cv.width, cv.height); x.drawImage(O.renderEye(ch, s, cv.width), 0, 0); });
      [["#ed-r0", 0], ["#ed-r1", 1]].forEach(([id, s]) => { const cv = $(id), x = cv.getContext("2d"); x.clearRect(0, 0, cv.width, cv.height); x.drawImage(O.renderEye(ch, s, cv.width), 0, 0); });
      const f = $("#ed-faixa"); f.style.background = draft.band; f.textContent = (ch.name || "NOME").toUpperCase();
    });
  }
  function saveEditor() {
    const name = $("#ed-nome").value.trim().toUpperCase();
    if (!name) { $("#ed-erro").textContent = "Dê um nome ao personagem."; $("#ed-nome").focus(); return; }
    draft.name = name; draft.theme = $("#ed-tema").value.trim() || "Meus personagens";
    draft.qty = Number((document.querySelector('input[name="ed-qty"]:checked') || {}).value || 1);
    if (!validChar(draft)) { $("#ed-erro").textContent = "Confira as cores: use códigos como #A1B2C3 e posições entre 0 e 100."; return; }
    if (editing) {
      const i = state.custom.findIndex(c => c._id === editing);
      const prevV = state.custom[i]._v || 0;
      state.custom[i] = { ...clone(draft), _id: editing, _v: prevV + 1 };
    } else {
      const id = "meu:" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      state.custom.unshift({ ...clone(draft), _id: id, _v: 0 });
      state.sel.push({ id, qty: draft.qty });
    }
    save(); dlg.close(); renderList(); renderSelected(); schedulePreview(); fillThemes();
  }
  // sugestões de tema em pílulas (no lugar do <datalist>, que não aceita estilo)
  function fillThemes() {
    const box = $("#temas"); box.textContent = "";
    const atual = $("#ed-tema").value.trim();
    [...new Set(allChars().map(c => c.theme).filter(Boolean))].forEach(t => box.append(el("button", {
      type: "button", class: "ol-tema-sug" + (t === atual ? " ativo" : ""), text: t, "aria-pressed": String(t === atual),
      onclick: () => { $("#ed-tema").value = t; fillThemes(); }
    })));
  }

  // ---------- exportar / importar ----------
  function exportCustom() {
    if (!state.custom.length) { avisar("Nada para exportar", "Você ainda não criou personagens."); return; }
    const data = state.custom.map(c => { const { _id, _v, ...rest } = c; return rest; });
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
    const a = el("a", { href: URL.createObjectURL(blob), download: "meus_olhinhos.json" });
    document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function importCustom(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const arr = JSON.parse(r.result); if (!Array.isArray(arr)) throw 0;
        let n = 0;
        arr.forEach(c => {
          if (!validChar(c)) return;
          const clean = { name: String(c.name).slice(0, 24).toUpperCase(), theme: String(c.theme || "Meus personagens").slice(0, 40), colors: c.colors, stops: c.stops,
            band: /^#[0-9a-f]{6}$/i.test(c.band) ? c.band : c.colors[Math.floor(c.colors.length / 2)], qty: c.qty === 2 ? 2 : 1, fx: typeof c.fx === "object" && c.fx ? c.fx : {} };
          state.custom.push({ ...clean, _id: "meu:" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), _v: 0 }); n++;
        });
        save(); renderList(); fillThemes();
        if (n) avisar("Importado", n === 1 ? "1 personagem foi para “Meus personagens”." : `${n} personagens foram para “Meus personagens”.`);
        else avisar("Nada importado", "Nenhum personagem válido no arquivo.");
      } catch (e) { avisar("Arquivo inválido", "Use um arquivo .json exportado por este gerador."); }
    };
    r.readAsText(file);
  }

  // ---------- ligações ----------
  function bind() {
    $("#busca").addEventListener("input", renderList);
    $("#btn-novo").addEventListener("click", () => openEditor(null));
    $("#btn-limpar").addEventListener("click", () => { state.sel = []; save(); renderList(); renderSelected(); schedulePreview(); });
    $("#btn-pdf").addEventListener("click", makePDF);
    $("#prev").addEventListener("click", () => { pageIdx--; renderPreview(); });
    $("#next").addEventListener("click", () => { pageIdx++; renderPreview(); });
    $("#titulo").value = state.settings.title;
    $("#titulo").addEventListener("input", e => { state.settings.title = e.target.value; save(); schedulePreview(); });
    document.querySelectorAll(".tamanhos input").forEach(cb => {
      cb.checked = state.settings.sizes.includes(Number(cb.value));
      cb.addEventListener("change", () => {
        const s = [...document.querySelectorAll(".tamanhos input:checked")].map(x => Number(x.value));
        if (!s.length) { cb.checked = true; return; }
        state.settings.sizes = s; save(); schedulePreview();
      });
    });
    $("#por-tema").checked = state.settings.byTheme;
    $("#por-tema").addEventListener("change", e => { state.settings.byTheme = e.target.checked; save(); pageIdx = 0; schedulePreview(); });
    $("#alfabetica").checked = state.settings.alphabetical;
    $("#alfabetica").addEventListener("change", e => { state.settings.alphabetical = e.target.checked; save(); schedulePreview(); });
    $("#btn-exportar").addEventListener("click", exportCustom);
    $("#importar").addEventListener("change", e => { if (e.target.files[0]) importCustom(e.target.files[0]); e.target.value = ""; });
    $("#ed-salvar").addEventListener("click", saveEditor);
    $("#ed-nome").addEventListener("input", updateEditorPreview);
    $("#ed-tema").addEventListener("input", fillThemes);
    $("#ed-add").addEventListener("click", () => {
      const i = draft.colors.length - 1; draft.colors.splice(i, 0, draft.colors[i]); draft.stops.splice(i, 0, Math.max(0, draft.stops[i] - 5));
      syncLinked(true); buildStops(); updateEditorPreview();
    });
    $("#ed-distribuir").addEventListener("click", () => { const n = draft.colors.length; draft.stops = draft.colors.map((_, i) => Math.round(i / (n - 1) * 1000) / 10); buildStops(); updateEditorPreview(); });
    $("#ed-faixa-cor").addEventListener("input", e => { draft.band = e.target.value.toUpperCase(); link.band = false; updateEditorPreview(); });
    $("#ed-faixa-auto").addEventListener("click", () => { link.band = true; draft.band = draft.colors[Math.floor(draft.colors.length / 2)]; $("#ed-faixa-cor").value = draft.band.toLowerCase(); updateEditorPreview(); });
    window.addEventListener("resize", schedulePreview);
  }

  (async function init() {
    await loadFonts();
    try { O.drawPreview._logo = await O.logoCanvas(); O.drawPreview._selo = await O.seloCanvas(); } catch (e) { }
    bind(); fillThemes(); renderList(); renderSelected(); renderPreview();
  })();
})();
