# -*- coding: utf-8 -*-
"""Gera olhinhos/personagens.js a partir de referencias_site/personagens_finais.json.
Cada função procedural de magic_eyes.py / ds_eyes.py vira uma receita (lista ordenada de camadas),
traduzida linha a linha. uso: python gerar_personagens.py <personagens_finais.json> <saida personagens.js>"""
import json, sys

G6 = [0, 18, 40, 62, 82, 100]
SPARK = [[-0.42, 0.42, 1.0], [0.5, 0.18, 0.7], [-0.15, -0.55, 0.55], [0.32, -0.38, 0.45], [0.05, 0.62, 0.4]]
GALAXY_DOTS = [[-.55, .3, .5], [-.3, .6, .35], [.1, .45, .4], [.45, .5, .3], [.6, .1, .45], [-.65, -.1, .35], [-.4, -.45, .3], [.2, -.2, .25],
               [.5, -.45, .35], [-.1, .15, .3], [.3, .2, .22], [-.2, -.2, .25], [0, -.65, .3], [.7, -.2, .25], [-.5, .05, .22]]

# ---------- camadas (mesmos nomes e padrões das funções da classe Eye) ----------
def brilho(cor, pico, tam, x=0, y=0, esp=False, **k): return dict(t="brilho", cor=cor, pico=pico, tam=tam, x=x, y=y, **({"esp": True} if esp else {}), **k)
def meialua(cor, pico, h=.34, **k): return dict(t="meialua", cor=cor, pico=pico, h=h, **k)
def sombra(cor, pico, f=.22, **k): return dict(t="sombra", cor=cor, pico=pico, f=f, **k)
def borda(cor, pico, w=.1): return dict(t="borda", cor=cor, pico=pico, w=w)
def paint(t, cor, pico, desf, **k): return dict(t=t, cor=cor, pico=pico, desf=desf, **k)
def brilhinhos(cor, pts, pico, tam=.06, esp=True): return dict(t="brilhinhos", cor=cor, pico=pico, tam=tam, pts=pts, **({"esp": True} if esp else {}))
def pontinhos(cor, pts, pico, tam=.035, esp=True, desf=.015): return dict(t="pontinhos", cor=cor, pico=pico, tam=tam, desf=desf, pts=pts, **({"esp": True} if esp else {}))
def estrias(cor, pico=.16): return dict(t="estrias", cor=cor, pico=pico)
def kanji(textos, cor, pico=.85, tams=(.5, .62)): return dict(t="kanji", cor=cor, pico=pico, textos=list(textos), tams=list(tams))
F = dict(forte=True)

