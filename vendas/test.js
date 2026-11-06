// Testes das regras de taxa (nov/2026).
// Rodar:  node vendas/test.js
// Carrega só o bloco <script id="regras"> de vendas/index.html, sem navegador.
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const m = html.match(/<script id="regras">([\s\S]*?)<\/script>/);
if (!m) { console.error("Bloco <script id=\"regras\"> não encontrado em index.html"); process.exit(1); }
const ctx = {};
vm.createContext(ctx);
vm.runInContext(m[1], ctx);
const { calcShopee, calcNuvemshop, equilibrioShopee, degrausShopee, lerNumero } = ctx;

let ok = 0, falhas = 0;
function igual(nome, obtido, esperado) {
  const passou = typeof esperado === "number" ? Math.abs(obtido - esperado) < 1e-9 : obtido === esperado;
  if (passou) ok++;
  else { falhas++; console.log(`✗ ${nome}: esperado ${esperado}, obtido ${obtido}`); }
}

// ---------- Shopee: CPF até 450 pedidos, sem campanha, 1 item ----------
const tabela = [
  // preço, comissão, taxa fixa, total, recebe
  [5.00,   1.00,  2.50,  3.50,   1.50],
  [30.00,  6.00,  4.50, 10.50,  19.50],
  [50.00, 10.00,  4.50, 14.50,  35.50],
  [79.99, 16.00,  4.50, 20.50,  59.49],
  [80.00, 11.20, 16.00, 27.20,  52.80],
  [150.00, 21.00, 20.00, 41.00, 109.00],
  [500.00, 70.00, 26.00, 96.00, 404.00], // bate com o exemplo oficial da Shopee
];
for (const [preco, com, fixa, total, recebe] of tabela) {
  const r = calcShopee({ preco }).item;
  igual(`Shopee ${preco} comissão`, r.comissao, com);
  igual(`Shopee ${preco} taxa fixa`, r.taxaFixa, fixa);
  igual(`Shopee ${preco} total`, r.totalTaxas, total);
  igual(`Shopee ${preco} recebe`, r.recebe, recebe);
}

igual("Shopee +450 pedidos a 50,00 recebe", calcShopee({ preco: 50, mais450: true }).item.recebe, 32.50);
igual("Shopee 3 itens a 30,00 recebe", calcShopee({ preco: 30, qtd: 3 }).total.recebe, 58.50);
igual("Shopee 3 itens a 30,00 por item", calcShopee({ preco: 30, qtd: 3 }).item.recebe, 19.50);

// Lucro e campanha (consistência)
igual("Shopee 50 custo 20 embalagem 2 lucro", calcShopee({ preco: 50, custo: 20, embalagem: 2 }).item.lucro, 13.50);
igual("Shopee 100 campanha 3% taxa", calcShopee({ preco: 100, campanhaPct: 3 }).item.taxaCampanha, 3.00);

// Degraus deduzidos da tabela e pontos de equilíbrio
igual("Degraus", JSON.stringify(Array.from(degrausShopee())), "[80,100,200]");
igual("Equilíbrio faixa R$ 80", equilibrioShopee(80, {}).preco, 87.78);
igual("Equilíbrio faixa R$ 100", equilibrioShopee(100, {}).preco, 104.64);
igual("Equilíbrio faixa R$ 200", equilibrioShopee(200, {}).preco, 206.96);
igual("Recebe a 79,99 (referência)", equilibrioShopee(80, {}).recebeAntes, 59.49);
igual("Recebe a 99,99 (referência)", equilibrioShopee(100, {}).recebeAntes, 69.99);
igual("Recebe a 199,99 (referência)", equilibrioShopee(200, {}).recebeAntes, 151.99);

// ---------- Nuvemshop ----------
const n1 = calcNuvemshop({ preco: 79.90, plano: "comeco", prazo: 30 });
igual("Nuvem 79,90 Começo Pix", n1.pix.recebe, 79.11);
igual("Nuvem 79,90 Começo cartão 30d taxa", n1.cartao.linhas[0].valor, 3.75);
igual("Nuvem 79,90 Começo cartão 30d total", n1.cartao.total, 4.10);
igual("Nuvem 79,90 Começo cartão 30d", n1.cartao.recebe, 75.80);
igual("Nuvem 79,90 Começo boleto", n1.boleto.recebe, 77.51);
igual("Nuvem 79,90 melhor", n1.melhor, "pix");

igual("Nuvem 100 Essencial cartão 30d", calcNuvemshop({ preco: 100, plano: "essencial", prazo: 30 }).cartao.recebe, 95.46);
igual("Nuvem 100 Escala cartão 2d", calcNuvemshop({ preco: 100, plano: "escala", prazo: 2 }).cartao.recebe, 95.66);
igual("Nuvem 100 Essencial Pix frete 15", calcNuvemshop({ preco: 100, plano: "essencial", freteGratis: 15 }).pix.recebe, 84.01);

// Outro meio de pagamento: Impulso 1% + 4,99% sobre 100
igual("Nuvem 100 Impulso outro meio 4,99%", calcNuvemshop({ preco: 100, plano: "impulso", outroMeio: true, outroMeioPct: 4.99 }).outro.recebe, 94.01);

// ---------- Leitura de números ----------
igual("lerNumero 79,90", lerNumero("79,90"), 79.9);
igual("lerNumero 79.90", lerNumero("79.90"), 79.9);
igual("lerNumero R$ 1.234,56", lerNumero("R$ 1.234,56"), 1234.56);
igual("lerNumero vazio", Number.isNaN(lerNumero("")), true);
igual("lerNumero texto", Number.isNaN(lerNumero("abc")), true);

console.log(`\n${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
