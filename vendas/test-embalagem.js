// Testes do estimador de embalagem (nov/2026).
// Rodar:  node vendas/test-embalagem.js
// Carrega só o bloco <script id="regras"> de vendas/embalagem.html, sem navegador.
// Usa os valores padrão das constantes: margem max(10%, 50 g) em múltiplos de 10 g,
// fator 6000, limiar de cubagem 0, mínimos 16 × 11 × 2.
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const html = fs.readFileSync(path.join(__dirname, "embalagem.html"), "utf8");
const m = html.match(/<script id="regras">([\s\S]*?)<\/script>/);
if (!m) { console.error("Bloco <script id=\"regras\"> não encontrado em embalagem.html"); process.exit(1); }
const ctx = {};
vm.createContext(ctx);
vm.runInContext(m[1], ctx);
const { arranjos, estimarCaixa, estimarEnvelope, escolherCaixaPadrao, pesoCubico, validarLimites, recomendar, lerNumero } = ctx;

let ok = 0, falhas = 0;
function igual(nome, obtido, esperado, tol) {
  let passou;
  if (Array.isArray(esperado)) {
    passou = Array.isArray(obtido) && obtido.length === esperado.length &&
      esperado.every((v, i) => Math.abs(obtido[i] - v) <= (tol || 1e-9));
  } else if (typeof esperado === "number") {
    passou = Math.abs(obtido - esperado) <= (tol || 1e-9);
  } else passou = obtido === esperado;
  if (passou) ok++;
  else { falhas++; console.log(`✗ ${nome}: esperado ${JSON.stringify(esperado)}, obtido ${JSON.stringify(obtido)}`); }
}
const arr = (a) => Array.from(a);

// ---------- Caixa sob medida ----------
const caixas = [
  // id, produto, g/un, qtd, proteção, onda, arranjo (bloco), externas, cadastrar, peso cadastrar, cúbico, considerado, manda
  ["A", [15, 10, 5], 300, 1, "media",   "B", [15, 10, 5],  [19.6, 14.6, 9.6],  [20, 15, 10], 460,  500,  500,  "tamanho"],
  ["B", [15, 10, 5], 300, 4, "media",   "C", [20, 15, 10], [24.8, 19.8, 14.8], [25, 20, 15], 1570, 1250, 1570, "peso"],
  ["C", [8, 8, 8],   150, 1, "alta",    "C", [8, 8, 8],    [16.8, 16.8, 16.8], [17, 17, 17], 370,  819,  819,  "tamanho"],
  ["D", [40, 30, 20], 2500, 1, "leve",  "C", [40, 30, 20], [42.8, 32.8, 22.8], [43, 33, 23], 3360, 5440, 5440, "tamanho"],
  ["E", [5, 3, 2],   20,  1, "nenhuma", "B", [5, 3, 2],    [16, 11, 3.6],      [16, 11, 4],  130,  118,  130,  "peso"],
];
for (const [id, dims, pesoUn, qtd, protecao, onda, bloco, ext, cad, pc, cub, cons, manda] of caixas) {
  const o = estimarCaixa({ dims, pesoUn, qtd, protecao });
  igual(`${id} onda`, o.onda, onda);
  igual(`${id} arranjo`, arr(o.conteudo), bloco);
  igual(`${id} externas`, arr(o.externasFinais), ext, 1e-6);
  igual(`${id} cadastrar`, arr(o.cadastrar), cad);
  igual(`${id} peso cadastrar`, o.pesos.cadastrar, pc);
  igual(`${id} peso cúbico`, o.cubico, cub);
  igual(`${id} considerado`, o.considerado, cons);
  igual(`${id} manda`, o.manda, manda);
}
// Valores intermediários
const A = estimarCaixa({ dims: [15, 10, 5], pesoUn: 300, qtd: 1, protecao: "media" });
igual("A caixa ≈ 90,5 g", A.pesos.embalagem, 90.5, 0.05);
igual("A bolha ≈ 2,5 g", A.pesos.bolha, 2.475, 1e-6);
igual("A total ≈ 408,0 g", A.pesos.total, 408.0, 0.05);
const B = estimarCaixa({ dims: [15, 10, 5], pesoUn: 300, qtd: 4, protecao: "media" });
igual("B caixa ≈ 198,9 g", B.pesos.embalagem, 198.9, 0.05);
igual("B bolha ≈ 5,9 g", B.pesos.bolha, 5.85, 1e-6);
igual("B total ≈ 1419,7 g", B.pesos.total, 1419.7, 0.05);
const E = estimarCaixa({ dims: [5, 3, 2], pesoUn: 20, qtd: 1, protecao: "nenhuma" });
igual("E caixa ≈ 43,7 g (medidas mínimas)", E.pesos.embalagem, 43.7, 0.05);
igual("E mínimo aplicado", E.minimoAplicado, true);
// Medidas em qualquer ordem dão o mesmo resultado
igual("A com medidas fora de ordem", arr(estimarCaixa({ dims: [5, 15, 10], pesoUn: 300, protecao: "media" }).cadastrar), [20, 15, 10]);