# ---------- magic_eyes.py ----------
MAGIC = {
 "galaxia": (["#1A1250", "#2E2290", "#5434C0", "#8A4CD8", "#C060D8", "#F0A0E0"], [0, 20, 42, 64, 84, 100], [
   brilho("#FF8AD8", .35, .7, -.25, -.3), brilho("#7AA8FF", .3, .55, .3, .25),
   pontinhos("#FFFFFF", GALAXY_DOTS, .8, .036), brilhinhos("#FFFFFF", SPARK[:3], .85, .09),
   meialua("#F8C8F0", .45), sombra("#0A0630", .35)]),
 "estrela": (["#0E2E7A", "#1A56B8", "#2E8AE0", "#4CBCF0", "#8ADEF8", "#CFF4FE"], [0, 20, 42, 64, 84, 100], [
   brilho("#B8F4FF", .45, .7, 0, -.15), paint("estrela", "#0A1E5A", .7, .04, R=.38, x=0, y=-.02),
   pontinhos("#FFFFFF", [[-.48, .4, 1.4], [.45, .48, .8], [.55, -.3, .6], [-.4, -.5, .55]], .55, .045, desf=.02),
   meialua("#D8F6FF", .5), sombra("#061646", .3)]),
 "coracao": (["#6A0A3A", "#A0145C", "#D02A80", "#EA5AA4", "#F6A0CC", "#FFD6EA"], G6, [
   brilho("#FFB0D8", .35, .75, 0, -.1), paint("coracao", "#FFE2F0", .75, .05, R=.4, x=0, y=0),
   brilhinhos("#FFFFFF", [[-.5, .4, 1], [.52, .3, .6]], .55, .07), meialua("#FFD0E6", .4), sombra("#3A0420", .35)]),
 "cristal": (["#0E4A3A", "#127A5C", "#1EA880", "#46CCA0", "#90E8C4", "#D2FAEA"], G6, [
   brilho("#B8FFE6", .45, .8, 0, -.05),
   paint("forma", "#E8FFF6", .4, .012, contorno=.016,
         polis=[[[0, .78], [.62, .2], [.4, -.62], [-.4, -.62], [-.62, .2]], [[0, .34], [.26, .06], [.16, -.28], [-.16, -.28], [-.26, .06]]],
         segs=[[[0, .78], [0, .34]], [[.62, .2], [.26, .06]], [[.4, -.62], [.16, -.28]], [[-.4, -.62], [-.16, -.28]], [[-.62, .2], [-.26, .06]]]),
   paint("forma", "#FFFFFF", .3, .05, polis=[[[0, .34], [.26, .06], [.16, -.28], [-.16, -.28], [-.26, .06]]]),
   brilhinhos("#FFFFFF", [[0, .05, 1.6], [-.48, .42, .7], [.5, -.35, .5]], .8, .07), meialua("#D8FFF0", .35), sombra("#042A20", .35)]),
 "mel": (["#5A2004", "#943E06", "#C86A0E", "#E89422", "#F6BC48", "#FCDC8A"], [0, 20, 44, 64, 84, 100], [
   paint("liquido", "#FFD878", .5, .05, y0=1.05, amp=.06, freq=4.2, fase=0, fase2=1.2),
   paint("gotas", "#3A1202", .32, .05, itens=[[-.45, .5, .13], [-.05, .72, .16], [.38, .42, .12]], esp=True),
   brilho("#FFE6A0", .5, .6, 0, -.25),
   pontinhos("#FFF6D8", [[-.4, -.45, 1.1], [-.1, -.62, .7], [.35, -.5, .9], [.15, -.32, .55], [-.55, -.25, .5], [.55, -.2, .55]], .7, .035, desf=.012),
   brilhinhos("#FFFFFF", [[-.45, .45, .8]], .6, .07), sombra("#3A1202", .35)]),
 "gelo": (["#2A4E86", "#4A78B8", "#78A8DC", "#A6CCEE", "#D0E6F8", "#F0F8FE"], G6, [
   *[paint("forma", "#FFFFFF" if k % 2 == 0 else "#20406E", .35 if k % 2 == 0 else .2, .04, polis=[sh], esp=True) for k, sh in enumerate(
     [[[0, 0], [-.55, .65], [-.1, .8]], [[0, 0], [.55, .7], [.85, .2]], [[0, 0], [.8, -.35], [.35, -.85]], [[0, 0], [-.4, -.85], [-.85, -.25]], [[0, 0], [-.9, .2], [-.6, .6]]])],
   paint("forma", "#FFFFFF", .5, .02, segs=[[[-.45, .8], [0, 0], [.5, -.6]]], w=.03),
   meialua("#F4FAFF", .5), sombra("#14284A", .3)]),
 "sol": (["#0A1650", "#142A84", "#1E44B0", "#2E62C8", "#4C84D8", "#7AA8E6"], [0, 20, 42, 64, 84, 100], [
   paint("sol", "#FFD23A", .85, .02, n=12, longo=.78, curto=.5, base=.1), brilho("#FFE680", .8, .32),
   meialua("#9CC4F0", .4), sombra("#040A30", .35)]),
 "gato": (["#063E3A", "#0A6A5E", "#14968A", "#2CC0AA", "#78DEC8", "#C2F6E8"], G6, [
   brilho("#9CFFE0", .45, .9), paint("fenda", "#03302A", .6, .06, larg=.1, y0=.18, y1=1.82),
   brilhinhos("#FFFFFF", [[-.42, .45, 1], [.5, -.3, .55]], .5, .07), meialua("#D0FAF0", .4), sombra("#022420", .35)]),
 "dente_de_leao": (["#6A3A04", "#A8660A", "#D89A16", "#F0C230", "#F8DE6A", "#FDF2B0"], G6, [
   paint("raios", "#FFF8D8", .5, .012, n=36, r0=.12, r1=.82, w=.018, rot=0, ponta=.035),
   brilho("#FFF0A0", .55, .35), sombra("#3A1E02", .35)]),
 "flor": (["#7A0E30", "#B0204E", "#DA3E70", "#F06C96", "#F8A6C0", "#FFD8E4"], G6, [
   paint("petalas", "#FFE0EA", .45, .03, modo="anel", n=12, rot=15, dist=.55, a=.3, b=.1),
   brilho("#FFD24A", .7, .28), meialua("#FFE0EA", .3), sombra("#3A0618", .35)]),
 "arco_iris": (["#3A2E9A", "#2E70D8", "#2EC0D0", "#6AD480", "#F2D850", "#F890B8"], [0, 20, 40, 60, 80, 100], [
   brilho("#FFFFFF", .3, .6, 0, .1), brilhinhos("#FFFFFF", SPARK[:4], .55, .065), sombra("#1A1050", .35)]),
 "aurora": (["#1E1450", "#3A2E8A", "#4E6CC0", "#40B8C0", "#7AE0B8", "#C8F6E0"], G6, [
   paint("faixas", "#B080FF", .45, .07, y0=.62, amp=.08, freq=3, fase=0, fase2=.8, alt=.14),
   paint("faixas", "#7CFFD0", .4, .07, y0=.95, amp=.07, freq=3, fase=1.3, fase2=.8, alt=.14),
   pontinhos("#FFFFFF", GALAXY_DOTS[:8], .45, .022), meialua("#D8FFF0", .4), sombra("#0A0630", .35)]),
 "ceu": (["#1A5AB0", "#2A7ED6", "#4AA6EE", "#78C6F6", "#AADEFA", "#DCF2FE"], G6, [
   paint("nuvens", "#FFFFFF", .7, .045, itens=[[-.35, .25, 1.0], [.4, -.15, .85], [-.1, -.55, .7]], esp=True),
   brilhinhos("#FFFFFF", [[.5, .5, .7]], .7, .07), meialua("#EAF8FF", .4), sombra("#0A2A60", .35)]),
 "lua": (["#0C0E34", "#1A1E5A", "#2A3282", "#3E4EA8", "#6276C8", "#9AAEE4"], G6, [
   brilho("#C8D6FF", .4, .5, .05, .05, esp=True),
   paint("lua", "#F2F0FF", .85, .02, R=.44, x=.02, y=.05, corte=.2, cy=.1, k=.92, esp=True),
   pontinhos("#FFFFFF", [[-.55, .45, .9], [.55, .5, .6], [.6, -.4, .7], [-.5, -.5, .5], [.2, .65, .45]], .7, .025),
   brilhinhos("#FFFFFF", [[.5, .3, .7], [-.45, -.3, .5]], .75, .07), meialua("#B8C8F4", .35), sombra("#04051A", .4)]),
 "petala": (["#8A2450", "#B8406E", "#DC6890", "#EE96B2", "#F8C0D2", "#FFE6EE"], G6, [
   paint("petalas", "#FFF0F6", .7, .025, L=.2, W=.12, esp=True,
         itens=[[-.35, .35, 30, 1.0], [.4, .2, -40, .85], [-.05, -.15, 75, .95], [.45, -.45, 10, .7], [-.5, -.4, -60, .75], [.1, .6, 120, .6]]),
   brilhinhos("#FFFFFF", [[.55, .55, .6]], .6, .07), meialua("#FFE4EE", .35), sombra("#4A0A24", .35)]),
}

