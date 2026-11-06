/* Magamalabares · botão noite/dia
   Sem data-tema no <html>, a página segue o sistema.
   O botão [data-alternar-tema] (ou os botões [data-tema-opcao]) fixam o tema e lembram a escolha. */
(function () {
  var CHAVE = "mg-tema";
  var html = document.documentElement;
  var midiaDia = window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null;

  function ler() { try { return localStorage.getItem(CHAVE); } catch (e) { return null; } }
  function gravar(v) { try { localStorage.setItem(CHAVE, v); } catch (e) { /* navegador bloqueou */ } }

  function efetivo() {
    var t = html.getAttribute("data-tema");
    if (t === "noite" || t === "dia") return t;
    return midiaDia && midiaDia.matches ? "dia" : "noite";
  }

  function marcar() {
    var atual = efetivo();
    var botoes = document.querySelectorAll("[data-tema-opcao]");
    for (var i = 0; i < botoes.length; i++) {
      botoes[i].setAttribute("aria-pressed", String(botoes[i].getAttribute("data-tema-opcao") === atual));
    }
  }

  function aplicar(t) {
    if (t === "noite" || t === "dia") html.setAttribute("data-tema", t);
    marcar();
  }

  aplicar(ler());

  document.addEventListener("click", function (ev) {
    var alvo = ev.target.closest && ev.target.closest("[data-tema-opcao],[data-alternar-tema]");
    if (!alvo) return;
    var novo = alvo.hasAttribute("data-tema-opcao")
      ? alvo.getAttribute("data-tema-opcao")
      : (efetivo() === "noite" ? "dia" : "noite");
    gravar(novo);
    aplicar(novo);
  });

  if (midiaDia && midiaDia.addEventListener) midiaDia.addEventListener("change", marcar);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", marcar);
})();