// ---------- Envelope ----------
const envelopes = [
  // id, produto, g/un, qtd, proteção, tipo, arranjo, envelope (l × c), cadastrar, peso, cúbico, considerado
  ["F", [30, 25, 2], 200, 1, "nenhuma", "plastico", [30, 25, 2], [32, 40], [40, 32, 3], 270, 640,  640],
  ["G", [30, 25, 2], 200, 2, "nenhuma", "plastico", [30, 25, 4], [32, 40], [40, 32, 5], 470, 1067, 1067],
  ["H", [10, 6, 1],  30,  1, "leve",    "bolha",    [10, 6, 1],  [14, 19], [19, 14, 2], 100, 89,   100],
  ["J", [5, 3, 2],   20,  1, "nenhuma", "plastico", [5, 3, 2],   [12, 18], [18, 12, 3], 80,  108,  108],
];
for (const [id, dims, pesoUn, qtd, protecao, tipo, bloco, env, cad, pc, cub, cons] of envelopes) {
  const o = estimarEnvelope({ dims, pesoUn, qtd, protecao }, tipo);
  igual(`${id} serve`, o.serve, true);
  if (!o.serve) continue;
  igual(`${id} arranjo`, arr(o.conteudo), bloco);
  igual(`${id} envelope`, [o.envelope.l, o.envelope.c], env);
  igual(`${id} cadastrar`, arr(o.cadastrar), cad);
  igual(`${id} peso cadastrar`, o.pesos.cadastrar, pc);
  igual(`${id} peso cúbico`, o.cubico, cub);
  igual(`${id} considerado`, o.considerado, cons);
}
// G: empilhar (40×32×5, 1067 g) vence colocar lado a lado (60×50×3, 1500 g)
const G = estimarEnvelope({ dims: [30, 25, 2], pesoUn: 200, qtd: 2, protecao: "nenhuma" }, "plastico");
const ladoALado = G.candidatos.find((c) => c.cadastrar.join("x") === "60x50x3");
igual("G lado a lado existe (60×50×3)", !!ladoALado, true);
igual("G lado a lado considerado", ladoALado ? ladoALado.considerado : null, 1500);
// I: nenhum envelope serve → recomendar caixa
const entI = { dims: [30, 25, 2], pesoUn: 200, qtd: 3, protecao: "nenhuma" };
const I = estimarEnvelope(entI, "plastico");
igual("I nenhum envelope serve", I.serve, false);
igual("I motivo", /empilhado passa de 5 cm e lado a lado não cabe/.test(I.motivo), true);
const rI = recomendar(entI);
igual("I recomenda caixa", ["caixa", "catalogo"].includes(rI.recomendada.tipo), true);
// E + J: para 5×3×2 sem proteção, o envelope plástico (108 g) vence a caixa (130 g)
const rJ = recomendar({ dims: [5, 3, 2], pesoUn: 20, qtd: 1, protecao: "nenhuma" });
igual("E/J recomendada é envelope plástico", rJ.recomendada.tipo, "plastico");
igual("E/J considerado recomendado", rJ.recomendada.considerado, 108);
igual("E/J caixa sob medida considerado", rJ.caixa.considerado, 130);
igual("E/J dica de tamanho mínimo", rJ.dicas.some((d) => d.id === "minimo"), true);
// Regras de quando oferecer envelope
igual("Proteção alta nunca envelope", estimarEnvelope({ dims: [10, 6, 1], pesoUn: 30, protecao: "alta" }, "bolha").serve, false);
igual("Plástico só sem proteção", estimarEnvelope({ dims: [10, 6, 1], pesoUn: 30, protecao: "leve" }, "plastico").serve, false);
igual("Rígido > 3 cm não vai em bolha", estimarEnvelope({ dims: [10, 6, 4], pesoUn: 30, protecao: "leve", tipo: "rigido" }, "bolha").serve, false);
igual("Flexível de 4 cm vai em bolha", estimarEnvelope({ dims: [10, 6, 4], pesoUn: 30, protecao: "leve", tipo: "flexivel" }, "bolha").serve, true);
igual("Caixa do fabricante: proteção mínima leve", recomendar({ dims: [5, 3, 2], pesoUn: 20, protecao: "nenhuma", fabricante: true }).plastico.serve, false);