# ---------- ds_eyes.py ----------
DS = {
 "tanjiro": (["#2A0406", "#5A0A10", "#901820", "#BE2C2C", "#DC5434", "#EE8A4C"], G6, [
   paint("chamas", "#FF8A3A", .45, .07, base=1.95, itens=[[-.5, .5, .2, -.2], [-.05, .8, .26, .06], [.48, .52, .2, .2]]),
   brilho("#FF6A2A", .3, .6, 0, -.3), borda("#1A0204", .3, .1), sombra("#120002", .3)]),
 "nezuko": (["#6A1448", "#A02872", "#CE4C98", "#E87CB8", "#F6AED4", "#FFDDEE"], G6, [
   paint("aneis", "#FFE6F2", .35, .05, k=0, fr=[.62], w=.06), brilho("#A01468", .55, .5, 0, .02),
   paint("chamas", "#FFC0DE", .45, .05, base=1.97, itens=[[-.55, .42, .13, -.12], [-.2, .42, .13, .05], [.18, .42, .13, -.05], [.55, .42, .13, .12]]),
   sombra("#3A0626", .35)]),
 "zenitsu": (["#5A2C02", "#965006", "#CC7E10", "#ECA828", "#F8CE60", "#FDEAA6"], G6, [
   brilho("#FFE070", .5, .7),
   paint("forma", "#FFF6C0", .75, .03, polis=[[[-.12, .82], [.2, .2], [.02, .14], [.24, -.5], [-.16, .08], [.02, .12]]], esp=True),
   meialua("#FFF0B8", .4), sombra("#2A1202", .35)]),
 "inosuke": (["#1E3A12", "#33561E", "#4E7A2E", "#72A048", "#A2C878", "#D2EAB0"], G6, [
   paint("aneis", "#14280A", .3, .03, k=8, fr=[.4, .68, .92], w=.03, rot=22.5), brilho("#D8F4A8", .4, .4), sombra("#0A1806", .3)]),
 "giyu": (["#061A4A", "#0E3478", "#1A56A8", "#3080CC", "#62AEE6", "#A6D8F8"], G6, [
   paint("ondas", "#CCEEFF", .55, .025, ys=[.55, .85, 1.15, 1.45], amp=.07, freq=3.4, fase=0, fase2=1.1, passo=1, w=.035),
   brilho("#8ACCFF", .35, .6, 0, -.2), sombra("#020A26", .4)]),
 "shinobu": (["#E8DCF4", "#E2C8F0", "#B84ACC", "#7E2E9C", "#58207C", "#3A1260"], [0, 14, 30, 46, 72, 100], [
   brilho("#D25AD2", .35, .75, 0, .42)]),
 "rengoku": (["#7A0E04", "#B42406", "#E04A0C", "#F07A14", "#F8A82C", "#FCD060"], G6, [
   borda("#9A0A02", .7, .16), paint("sol", "#FFE070", .7, .045, n=12, longo=.66, curto=.42, base=.1, **F),
   brilho("#FFF0A0", .7, .32), sombra("#3A0402", .3)]),
 "tengen": (["#5A0A1A", "#8E1428", "#BE2A3E", "#D8505E", "#EC8C92", "#F8C6C8"], G6, [
   paint("aneis", "#FFD8DC", .3, .025, k=0, fr=[.38, .62, .86], w=.022), brilho("#FF8A96", .35, .5),
   meialua("#FFE0E2", .4), sombra("#2A0208", .35)]),
 "mitsuri": (["#1E5A14", "#2E8A1E", "#46B02E", "#6ECC46", "#A6E478", "#D6F6B8"], G6, [
   paint("coracao", "#E2FFB8", .5, .08, R=.5, x=0, y=-.03, **F), brilho("#F8C8DC", .25, .35), sombra("#0C2A08", .35)]),
 "muichiro": (["#0E4E56", "#1A7A80", "#34A8A8", "#5CC8C0", "#90E2D8", "#CCF6F0"], [0, 16, 36, 58, 80, 100], [
   paint("hachuras", "#0A3A40", .32, .02, n=7, passo=.075, larg=.55, div=8.2, w=.022, **F),
   brilho("#C8FFF6", .35, .6, 0, -.35), meialua("#E2FFFA", .45), sombra("#04262C", .4)]),
 "gyomei": (["#8E8496", "#B0A8B8", "#CEC8D4", "#E2DEE6", "#F0EEF2", "#FAF8FA"], G6, [
   paint("rachaduras", "#6E6478", .3, .02, w=.018, esp=True,
         linhas=[[[0, 0], [-.35, .3], [-.5, .7]], [[0, 0], [.4, .25], [.75, .2]], [[0, 0], [.15, -.45], [.05, -.85]], [[-.35, .3], [-.75, .15]], [[.15, -.45], [.55, -.6]]]),
   brilho("#FFFFFF", .5, .6, 0, .1), sombra("#5A5064", .3)]),
 "sanemi": (["#2A2236", "#3E3450", "#544866", "#6A5E80", "#8E84A2", "#BAB2CA"], G6, [
   paint("redemoinho", "#1A1426", .3, .02, n=8, passo=.1, dx=.03, sx=1.05, sy=.92, w=.02, esp=True, **F),
   meialua("#D2CAE2", .35), sombra("#120C1C", .4)]),
 "obanai": (["#5A3404", "#965A06", "#CC8A10", "#ECB228", "#F8D460", "#FDEEA6"], G6, [
   paint("escamas", "#FFF0B0", .28, .012, s=.22, w=.016, lado="e"), paint("escamas", "#D8FFF4", .28, .012, s=.22, w=.016, lado="d"),
   brilho("#FFD84A", .5, .5, lado="e"), brilho("#7AF0D4", .5, .5, lado="d"), sombra("#0A0A0A", .3)]),
 "kanao": (["#4A1E5E", "#7A3C8E", "#A866B8", "#C890D2", "#E2B8E6", "#F6DEF6"], G6, [brilho("#F6C4F0", .4, .55, 0, -.1), sombra("#24082E", .4)]),
 "tamayo": (["#3E2A5E", "#5E4A86", "#8A78AE", "#B0A4CC", "#D2CAE2", "#EEEAF4"], [0, 18, 38, 56, 78, 100], [brilho("#FFFFFF", .3, .5, 0, -.2), sombra("#1E1230", .45)]),
 "muzan": (["#7A0A14", "#B01824", "#D82C34", "#EC4C4C", "#F47A72", "#FAAEA6"], G6, [
   brilho("#FF3A3A", .5, .7), paint("raios", "#5A0208", .35, .012, n=36, r0=.22, r1=.95, w=.01, rot=0, jit=[1, .8, .92, .7], **F),
   paint("fenda", "#3A0004", .65, .05, larg=.09, y0=.2, y1=1.8, **F), borda("#4A0006", .45, .1), sombra("#2A0004", .3)]),
 "yoriichi": (["#5A0630", "#8E1048", "#BE1E62", "#DA3E80", "#EC7AA8", "#F8B8D2"], G6, [
   paint("raios", "#FFB0CC", .35, .05, n=12, r0=.12, r1=.5, w=.035, rot=15), brilho("#FF8ABA", .4, .45),
   meialua("#FFD2E4", .35), sombra("#2A0214", .4)]),
}
DS_COLORS2 = {"obanai": (["#063A34", "#0A6458", "#14907E", "#30B8A0", "#78DAC4", "#C2F4E8"], G6)}
# versões "realistas" (ds_eyes.DESIGNS): motivos a 50% e estrias da íris por cima
REAL = {"giyu": "#041030", "gyomei": "#5A5064", "mitsuri": "#0C3006", "muichiro": "#022A2E", "obanai": "#2A1A04", "rengoku": "#5A0A02",
        "sanemi": "#1A0A36", "shinobu": "#2A0A40", "tengen": "#2A042A", "yoriichi": "#2A0214", "inosuke": "#0A1806", "kanao": "#2A0A36",
        "nezuko": "#3A0626", "tamayo": "#2A1E40", "tanjiro": "#1A0204", "zenitsu": "#3A1A02", "muzan": "#3A0004"}

