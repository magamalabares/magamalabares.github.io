<img alt="Sementes de magamalabares" src="assets/banner-dia.svg">

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
  banner-dia.svg
modelo/index.html       ← copie para plantar uma utilidade nova
vendas/
  index.html            ← Nº 1 · arquivo único, funciona sem internet
  test.js               ← testes das taxas: node vendas/test.js
  embalagem.html        ← Nº 2 · estimador de embalagem, arquivo único
  test-embalagem.js     ← testes da embalagem: node vendas/test-embalagem.js
olhinhos/
  index.html, olhinhos.css  ← Nº 3 · página e estilos próprios
  olhos.js              ← desenha os olhos (degradê, efeitos e motivos portados de magic_eyes.py e ds_eyes.py),
                          monta a folha A4 e gera o PDF (jsPDF)
  personagens.js        ← biblioteca: 76 personagens em 11 temas (edite aqui; "Prefixo · Categoria" vira subaba do anime)
  ferramentas/gerar_personagens.py  ← regenera personagens.js a partir de personagens_finais.json
  logo.js               ← logo e selo Sinint obrigatórios dos PDFs (SVG)
  assets-kanji.js       ← subset de Noto Serif JP Bold só com 上弦壱弐参肆伍陸 (OFL)
  app.js, assets.js, vendor/, fontes/, gerador_olhinhos_sinint.zip
```

Os PDFs do Nº 3 saem iguais aos de referência gerados pelos scripts Python (mesmo texto e posições, olhos iguais pixel a pixel nas prévias), inclusive detalhes do original: os personagens com quantidade dobrada ficam no fim da seção, e o espaçamento de 0,8 pt do nome vale também para os rótulos 12MM/10MM e para a régua.

As páginas em `vendas/` têm uma cópia do CSS embutida para funcionar sozinhas. Ao mudar o visual, mude `assets/magamalabares.css` e copie para elas.

## Marca, em resumo

- **Logotipo** em Cherry Bomb One, sempre em minúsculas: `magamalabares`.
- **Cores:** só o modo claro (kraft). Morango para títulos, links e botões; folha só para resultado positivo e rótulos de variedade.
- **Fontes:** Cherry Bomb One (títulos e valores), Patrick Hand (subtítulos e anotações, nunca em campos), Nunito (texto), DM Mono (variedade, etiquetas).
- **Pacote:** topo xadrez, bordas de 2px, tracejado nas divisórias, cantos de 6px em campos, botões em pílula, sem sombras.

## Utilidade nova

1. Copie `modelo/` para uma pasta com nome curto em minúsculas.
2. Use a próxima variedade livre (Nº 3, Nº 4…).
3. Título como pergunta ou ação; subtítulo com contexto e data das regras.
4. Bloco BOM SABER curto para limitações; regras, fontes e explicações longas dentro de um dropdown (`details.mg-sanfona.mg-letrinha`).
5. Adicione a linha na tabela acima e um `.mg-semente` no `index.html`.