// ---------- Caixa do catálogo ----------
const entA = { dims: [15, 10, 5], pesoUn: 300, qtd: 1, protecao: "media" };
const K = escolherCaixaPadrao(entA);
igual("K caixa escolhida", K.caixa.nome, "Grande");
igual("K cadastrar", arr(K.cadastrar), [34, 27, 14]);
igual("K peso cadastrar", K.pesos.cadastrar, 650);
igual("K peso cúbico", K.cubico, 2142);
igual("K considerado", K.considerado, 2142);
igual("K Média alta: altura interna 8,4 cm", arr(K.internas).length, 3);
const rA = recomendar(entA);
igual("K dica de caixa padrão muito maior", rA.dicas.some((d) => d.id === "caixaPadrao"), true);
igual("A recomendada é a caixa sob medida", rA.recomendada.tipo, "caixa");
igual("A recomendada considerado", rA.recomendada.considerado, 500);
igual("A envelopes não servem (média, rígido 5 cm)", rA.plastico.serve || rA.bolha.serve, false);
// Média alta (27×18×9, onda B) tem 8,4 cm por dentro e não serve para 9 cm
const soMediaAlta = escolherCaixaPadrao(Object.assign({}, entA, { caixas: [{ nome: "Média alta", c: 27, l: 18, a: 9 }] }));
igual("K Média alta não serve", soMediaAlta.serve, false);

// ---------- Limites ----------
const grande = { dims: [95, 60, 40], pesoUn: 10000, qtd: 1, protecao: "leve" };
const cxGrande = estimarCaixa(grande);
for (const mod of ["correios", "agencia", "mini"]) {
  igual(`95×60×40 passa do limite (${mod})`, validarLimites(cxGrande.cadastrar, cxGrande.pesos.cadastrar, mod).status, "excede");
  const r = recomendar(Object.assign({}, grande, { modalidade: mod }));
  const alerta = r.dicas.find((d) => d.id === "limite");
  igual(`95×60×40 alerta vermelho (${mod})`, alerta ? alerta.nivel : null, "alerta");
  igual(`95×60×40 texto da multa (${mod})`, alerta ? /R\$ 50 por pedido/.test(alerta.texto) : false, true);
}
igual("95×60×40 soma > 200", validarLimites(cxGrande.cadastrar, 1000, "correios").itens.find((i) => i.id === "soma").status, "excede");
igual("J nota de Mini Envios", rJ.dicas.some((d) => d.id === "mini" && d.nivel === "positivo"), true);
igual("A não cabe no Mini Envios", rA.dicas.some((d) => d.id === "mini"), false);
igual("Perto do limite: soma 185 cm", validarLimites([90, 60, 35], 1000, "correios").status, "perto");
igual("Perto do limite: 27 kg", validarLimites([30, 20, 10], 27000, "correios").status, "perto");
igual("Dentro do limite", validarLimites([20, 15, 10], 460, "correios").status, "ok");
igual("Agência aceita lado de 110 cm", validarLimites([110, 20, 10], 1000, "agencia").status, "perto");
igual("Correios recusa lado de 110 cm", validarLimites([110, 20, 10], 1000, "correios").status, "excede");

// ---------- Outros ----------
igual("pesoCubico 20×15×10", pesoCubico(20, 15, 10), 500);
igual("arranjos 1 unidade = 1 bloco", arranjos([15, 10, 5], 1).length, 1);
igual("arranjos 4 unidades incluem 20×15×10", arranjos([15, 10, 5], 4).some((a) => a.bloco.join("x") === "20x15x10"), true);
igual("Kit B: dica com arranjo", recomendar({ dims: [15, 10, 5], pesoUn: 300, qtd: 4, protecao: "media" }).dicas.some((d) => d.id === "kit"), true);
igual("Proteção alta: dica FRÁGIL", recomendar({ dims: [8, 8, 8], pesoUn: 150, protecao: "alta" }).dicas.some((d) => d.id === "fragil"), true);
igual("Dica de tamanho em A (folga menor)", /cai de 500 g para/.test(rA.dicas.find((d) => d.id === "tamanho").texto), true);
igual("lerNumero 33,5", lerNumero("33,5"), 33.5);
igual("lerNumero 33.5", lerNumero("33.5"), 33.5);
igual("lerNumero vazio", Number.isNaN(lerNumero("")), true);

console.log(`\n${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