# Luas Superiores (_upper): degradê, brilho opcional, extra, estrias a 10%, kanji e sombra no topo
def upper(cols, stops, numero, ink="#2A1004", extra=(), glow=None):
    c = []
    if glow: c.append(brilho(glow, .4, .75))
    c += list(extra)
    c.append(estrias("#5A2A08", .1))
    c.append(kanji(["上弦", numero], ink, .85))
    c.append(sombra("#2A0A02", .25))
    return (cols, stops, c)
S5 = [0, 20, 40, 60, 80, 100]
UPPER = {
 "kokushibo": upper(["#F2B428", "#F6C84A", "#F8D460", "#F6C64A", "#EEB02E", "#D88A14"], S5, "壱",
                    extra=[borda("#8A0606", .9, .2), paint("raios", "#5A0202", .5, .01, n=48, r0=.62, r1=.99, w=.012, rot=0, **F)]),
 "doma": upper(["#F4F0E8"] * 6, S5, "弐", ink="#3A2410", extra=[dict(t="setores", pico=.85, esp=True), brilho("#FFFFFF", .45, .7)]),
 "akaza": upper(["#F4C434", "#F8D454", "#FADC6A", "#F8D050", "#F0B830", "#E0A01C"], S5, "参", extra=[borda("#4AA8E6", .8, .17)]),
 "hantengu": upper(["#E8A81C", "#F2C03A", "#F6CE52", "#F4C442", "#EEB02A", "#E09A16"], S5, "肆", glow="#FFE48A"),
 "gyokko": upper(["#D8700E", "#EA8C18", "#F4A42A", "#F2A026", "#E8861A", "#D46A0E"], S5, "伍", ink="#7A1004", glow="#FFC060"),
 "gyutaro": upper(["#6E9A1E", "#8CB632", "#A8CE4E", "#C0DE70", "#D6EC98", "#EAF6C4"], G6, "陸", ink="#A0141C", glow="#F2FFC8"),
}

