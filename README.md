<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/banner-noite.svg">
  <img alt="Sementes de magamalabares" src="assets/banner-dia.svg">
</picture>

Repositório pessoal de utilitários: calculadoras, scripts e pequenas ferramentas do dia a dia. Cada utilidade é um pacotinho de sementes, com variedade numerada e o mesmo rótulo.

## Canteiro

| Nº | Utilidade | |
|---|---|---|
| 1 | Quanto eu ganho vendendo? Shopee (CPF) e Nuvemshop, regras de nov/2026 | [abrir](vendas/) |
| 2 | Qual embalagem eu cadastro? Peso e medidas do pacote a partir do produto | [abrir](vendas/embalagem.html) |
| 3 | Folha de olhinhos para amigurumi (Sinint): PDF A4 com olhos em degradê nos tamanhos exatos | [abrir](olhinhos/) |

## Estrutura

```
index.html              ← canteiro com todas as utilidades
assets/
  magamalabares.css     ← cores, fontes e componentes
  magamalabares.js      ← botão dia/noite
  banner-dia.svg
  banner-noite.svg
modelo/index.html       ← copie para plantar uma utilidade nova
vendas/
  index.html            ← Nº 1 · arquivo único, funciona sem internet
  test.js               ← testes das taxas: node vendas/test.js
  embalagem.html        ← Nº 2 · estimador de embalagem, arquivo único
  test-embalagem.js     ← testes da embalagem: node vendas/test-embalagem.js
olhinhos/
  index.html, olhinhos.css  ← Nº 3 · página e estilos próprios
  olhos.js              ← desenha os olhos, monta a folha A4 e gera o PDF (jsPDF)
  personagens.js        ← biblioteca de personagens (edite aqui)
  logo.js               ← logo Sinint obrigatória dos PDFs (SVG)
  app.js, assets.js, vendor/, fontes/, gerador_olhinhos_sinint.zip
```

Os PDFs do Nº 3 saem iguais aos de referência gerados pelo script Python (mesmo texto, posições a até 0,1 mm), inclusive dois detalhes do original: os personagens com quantidade dobrada ficam no fim da seção, e o espaçamento de 0,8 pt do nome vale também para os rótulos 12MM/10MM e para a régua.

As páginas em `vendas/` têm uma cópia do CSS embutida para funcionar sozinhas. Ao mudar o visual, mude `assets/magamalabares.css` e copie para elas.

## Marca, em resumo

- **Logotipo** em Cherry Bomb One, sempre em minúsculas: `magamalabares`.
- **Cores:** dia (kraft) é o padrão; noite (terra) segue o sistema ou o botão dia/noite. Morango para títulos, links e botões; folha só para resultado positivo e rótulos de variedade.
- **Fontes:** Cherry Bomb One (títulos e valores), Patrick Hand (subtítulos e anotações, nunca em campos), Nunito (texto), DM Mono (variedade, etiquetas).
- **Pacote:** topo xadrez, bordas de 2px, tracejado nas divisórias, cantos de 6px em campos, botões em pílula, sem sombras.

## Utilidade nova

1. Copie `modelo/` para uma pasta com nome curto em minúsculas.
2. Use a próxima variedade livre (Nº 3, Nº 4…).
3. Título como pergunta ou ação; subtítulo com contexto e data das regras.
4. Bloco BOM SABER curto para limitações; regras, fontes e explicações longas dentro de um dropdown (`details.mg-sanfona.mg-letrinha`).
5. Confira nos dois modos (botão dia/noite).
6. Adicione a linha na tabela acima e um `.mg-semente` no `index.html`.
