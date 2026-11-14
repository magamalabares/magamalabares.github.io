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
  // linha dividida: liga as duas metades aos personagens da biblioteca
  LIB.forEach(c => { if (Array.isArray(c.split)) c._metades = c.split.map(id => LIB.find(x => x._id === "lib:" + id)).filter(Boolean); if (c._metades && c._metades.length !== 2) delete c._metades; });
  const bandCss = b => b.includes("|") ? `linear-gradient(90deg, ${b.split("|")[0]} 44%, ${b.split("|")[1]} 56%)` : b;
  // editados: personagens da biblioteca alterados pela própria pessoa ({ id: dados }); "restaurar padrão" apaga a entrada
  let state = { custom: [], sel: [], editados: {}, settings: { title: "", sizes: [12, 10], byTheme: true, alphabetical: true, ocultos: [] } };
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || "null");
    if (saved && typeof saved === "object") {
      if (Array.isArray(saved.custom)) state.custom = saved.custom.filter(validChar);
      if (Array.isArray(saved.sel)) state.sel = saved.sel;
      if (saved.settings) state.settings = { ...state.settings, ...saved.settings };
      if (saved.editados && typeof saved.editados === "object")
        Object.entries(saved.editados).forEach(([id, c]) => { if (validChar(c) && LIB.some(x => x._id === id)) state.editados[id] = c; });
    }
  } catch (e) { /* sem armazenamento: segue sem lembrar */ }
  if (!Array.isArray(state.settings.ocultos)) state.settings.ocultos = [];
  // versão original de cada personagem da biblioteca, para restaurar
  const ORIGINAL = new Map(LIB.map(c => [c._id, c]));
  let versao = 0;   // muda a chave do cache das miniaturas a cada edição/restauração
  function aplicarEdicao(id) {
    const i = LIB.findIndex(c => c._id === id), orig = ORIGINAL.get(id), ed = state.editados[id];
    LIB[i] = ed ? { ...clone(ed), theme: orig.theme, _id: id, _v: ++versao, _editado: true } : { ...orig, _v: ++versao };
  }
  Object.keys(state.editados).forEach(aplicarEdicao);
  // Tamanhos disponíveis. Configurações antigas (com 9 mm, que saiu) caem para o que ainda existe.
  const TAMANHOS = [14, 12, 10, 8, 6];
  state.settings.sizes = (Array.isArray(state.settings.sizes) ? state.settings.sizes : []).map(Number).filter(s => TAMANHOS.includes(s));
  if (!state.settings.sizes.length) state.settings.sizes = [12, 10];
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { } };

  const allChars = () => [...state.custom, ...LIB];
  const byId = id => allChars().find(c => c._id === id);
  state.sel = state.sel.filter(s => byId(s.id));

  // declarações de função (içadas): são usadas ao ler o que ficou salvo, antes deste ponto do arquivo
  function degradeOk(cols, st) {
    return Array.isArray(cols) && cols.length >= 2 && Array.isArray(st) && st.length === cols.length &&
      cols.every(x => /^#[0-9a-f]{6}$/i.test(x)) && st.every(x => typeof x === "number" && x >= 0 && x <= 100);
  }
  function validChar(c) {
    return !!c && typeof c.name === "string" && degradeOk(c.colors, c.stops) &&
      (c.colors2 == null || degradeOk(c.colors2, c.stops2)) &&
      (c.camadas == null || (Array.isArray(c.camadas) && c.camadas.every(l => l && typeof l.t === "string")));
  }

  // ---------- fontes da interface e da prévia ----------
  async function loadFonts() {
    const faces = [
      new FontFace("SinintFredoka", `url(data:font/ttf;base64,${A.fredoka})`, { weight: "600" }),
      new FontFace("SinintQuicksand", `url(data:font/ttf;base64,${A.quicksand})`, { weight: "500" }),
      new FontFace("SinintQuicksand", `url(data:font/ttf;base64,${A.quicksandBold})`, { weight: "700" }),
    ];
    await Promise.all(faces.map(f => f.load().then(ff => document.fonts.add(ff)).catch(() => { })).concat(O.carregarKanji()));
  }

  // ---------- lista de personagens ----------
  const miniCache = new Map();
  function miniEyes(ch) {
    const box = el("span", { class: "mini", "aria-hidden": "true" }), key = ch._id + "_" + (ch._v || 0);
    if (!miniCache.has(key)) miniCache.set(key, [0, 1].map(s => O.renderEye(ch, s, 52).toDataURL()));
    miniCache.get(key).forEach(src => box.append(el("img", { src, alt: "", width: "26", height: "26" })));
    return box;
  }
  // grupos recolhíveis: todos começam abertos; os que a pessoa fecha ficam lembrados no navegador
  const GRUPOS = "sinint_olhinhos_fechados";
  let fechados = {};
  try { fechados = JSON.parse(localStorage.getItem(GRUPOS) || "{}") || {}; } catch (e) { fechados = {}; }
  const salvarGrupos = () => { try { localStorage.setItem(GRUPOS, JSON.stringify(fechados)); } catch (e) { } };

  // Um anime = uma aba. Temas "Prefixo · Categoria" entram como subaba do anime cujo nome contém o prefixo
  // ("Apotecária · Cortesãs" → Diários de uma Apotecária › Cortesãs); o tema do próprio anime vira a 1ª subaba.
  // Em Kimetsu as categorias são versões estilizadas: Simples | Estilizados › Protagonistas, Hashiras, Onis.
  const ESTILIZADOS = new Set(["Kimetsu no Yaiba"]);
  const TEMAS = [...new Set(LIB.map(c => c.theme))];
  const prefixo = t => t.includes(" · ") ? t.slice(0, t.indexOf(" · ")) : null;
  function caminho(t) {
    const pre = prefixo(t);
    if (pre) {
      const anime = TEMAS.find(x => !prefixo(x) && x.includes(pre)) || pre, cat = t.slice(pre.length + 3);
      return ESTILIZADOS.has(anime) ? [anime, "Estilizados", cat] : [anime, cat];
    }
    if (TEMAS.some(x => prefixo(x) && t.includes(prefixo(x)))) return [t, ESTILIZADOS.has(t) ? "Simples" : t];
    return [t];
  }
  function arvore() {
    const raiz = { filhos: [] };
    LIB.forEach(c => {
      let no = raiz;
      caminho(c.theme).forEach((titulo, i, cam) => {
        let f = no.filhos.find(x => x.titulo === titulo);
        if (!f) no.filhos.push(f = { titulo, chave: cam.slice(0, i + 1).join(" › "), filhos: [], itens: [] });
        no = f;
      });
      no.itens.push(c);
    });
    return raiz.filhos;
  }
  // personagem de um tema oculto (ele mesmo ou algum nível acima): some da lista, dos chips e da folha
  function oculto(ch) {
    if (!ch._id.startsWith("lib:") || !state.settings.ocultos.length) return false;
    const cam = caminho(ch.theme);
    return cam.some((_, i) => state.settings.ocultos.includes(cam.slice(0, i + 1).join(" › ")));
  }
  // opções › "Temas na lista": uma caixinha por aba e subaba (desmarcar a aba de cima oculta tudo dentro dela)
  function renderVisiveis() {
    const box = $("#temas-visiveis"); box.textContent = "";
    const ramo = (nos, nivel, paiOculto) => nos.forEach(no => {
      const oc = state.settings.ocultos.includes(no.chave);
      const cb = el("input", { type: "checkbox" }); cb.checked = !oc && !paiOculto; cb.disabled = paiOculto;
      cb.addEventListener("change", () => {
        const o = state.settings.ocultos.filter(k => k !== no.chave);
        if (!cb.checked) o.push(no.chave);
        state.settings.ocultos = o; save(); renderVisiveis(); renderList(); renderSelected(); pageIdx = 0; schedulePreview();
      });
      const n = no.filhos.length ? no.filhos.reduce(function conta(a, f) { return a + f.itens.length + f.filhos.reduce(conta, 0); }, no.itens.length) : no.itens.length;
      box.append(el("label", { class: "mg-check" + (nivel ? " sub" : ""), style: `--nivel:${nivel}` }, cb, el("span", { text: `${no.titulo} · ${n}` })));
      ramo(no.filhos, nivel + 1, paiOculto || oc);
    });
    ramo(arvore(), 0, false);
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
    const casa = (c, cam) => !q || norm(c.name).includes(q) || cam.some(t => norm(t).includes(q));
    // filtra a árvore pela busca; grupos sem nenhum personagem somem
    const filtrar = (no, cam) => {
      if (state.settings.ocultos.includes(no.chave)) return null;   // tema oculto nas opções
      const c2 = [...cam, no.titulo];
      const filhos = no.filhos.map(f => filtrar(f, c2)).filter(Boolean), itens = no.itens.filter(c => casa(c, [...c2, c.theme]));
      const todos = [...filhos.flatMap(f => f.todos), ...itens];
      return todos.length ? { ...no, filhos, itens, todos } : null;
    };
    const grupos = [];
    if (state.custom.length) { const g = filtrar({ titulo: "Meus personagens", chave: "Meus personagens", filhos: [], itens: state.custom }, []); if (g) grupos.push([g, true]); }
    arvore().forEach(no => { const g = filtrar(no, []); if (g) grupos.push([g, false]); });
    grupos.forEach(([g, mine]) => lista.append(grupo(g, mine, 0, q)));
    if (!grupos.length) lista.append(el("p", { class: "vazio", text: "Nenhum personagem encontrado." }));
  }
  function grupo(no, mine, nivel, q) {
    const items = no.todos, title = no.titulo;
    // todos começam abertos; "Meus personagens" fica sempre aberto; com busca, abrem os grupos que têm resultado
    const aberto = mine || !!q || !fechados[no.chave];
    const sec = el("details", { class: "tema" + (mine ? " meus" : "") + (nivel ? " sub" : "") });
    sec.open = aberto;
    const allOn = items.every(c => isSel(c._id)), nSel = items.filter(c => isSel(c._id)).length;
    const sum = el("summary", { class: "tema-cab" },
      el(nivel ? "h4" : "h3", {}, el("span", { text: title }), el("span", { class: "conta", text: ` · ${items.length}` }),
        nSel ? el("span", { class: "nsel", text: nSel === items.length ? "todos" : `${nSel} na folha` }) : null),
      el("button", {
        type: "button", class: "todos", text: allOn ? "tirar todos" : "selecionar todos", onclick: (e) => {
          e.preventDefault(); e.stopPropagation();
          if (allOn) state.sel = state.sel.filter(s => !items.some(c => c._id === s.id));
          else items.forEach(c => { if (!isSel(c._id)) state.sel.push({ id: c._id, qty: c.qty || 1 }); });
          save(); renderList(); renderSelected(); schedulePreview();
        }
      }));
    if (mine) sum.addEventListener("click", e => { if (!e.target.closest("button")) e.preventDefault(); });
    sec.append(sum);
    const corpo = el("div", { class: "tema-corpo" });
    sec.append(corpo);
    const preencher = () => {
      if (corpo.childElementCount) return;
      no.filhos.forEach(f => corpo.append(grupo(f, mine, nivel + 1, q)));
      no.itens.forEach(ch => corpo.append(linhaItem(ch, mine)));
    };
    if (aberto) preencher();
    sec.addEventListener("toggle", e => {
      if (e.target !== sec) return;
      if (sec.open) preencher();
      if (!mine && !q) { if (sec.open) delete fechados[no.chave]; else fechados[no.chave] = true; salvarGrupos(); }
    });
    return sec;
  }
  function linhaItem(ch, mine) {
    const sel = isSel(ch._id);
    const row = el("div", { class: "item" + (sel ? " sel" : ""), role: "checkbox", "aria-checked": String(sel), tabindex: "0", title: ch.theme || "" },
      el("span", { class: "check", "aria-hidden": "true", text: sel ? "✓" : "" }), miniEyes(ch),
      el("span", { class: "nome" }, ch.name, ch._editado ? el("span", { class: "editado", title: "Editado por você", text: "editado" }) : null),
      ch._metades ? null : el("button", { class: "acao", type: "button", text: "editar", "aria-label": "Editar " + ch.name, onclick: (e) => { e.stopPropagation(); openEditor(ch); } }),
      mine || ch._metades ? null : el("button", { class: "acao", type: "button", text: "copiar", "aria-label": "Copiar " + ch.name + " para Meus personagens", onclick: (e) => { e.stopPropagation(); openEditor(ch, true); } }),
      ch._editado ? el("button", { class: "acao", type: "button", text: "↺", title: "Restaurar padrão", "aria-label": "Restaurar padrão de " + ch.name, onclick: (e) => { e.stopPropagation(); restaurar(ch._id); } }) : null,
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
    return row;
  }

  // ---------- selecionados ----------
  function renderSelected() {
    const box = $("#selecionados"); box.textContent = "";
    state.sel.forEach(s => {
      const ch = byId(s.id); if (!ch || oculto(ch)) return;
      box.append(el("span", { class: "chip", style: `background:${bandCss(ch.band)}` }, ch.name,
        el("button", { type: "button", title: "Quantidade de olhinhos", text: s.qty === 2 ? "2×" : "1×", onclick: () => { s.qty = s.qty === 2 ? 1 : 2; save(); renderSelected(); schedulePreview(); } }),
        el("button", { type: "button", "aria-label": "Remover " + ch.name, text: "✕", onclick: () => toggle(s.id) })));
    });
    $("#btn-pdf").disabled = !selectedChars().length;
  }

  // ---------- prévia da folha ----------
  let pages = [], pageIdx = 0, prevTimer = 0;
  const opts = () => ({ ...state.settings });
  const selectedChars = () => state.sel.map(s => { const ch = byId(s.id); return ch && !oculto(ch) ? { ...ch, qty: s.qty } : null; }).filter(Boolean);
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
    finally { btn.textContent = old; btn.disabled = !selectedChars().length; }
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
    { key: "gwen", label: "Estrelas esfumadas (Gwen: escura num olho, rosa no outro)", def: () => true, params: [] },
    { key: "arc", label: "Arco no topo", def: d => ({ color: d.colors[0], base: d.colors[Math.min(2, d.colors.length - 1)], off: .3, soft: .35 }),
      params: [["color", "Cor do arco"], ["base", "Cor de base"], ["off", "Posição", -.3, 1, .02], ["soft", "Suavidade", .1, 1, .02]] },
  ];

  // Motivos (camadas em olhos.js › FORMAS). Cada um com cor, intensidade, tamanho e desfoque.
  // tam: [chave, mín, máx, passo] do controle "Tamanho"; os valores padrão vêm dos olhos da biblioteca.
  const ESC = ["esc", .3, 1.8, .02];
  const MOTIVOS = {
    estrela: { nome: "Estrela", tam: ESC, def: { cor: "#0A1E5A", pico: .7, desf: .04, R: .38, y: -.02 } },
    coracao: { nome: "Coração", tam: ESC, def: { cor: "#FFE2F0", pico: .75, desf: .05, R: .4 } },
    chamas: { nome: "Chamas", tam: ESC, def: { cor: "#FF8A3A", pico: .45, desf: .07, base: 1.95, itens: [[-.5, .5, .2, -.2], [-.05, .8, .26, .06], [.48, .52, .2, .2]] } },
    raios: { nome: "Raios (linhas)", tam: ESC, def: { cor: "#FFB0CC", pico: .35, desf: .05, n: 12, r0: .12, r1: .5, w: .035, rot: 15 } },
    sol: { nome: "Sol (raios pontudos)", tam: ESC, def: { cor: "#FFD23A", pico: .85, desf: .02, n: 12, longo: .78, curto: .5, base: .1 } },
    aneis: { nome: "Anéis octogonais", tam: ESC, def: { cor: "#14280A", pico: .3, desf: .03, k: 8, fr: [.4, .68, .92], w: .03, rot: 22.5 } },
    ondas: { nome: "Ondas", tam: ESC, def: { cor: "#CCEEFF", pico: .55, desf: .025, ys: [.55, .85, 1.15, 1.45], amp: .07, freq: 3.4, fase2: 1.1, passo: 1, w: .035 } },
    faixas: { nome: "Névoa em faixas", tam: ESC, def: { cor: "#B080FF", pico: .45, desf: .07, y0: .62, amp: .08, freq: 3, fase2: .8, alt: .14 } },
    redemoinho: { nome: "Redemoinho", tam: ESC, def: { cor: "#1A1426", pico: .3, desf: .02, n: 8, passo: .1, dx: .03, sx: 1.05, sy: .92, w: .02, esp: true } },
    escamas: { nome: "Escamas", tam: ESC, def: { cor: "#FFF0B0", pico: .28, desf: .012, s: .22, w: .016 } },
    hachuras: { nome: "Hachuras", tam: ESC, def: { cor: "#0A3A40", pico: .32, desf: .02, n: 7, passo: .075, larg: .55, div: 8.2, w: .022 } },
    rachaduras: { nome: "Rachaduras", tam: ESC, def: { cor: "#6E6478", pico: .3, desf: .02, w: .018, esp: true, linhas: [[[0, 0], [-.35, .3], [-.5, .7]], [[0, 0], [.4, .25], [.75, .2]], [[0, 0], [.15, -.45], [.05, -.85]], [[-.35, .3], [-.75, .15]], [[.15, -.45], [.55, -.6]]] } },
    nuvens: { nome: "Nuvens", tam: ESC, def: { cor: "#FFFFFF", pico: .7, desf: .045, esp: true } },
    lua: { nome: "Lua", tam: ESC, def: { cor: "#F2F0FF", pico: .85, desf: .02, esp: true } },
    petalas: { nome: "Pétalas", tam: ESC, def: { cor: "#FFF0F6", pico: .7, desf: .025, L: .2, W: .12, esp: true, itens: [[-.35, .35, 30, 1], [.4, .2, -40, .85], [-.05, -.15, 75, .95], [.45, -.45, 10, .7], [-.5, -.4, -60, .75], [.1, .6, 120, .6]] } },
    kanji: { nome: "Kanji", tam: ESC, def: { cor: "#2A1004", pico: .85, desf: .006, textos: ["上弦", "壱"], tams: [.5, .62] } },
    brilhinhos: { nome: "Brilhinhos", tam: ["tam", .02, .2, .005], def: { cor: "#FFFFFF", pico: .7, desf: .012, tam: .07, pts: O.SPARK.slice(0, 3), esp: true } },
    pontinhos: { nome: "Pontinhos", tam: ["tam", .01, .08, .002], def: { cor: "#FFFFFF", pico: .6, desf: .015, tam: .03, pts: O.GALAXY_DOTS, esp: true } },
    brilho: { nome: "Brilho gaussiano", tam: ["tam", .1, 1.5, .02], semDesf: true, def: { cor: "#FFFFFF", pico: .4, tam: .6, x: 0, y: 0 } },
    fenda: { nome: "Fenda (olho de gato)", tam: ESC, def: { cor: "#03302A", pico: .6, desf: .06, larg: .1, y0: .18, y1: 1.82 } },
    liquido: { nome: "Líquido (mel)", tam: ESC, def: { cor: "#FFD878", pico: .5, desf: .05, y0: 1.05, amp: .06, freq: 4.2, fase2: 1.2 } },
    gotas: { nome: "Gotas escorrendo", tam: ESC, def: { cor: "#3A1202", pico: .32, desf: .05, esp: true, itens: [[-.45, .5, .13], [-.05, .72, .16], [.38, .42, .12]] } },
    setores: { nome: "Setores arco-íris", semCor: true, semDesf: true, def: { pico: .85, esp: true } },
    meialua: { nome: "Meia-lua (camada)", tam: ["h", .1, .6, .01], def: { cor: "#FFFFFF", pico: .4, h: .34 } },
    sombra: { nome: "Sombra no topo (camada)", tam: ["f", .05, .5, .01], def: { cor: "#1A1A2A", pico: .35, f: .22 } },
    borda: { nome: "Borda escura (camada)", tam: ["w", .03, .3, .01], semDesf: true, def: { cor: "#1A0204", pico: .3, w: .1 } },
    forma: { nome: "Forma", tam: ESC, interno: true, def: {} },
  };
  const DESF_PADRAO = { meialua: .12, sombra: .12, brilhinhos: .012, pontinhos: .015, kanji: .006 };

  let draft = null, editing = null, link = {};
  const dlg = $("#editor");

  function defaultDraft() {
    const colors = ["#1E3A6E", "#2E5EA8", "#4A86D4", "#74AEEA", "#A8D2F6", "#D6ECFC"];
    return { name: "", theme: "", colors, stops: [0, 18, 40, 62, 82, 100], band: colors[3], qty: 1,
      fx: { cres: { color: colors[5], a: .55, h: .34 }, top: { color: colors[0], a: .2, f: .2 } }, camadas: [] };
  }
  const temFaixaTopo = () => draft.colors.length >= 3 && draft.colors[0].toUpperCase() === draft.colors[1].toUpperCase() && draft.stops[0] === 0 && draft.stops[1] <= 15;
  const diferentes = () => Array.isArray(draft.colors2) || draft.camadas.some(l => l.lado);
  // openEditor(ch): edita o próprio personagem (meu ou da biblioteca); openEditor(ch, true): cria uma cópia em "Meus personagens"
  function openEditor(ch, copia = false) {
    editing = ch && !copia ? ch._id : null;
    const daLib = !!editing && editing.startsWith("lib:");
    draft = ch ? clone({ ...ch, _id: undefined, _v: undefined, _metades: undefined, _editado: undefined, proc: undefined }) : defaultDraft();
    // na biblioteca o tema fica fixo (é ele que diz em que aba o personagem mora)
    $("#ed-tema").disabled = daLib; $("#temas").hidden = daLib;
    $("#ed-restaurar").hidden = !(daLib && state.editados[editing]);
    draft.fx = draft.fx || {}; draft.camadas = Array.isArray(draft.camadas) ? draft.camadas : [];
    // cores "ligadas": seguem o degradê até a pessoa mudar manualmente
    const last = draft.colors.length - 1, mid = Math.floor(draft.colors.length / 2);
    link = { top: !!draft.fx.top && draft.fx.top.color === draft.colors[0],
      cres: !!draft.fx.cres && draft.fx.cres.color === draft.colors[last],
      band: !ch || draft.band === draft.colors[mid] };
    $("#ed-titulo").textContent = editing ? `Editar ${ch.name}` : ch ? `Cópia de ${ch.name}` : "Novo personagem";
    $("#ed-salvar").textContent = editing ? "Salvar alterações" : "Salvar em meus personagens";
    $("#ed-nome").value = draft.name; $("#ed-tema").value = draft.theme || ""; fillThemes();
    $("#ed-faixa-cor").value = draft.band.split("|")[0].toLowerCase();
    document.querySelectorAll('input[name="ed-qty"]').forEach(r => r.checked = Number(r.value) === (draft.qty || 1));
    document.querySelectorAll('input[name="ed-tom"]').forEach(r => r.checked = Number(r.value) === ((draft.tom ?? 1) < 1 ? .5 : 1));
    $("#ed-espelhar").checked = draft.espelhar !== false;
    $("#ed-erro").textContent = "";
    buildAll(); updateEditorPreview();
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    $("#ed-nome").focus();
  }
  function buildAll() { buildStops(""); buildStops("2"); buildFaixaTopo(); buildDiferentes(); buildEffects(); buildCamadas(); buildEstrias(); galeriaChave = ""; buildGaleria(); }
  function syncLinked(rebuild) {
    const last = draft.colors.length - 1, mid = Math.floor(draft.colors.length / 2);
    if (link.top && draft.fx.top) draft.fx.top.color = draft.colors[0];
    if (link.cres && draft.fx.cres) draft.fx.cres.color = draft.colors[last];
    if (link.band) { draft.band = draft.colors[mid]; $("#ed-faixa-cor").value = draft.band.toLowerCase(); }
    if (rebuild) buildEffects();
  }
  // editor de degradê: suf "" = principal, "2" = olho direito
  function buildStops(suf) {
    const box = $("#ed-cores" + suf); box.textContent = "";
    const C = "colors" + suf, S = "stops" + suf;
    if (!Array.isArray(draft[C])) return;
    draft[C].forEach((c, i) => {
      const color = el("input", { type: "color", value: c.toLowerCase(), "aria-label": `Cor ${i + 1}` });
      const hex = el("input", { type: "text", value: c.toUpperCase(), maxlength: "7", "aria-label": `Código da cor ${i + 1}` });
      const pos = el("input", { type: "number", min: "0", max: "100", step: "0.5", value: String(draft[S][i]), "aria-label": `Posição da cor ${i + 1} em %` });
      color.addEventListener("input", () => { draft[C][i] = color.value.toUpperCase(); hex.value = draft[C][i]; if (!suf) syncLinked(false); updateEditorPreview(); });
      color.addEventListener("change", () => { if (!suf) { syncLinked(true); buildFaixaTopo(); } });
      hex.addEventListener("input", () => { const v = hex.value.trim(); if (/^#?[0-9a-f]{6}$/i.test(v)) { draft[C][i] = ("#" + v.replace("#", "")).toUpperCase(); color.value = draft[C][i].toLowerCase(); if (!suf) syncLinked(true); updateEditorPreview(); } });
      pos.addEventListener("input", () => { const v = parseFloat(pos.value); if (!isNaN(v)) { draft[S][i] = Math.max(0, Math.min(100, v)); if (!suf) buildFaixaTopo(); updateEditorPreview(); } });
      const rm = el("button", { class: "rm", type: "button", "aria-label": `Remover cor ${i + 1}`, text: "✕", onclick: () => { if (draft[C].length <= 2) return; draft[C].splice(i, 1); draft[S].splice(i, 1); if (!suf) syncLinked(true); buildStops(suf); buildFaixaTopo(); updateEditorPreview(); } });
      box.append(el("div", { class: "cor-linha" }, color, hex, el("label", { class: "param" }, pos), rm));
    });
  }
  // faixa sólida no topo: 1ª cor repetida nas duas primeiras paradas
  function buildFaixaTopo() {
    const on = temFaixaTopo();
    $("#ed-faixa-topo").checked = on; $("#ed-faixa-topo-alt").hidden = !on;
    if (on) $("#ed-faixa-topo-v").value = String(draft.stops[1]);
  }
  function setFaixaTopo(on) {
    if (on && !temFaixaTopo()) {
      const alt = 3, k = (100 - alt) / 100;
      draft.colors = [draft.colors[0], draft.colors[0], ...draft.colors.slice(1)];
      draft.stops = [0, alt, ...draft.stops.slice(1).map(s => Math.round((alt + s * k) * 10) / 10)];
    } else if (!on && temFaixaTopo()) {
      const alt = draft.stops[1];
      draft.colors = draft.colors.slice(1); draft.stops = [0, ...draft.stops.slice(2).map(s => Math.round(Math.max(0, (s - alt) * 100 / (100 - alt)) * 10) / 10)];
    }
    buildStops(""); buildFaixaTopo(); updateEditorPreview();
  }
  function buildDiferentes() {
    $("#ed-diferentes").checked = diferentes(); $("#ed-direito").hidden = !Array.isArray(draft.colors2);
  }
  function setDiferentes(on) {
    if (on) { if (!Array.isArray(draft.colors2)) { draft.colors2 = draft.colors.slice(); draft.stops2 = draft.stops.slice(); } }
    else { delete draft.colors2; delete draft.stops2; draft.camadas.forEach(l => delete l.lado); }
    buildStops("2"); buildDiferentes(); buildCamadas(); updateEditorPreview();
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
          if (k === "color" || k === "base") {
            input = el("input", { type: "color", value: (obj[k] || "#000000").toLowerCase() });
            input.addEventListener("input", () => { obj[k] = input.value.toUpperCase(); if (k === "color" && E.key in link) link[E.key] = false; updateEditorPreview(); });
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
  // ---------- motifs (camadas) ----------
  // prévia de um motif isolado: o degradê do personagem + só aquela camada
  function previaMotif(L, px) {
    const lado = L.lado === "d" && Array.isArray(draft.colors2) ? 1 : 0;
    return O.renderEye({ colors: draft.colors, stops: draft.stops, colors2: draft.colors2, stops2: draft.stops2, tom: draft.tom, espelhar: draft.espelhar, camadas: [L] }, lado, px);
  }
  // galeria para adicionar: uma prévia de cada motif com os valores padrão, no degradê atual
  let galeriaChave = "";
  function buildGaleria() {
    const chave = JSON.stringify([draft.colors, draft.stops, draft.tom]); if (chave === galeriaChave) return;
    galeriaChave = chave;
    const box = $("#ed-galeria"); box.textContent = "";
    Object.entries(MOTIVOS).filter(([, M]) => !M.interno).forEach(([t, M]) => {
      const img = el("img", { src: previaMotif({ t, ...clone(M.def) }, 112).toDataURL(), alt: "", width: "56", height: "56" });
      box.append(el("button", { type: "button", class: "ol-motif", "aria-label": "Adicionar motif " + M.nome, title: M.nome, onclick: () => addMotivo(t) }, img, el("span", { text: M.nome })));
    });
  }
  let miniCamadas = [];
  function redesenharMinis() {
    miniCamadas.forEach(([cv, L]) => { const x = cv.getContext("2d"); x.clearRect(0, 0, cv.width, cv.height); x.drawImage(previaMotif(L, cv.width), 0, 0); });
  }
  function slider(label, valor, mn, mx, st, aoMudar) {
    const input = el("input", { type: "range", min: String(mn), max: String(mx), step: String(st), value: String(valor) });
    input.addEventListener("input", () => { aoMudar(parseFloat(input.value)); updateEditorPreview(); });
    return el("label", { class: "param" }, label, input);
  }
  function botao(texto, rotulo, desligado, acao) {
    const b = el("button", { type: "button", class: "mini-acao", text: texto, "aria-label": rotulo, onclick: acao });
    b.disabled = !!desligado; return b;
  }
  function buildCamadas() {
    const box = $("#ed-camadas"); box.textContent = ""; miniCamadas = [];
    const visiveis = draft.camadas.map((L, i) => [L, i]).filter(([L]) => L.t !== "estrias");
    if (!visiveis.length) box.append(el("p", { class: "ol-dica", text: "Nenhum motif ainda. Clique numa prévia abaixo para adicionar." }));
    visiveis.forEach(([L, i], pos) => {
      const M = MOTIVOS[L.t] || { nome: L.t, tam: ESC };
      const mini = el("canvas", { class: "camada-mini", width: "112", height: "112", "aria-hidden": "true" });
      miniCamadas.push([mini, L]);
      const cab = el("div", { class: "camada-cab" }, el("span", { class: "camada-nome" }, mini, el("b", { text: M.nome })),
        el("span", { class: "camada-acoes" },
          botao("↑", "Subir " + M.nome, pos === 0, () => mover(i, -1)),
          botao("↓", "Descer " + M.nome, pos === visiveis.length - 1, () => mover(i, 1)),
          botao("✕", "Remover " + M.nome, false, () => { draft.camadas.splice(i, 1); buildCamadas(); updateEditorPreview(); })));
      const params = el("div", { class: "params" });
      if (!M.semCor) {
        const cor = el("input", { type: "color", value: (L.cor || "#FFFFFF").toLowerCase() });
        cor.addEventListener("input", () => { L.cor = cor.value.toUpperCase(); updateEditorPreview(); });
        params.append(el("label", { class: "param" }, "Cor", cor));
      }
      params.append(slider("Intensidade", L.pico ?? .5, 0, 1, .01, v => L.pico = v));
      if (M.tam) { const [k, mn, mx, st] = M.tam; params.append(slider("Tamanho", L[k] ?? (k === "esc" ? 1 : mn), mn, mx, st, v => L[k] = v)); }
      if (!M.semDesf) params.append(slider("Desfoque", L.desf ?? DESF_PADRAO[L.t] ?? .03, 0, .15, .002, v => L.desf = v));
      if (L.t === "brilho") params.append(slider("Altura (− desce, + sobe)", L.y || 0, -.6, .6, .02, v => L.y = v));
      if (L.t === "kanji") {
        ["olho esquerdo", "olho direito"].forEach((rot, s) => {
          const t = el("input", { type: "text", value: (L.textos || [])[s] || "", maxlength: "4", "aria-label": "Kanji do " + rot });
          t.addEventListener("input", () => { L.textos = L.textos || ["", ""]; L.textos[s] = t.value.trim(); updateEditorPreview(); });
          params.append(el("label", { class: "param" }, "Kanji · " + rot, t));
        });
      }
      if (diferentes()) {
        const sel = el("select", { class: "mg-select ol-lado", "aria-label": "Em qual olho" },
          el("option", { value: "", text: "Nos dois olhos" }), el("option", { value: "e", text: "Só no olho esquerdo" }), el("option", { value: "d", text: "Só no olho direito" }));
        sel.value = L.lado || "";
        sel.addEventListener("change", () => { if (sel.value) L.lado = sel.value; else delete L.lado; updateEditorPreview(); });
        params.append(el("label", { class: "param" }, "Em qual olho", sel));
      }
      box.append(el("div", { class: "camada" }, cab, params));
    });
    redesenharMinis();
  }
  function mover(i, d) {
    const vis = draft.camadas.map((L, k) => k).filter(k => draft.camadas[k].t !== "estrias"), p = vis.indexOf(i), j = vis[p + d];
    if (j == null) return; [draft.camadas[i], draft.camadas[j]] = [draft.camadas[j], draft.camadas[i]];
    buildCamadas(); updateEditorPreview();
  }
  function addMotivo(t) {
    const M = MOTIVOS[t]; if (!M) return;
    draft.camadas.push({ t, ...clone(M.def) });
    buildCamadas(); updateEditorPreview();
  }
  // estrias da íris: camada "estrias" (no fim, como no wrapper "realista" do Python)
  function buildEstrias() {
    const est = draft.camadas.find(l => l.t === "estrias");
    $("#ed-estrias").checked = !!est; $("#ed-estrias-params").hidden = !est;
    if (est) { $("#ed-estrias-cor").value = (est.cor || "#000000").toLowerCase(); $("#ed-estrias-pico").value = String(est.pico ?? .16); }
  }
  function setEstrias(on) {
    if (on && !draft.camadas.some(l => l.t === "estrias")) draft.camadas.push({ t: "estrias", cor: draft.colors[0], pico: .16 });
    if (!on) draft.camadas = draft.camadas.filter(l => l.t !== "estrias");
    buildEstrias(); updateEditorPreview();
  }
  let edTimer = 0;
  function updateEditorPreview() {
    cancelAnimationFrame(edTimer);
    edTimer = requestAnimationFrame(() => {
      const ch = { ...draft, name: $("#ed-nome").value || "NOME" };
      const barra = (cols, st) => `linear-gradient(90deg, ${cols.map((c, i) => `${O.viv(c)} ${st[i]}%`).join(", ")})`;
      $("#ed-barra").style.background = barra(ch.colors, ch.stops);
      if (Array.isArray(ch.colors2)) $("#ed-barra2").style.background = barra(ch.colors2, ch.stops2);
      [["#ed-o0", 0], ["#ed-o1", 1], ["#ed-r0", 0], ["#ed-r1", 1]].forEach(([id, s]) => { const cv = $(id), x = cv.getContext("2d"); x.clearRect(0, 0, cv.width, cv.height); x.drawImage(O.renderEye(ch, s, cv.width), 0, 0); });
      const f = $("#ed-faixa"); f.style.background = bandCss(draft.band); f.textContent = (ch.name || "NOME").toUpperCase();
      redesenharMinis();
      clearTimeout(galeriaTimer); galeriaTimer = setTimeout(buildGaleria, 400);   // a galeria acompanha o degradê sem travar os controles
    });
  }
  let galeriaTimer = 0;
  function saveEditor() {
    const name = $("#ed-nome").value.trim().toUpperCase();
    if (!name) { $("#ed-erro").textContent = "Dê um nome ao personagem."; $("#ed-nome").focus(); return; }
    draft.name = name;
    if (!(editing && editing.startsWith("lib:"))) draft.theme = $("#ed-tema").value.trim() || "Meus personagens";
    draft.qty = Number((document.querySelector('input[name="ed-qty"]:checked') || {}).value || 1);
    const tom = Number((document.querySelector('input[name="ed-tom"]:checked') || {}).value || 1);
    if (tom < 1) draft.tom = .5; else delete draft.tom;
    if ($("#ed-espelhar").checked) delete draft.espelhar; else draft.espelhar = false;
    if (!validChar(draft)) { $("#ed-erro").textContent = "Confira as cores: use códigos como #A1B2C3 e posições entre 0 e 100."; return; }
    const final = clone(draft); if (!final.camadas.length) delete final.camadas;
    if (editing && editing.startsWith("lib:")) {
      final.theme = ORIGINAL.get(editing).theme;
      state.editados[editing] = final; aplicarEdicao(editing);
    } else if (editing) {
      const i = state.custom.findIndex(c => c._id === editing);
      const prevV = state.custom[i]._v || 0;
      state.custom[i] = { ...final, _id: editing, _v: prevV + 1 };
    } else {
      const id = "meu:" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      state.custom.unshift({ ...final, _id: id, _v: 0 });
      state.sel.push({ id, qty: final.qty });
    }
    save(); dlg.close(); renderList(); renderSelected(); schedulePreview(); fillThemes();
  }
  // volta um personagem da biblioteca ao original
  async function restaurar(id) {
    const ch = byId(id);
    if (!await caixa({ titulo: `Restaurar ${ORIGINAL.get(id).name}?`, texto: "As suas alterações neste personagem serão apagadas e ele volta a ser como veio na biblioteca.", ok: "Restaurar", cancelar: "Cancelar" })) return false;
    delete state.editados[id]; aplicarEdicao(id);
    save(); renderList(); renderSelected(); schedulePreview();
    return !!ch;
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
          if (Array.isArray(c.camadas) && c.camadas.length) clean.camadas = c.camadas;
          if (c.colors2) { clean.colors2 = c.colors2; clean.stops2 = c.stops2; }
          if (c.tom === .5) clean.tom = .5;
          if (c.espelhar === false) clean.espelhar = false;
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
    $("#ed-restaurar").addEventListener("click", async () => { if (editing && await restaurar(editing)) dlg.close(); });
    $("#ed-nome").addEventListener("input", updateEditorPreview);
    $("#ed-tema").addEventListener("input", fillThemes);
    $("#ed-add").addEventListener("click", () => {
      const i = draft.colors.length - 1; draft.colors.splice(i, 0, draft.colors[i]); draft.stops.splice(i, 0, Math.max(0, draft.stops[i] - 5));
      syncLinked(true); buildStops(); updateEditorPreview();
    });
    $("#ed-distribuir").addEventListener("click", () => { const n = draft.colors.length; draft.stops = draft.colors.map((_, i) => Math.round(i / (n - 1) * 1000) / 10); buildStops(); updateEditorPreview(); });
    $("#ed-faixa-cor").addEventListener("input", e => { draft.band = e.target.value.toUpperCase(); link.band = false; updateEditorPreview(); });
    $("#ed-add2").addEventListener("click", () => { const i = draft.colors2.length - 1; draft.colors2.splice(i, 0, draft.colors2[i]); draft.stops2.splice(i, 0, Math.max(0, draft.stops2[i] - 5)); buildStops("2"); updateEditorPreview(); });
    $("#ed-faixa-topo").addEventListener("change", e => setFaixaTopo(e.target.checked));
    $("#ed-faixa-topo-v").addEventListener("input", e => { const v = parseFloat(e.target.value); draft.stops[1] = Math.min(v, (draft.stops[2] ?? 100) - 0.5); buildStops(""); updateEditorPreview(); });
    $("#ed-diferentes").addEventListener("change", e => setDiferentes(e.target.checked));
    $("#ed-espelhar").addEventListener("change", e => { if (e.target.checked) delete draft.espelhar; else draft.espelhar = false; updateEditorPreview(); });
    document.querySelectorAll('input[name="ed-tom"]').forEach(r => r.addEventListener("change", () => { if (Number(r.value) < 1) draft.tom = .5; else delete draft.tom; updateEditorPreview(); }));
    $("#ed-estrias").addEventListener("change", e => setEstrias(e.target.checked));
    $("#ed-estrias-cor").addEventListener("input", e => { draft.camadas.filter(l => l.t === "estrias").forEach(l => l.cor = e.target.value.toUpperCase()); updateEditorPreview(); });
    $("#ed-estrias-pico").addEventListener("input", e => { draft.camadas.filter(l => l.t === "estrias").forEach(l => l.pico = parseFloat(e.target.value)); updateEditorPreview(); });
    $("#ed-faixa-auto").addEventListener("click", () => { link.band = true; draft.band = draft.colors[Math.floor(draft.colors.length / 2)]; $("#ed-faixa-cor").value = draft.band.toLowerCase(); updateEditorPreview(); });
    window.addEventListener("resize", schedulePreview);
  }

  (async function init() {
    await loadFonts();
    try { O.drawPreview._logo = await O.logoCanvas(); O.drawPreview._selo = await O.seloCanvas(); } catch (e) { }
    bind(); fillThemes(); renderVisiveis(); renderList(); renderSelected(); renderPreview();
  })();
})();