def receita(funcao):
    if funcao in MAGIC: cols, st, cam = MAGIC[funcao]; return dict(colors=cols, stops=st, camadas=cam)
    if funcao in UPPER: cols, st, cam = UPPER[funcao]; return dict(colors=cols, stops=st, camadas=cam)
    cols, st, cam = DS[funcao]
    r = dict(colors=cols, stops=st, camadas=list(cam))
    if funcao in DS_COLORS2: r["colors2"], r["stops2"] = DS_COLORS2[funcao]
    if funcao in REAL: r["tom"] = .5; r["camadas"].append(estrias(REAL[funcao]))
    return r

def fx_de(ef):
    fx = {}
    for k, v in ef.items():
        if k == "cres": fx["cres"] = dict(color=v[0], a=v[1], h=v[2])
        elif k == "top": fx["top"] = dict(color=v[0], a=v[1], f=v[2])
        elif k == "glow": fx["glow"] = [dict(color=g[0], peak=g[1], size=g[2], oy=g[3]) for g in v]
        elif k == "mist": fx["mist"] = dict(color=v[0], peak=v[1], **{"from": v[2]}, to=v[3])
        elif k == "rim": fx["rim"] = dict(color=v[0], peak=v[1], w=v[2])
        elif k == "octo_soft": fx["octo"] = dict(color=v[0], peak=v[1], rings=v[2])
        elif k == "gwen": fx["gwen"] = True
        elif k == "arc": fx["arc"] = dict(color=v[0], off=v[1], soft=v[2], base=v[3])
        else: raise SystemExit("efeito desconhecido: " + k)
    return fx

ORDEM = ["Frieren", "Diários de uma Apotecária", "Apotecária · Concubinas", "Apotecária · Cortesãs", "Witch Hat Atelier", "Kimetsu no Yaiba", "Kimetsu · Protagonistas", "Kimetsu · Hashiras",
         "Kimetsu · Onis", "Kimetsu · Especial", "Yomi no Tsugai", "Sailor Moon", "League of Legends", "Olhos mágicos"]

OMITIR = {"Kimetsu · Especial"}

# Diários de uma Apotecária: três subgrupos (cada um começa numa folha nova), em ordem alfabética
RETEMA = {"AH-DUO": "Apotecária · Concubinas", "GYOKUYOU": "Apotecária · Concubinas", "LIHUA": "Apotecária · Concubinas",
          "LISHU": "Apotecária · Concubinas", "LOULAN": "Apotecária · Concubinas"}
ALFABETICOS = {"Diários de uma Apotecária", "Apotecária · Concubinas", "Apotecária · Cortesãs"}
QUANTIDADE = {"JINSHI": 1, "MAOMAO": 1}   # deixaram de ser dobrados
def padrao(nome, tema, cores, paradas, faixa, cres, top):
    return {"nome": nome, "tema": tema, "tipo": "padrao", "cores": cores, "paradas": paradas, "faixa": faixa,
            "efeitos": {"cres": cres, "top": top}, "quantidade": 1}
NOVOS = [
    padrao("FENGXIAN", "Apotecária · Cortesãs", ["#4A0A2E", "#7E1448", "#B02A62", "#D24C80", "#EA86AA", "#F8C2D4"], G6, "#B02A62",
           ["#F8C2D4", .55, .34], ["#4A0A2E", .2, .2]),
    padrao("JOKA", "Apotecária · Cortesãs", ["#3A1206", "#6A240C", "#9A4014", "#C2662A", "#DE9A5E", "#F2CCA2"], G6, "#9A4014",
           ["#F2CCA2", .55, .34], ["#3A1206", .2, .2]),
    padrao("MEIMEI", "Apotecária · Cortesãs", ["#0A3A3E", "#14605E", "#1E8A80", "#3CB0A0", "#82D4C4", "#C4F0E6"], G6, "#1E8A80",
           ["#C4F0E6", .55, .34], ["#0A3A3E", .2, .2]),
    # olho de duas cores: rosa-violeta em cima, âmbar embaixo, com transição suave (8 cores)
    padrao("PAIRIN", "Apotecária · Cortesãs", ["#4E1652", "#8A3482", "#B85AA0", "#CC7EA6", "#DA9C98", "#E4B282", "#F0CC94", "#FBE4B6"],
           [0, 14, 29, 42, 55, 68, 85, 100], "#A84A94", ["#FBE4B6", .5, .32], ["#4E1652", .2, .2]),
]

def main(src, out):
    L = json.load(open(src, encoding="utf-8"))
    for x in L:
        if x["tema"] == "Diários de uma Apotecária":
            x["tema"] = RETEMA.get(x["nome"], x["tema"])
            if x["nome"] in QUANTIDADE: x["quantidade"] = QUANTIDADE[x["nome"]]
    L += NOVOS
    temas = {x["tema"] for x in L}; assert temas == set(ORDEM), temas ^ set(ORDEM)
    # "Kimetsu · Especial" só repetia olhos que já existem nas outras abas de Kimetsu: fica de fora
    L = [x for x in L if x["tema"] not in OMITIR]
    # sort estável: mantém a ordem do JSON dentro do tema (os subgrupos da Apotecária vão em ordem alfabética)
    L.sort(key=lambda x: (ORDEM.index(x["tema"]), x["nome"] if x["tema"] in ALFABETICOS else ""))
    porNome = {}
    for x in L:
        if x["tipo"] == "procedural": porNome.setdefault(x["funcao"], x)
    linhas = []
    for x in L:
        o = {"name": x["nome"], "theme": x["tema"]}
        if x["tipo"] == "padrao":
            o.update(colors=x["cores"], stops=x["paradas"], band=x["faixa"], fx=fx_de(x["efeitos"]))
        elif x["tipo"] == "procedural":
            o.update(receita(x["funcao"])); o["band"] = x["faixa"]; o["proc"] = x["funcao"]
        elif x["tipo"] == "dividido":
            ids = []
            for nome in x["metades"]:
                alvo = next(y for y in L if y["tipo"] == "procedural" and y["nome"] == nome and y["tema"] == "Kimetsu · Protagonistas")
                ids.append(alvo["tema"] + "|" + alvo["nome"])
            o.update(split=ids, band=x["faixa"])
        else: raise SystemExit("tipo desconhecido: " + x["tipo"])
        o["qty"] = x.get("quantidade", 1)
        linhas.append("  " + json.dumps(o, ensure_ascii=False, separators=(", ", ": ")))
    cab = """// Biblioteca de personagens – gerada de referencias_site/personagens_finais.json (NNN personagens; sem a aba “Kimetsu · Especial”,
// que repetia olhos; com as cortesãs da Apotecária e os subgrupos "Apotecária · Concubinas" e "Apotecária · Cortesãs").
// Formato:
//   colors/stops: degradê do topo para a base da íris (stops em %) | band: cor da faixa ("a|b" = faixa de duas cores)
//   fx: efeitos suaves: cres (meia-lua), top (sombra no topo), glow (brilhos), mist (névoa), rim (borda escura),
//       octo (anéis octogonais), gwen (estrelas), arc (arco no topo)
//   camadas: motivos em ordem (porte de magic_eyes.py e ds_eyes.py; tipos em olhos.js › FORMAS)
//       cada camada: t (tipo), cor, pico (intensidade), desf (desfoque), esc (tamanho), esp (espelha no olho direito),
//       lado ("e" = só olho esquerdo, "d" = só direito), forte (ignora o "tom")
//   tom: intensidade geral dos motivos (1 = 100%, 0,5 = 50%, versão "realista")
//   colors2/stops2: degradê próprio do olho direito (olhos diferentes no par)
//   split: linha dividida – os 3 primeiros pares são do 1º personagem e os 3 últimos do 2º
//   qty: 1 = normal, 2 = dobro de olhinhos
//   proc: nome da função Python de origem (só referência)
"""
    cab = cab.replace("NNN", str(len(linhas)))
    open(out, "w", encoding="utf-8").write(cab + "window.SININT_LIB = [\n" + ",\n".join(linhas) + "\n];\n")
    print(len(linhas), "personagens")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
