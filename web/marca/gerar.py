"""Gera os PNGs da marca mecha a partir de um desenho só.

Uso (na pasta web/marca):  python3 gerar.py
Precisa do rsvg-convert (brew install librsvg).
"""

import subprocess
from pathlib import Path

AQUI = Path(__file__).parent
PUBLICO = AQUI.parent / "public" / "marca"
APP = AQUI.parent / "app"

# nuvem segurando a lupa, sem fundo e sem pés (viewBox 100 x 100)
DESENHO = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="{px}" height="{px}">
  <defs>
    <radialGradient id="corpo" cx="38%" cy="28%" r="85%">
      <stop offset="0%" stop-color="{corpo1}"/>
      <stop offset="100%" stop-color="{corpo2}"/>
    </radialGradient>
    <filter id="suave" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="0.6"/></filter>
  </defs>
  <g transform="translate(0 4)">
    {contorno}
    <g stroke="{traco}" stroke-width="4.2" stroke-linecap="round">
      <path d="M12 31 L19 34.5"/><path d="M17.5 21.5 L22.5 27.5"/><path d="M27.5 15.5 L29 23"/>
    </g>
    <g fill="url(#corpo)" filter="url(#suave)">
      <circle cx="44" cy="58" r="16"/><circle cx="60" cy="44" r="20"/><circle cx="76" cy="58" r="15"/>
      <rect x="28" y="54" width="62" height="22" rx="11"/>
    </g>
    <path d="M67 48 q5.5 -4.5 11 0" fill="none" stroke="{fundo}" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M31 61 L18 76" stroke="{fundo}" stroke-width="8" stroke-linecap="round"/>
    <path d="M31 61 L18 76" stroke="{tinta}" stroke-width="3.6" stroke-linecap="round"/>
    <circle cx="26" cy="67" r="6.2" fill="url(#corpo)" filter="url(#suave)"/>
    <circle cx="42" cy="46" r="17.5" fill="{fundo}"/>
    <circle cx="42" cy="46" r="15" fill="{tinta}"/>
    <circle cx="42" cy="46" r="11.6" fill="{vidro}"/>
    <ellipse cx="43" cy="46.5" rx="5.6" ry="8" fill="{fundo}"/>
    <ellipse cx="41.2" cy="43" rx="1.7" ry="2.3" fill="{brilho}"/>
  </g>
</svg>"""

# a mesma silhueta, preenchida, por trás de tudo: dá contorno para o ícone da aba aparecer em qualquer fundo
CONTORNO = """<g fill="{cor}" stroke="{cor}" stroke-width="5" stroke-linejoin="round">
      <circle cx="44" cy="58" r="16"/><circle cx="60" cy="44" r="20"/><circle cx="76" cy="58" r="15"/>
      <rect x="28" y="54" width="62" height="22" rx="11"/><circle cx="42" cy="46" r="17.5"/>
      <path d="M31 61 L18 76" stroke-width="12" stroke-linecap="round"/>
    </g>"""

BRANCA = dict(corpo1="#ffffff", corpo2="#d4d4d4", tinta="#ffffff", fundo="#0a0a0a", vidro="#ececec", traco="#ffffff", brilho="#ffffff")
# versão roxa da marca (usada em 20/10/2026), guardada
ROXA = dict(corpo1="#ae5eff", corpo2="#9f45ff", tinta="#9f45ff", fundo="#0a0a0a", vidro="#f2f2f2", traco="#9f45ff", brilho="#ffffff")
PRETA = dict(corpo1="#3a3a3a", corpo2="#0a0a0a", tinta="#0a0a0a", fundo="#ffffff", vidro="#1c1c1c", traco="#0a0a0a", brilho="#0a0a0a")


def gerar(nome: str, cores: dict, px: int, destino: Path, contorno: str = ""):
    svg = DESENHO.format(px=px, contorno=contorno, **cores)
    fonte = AQUI / f"{nome}.svg"
    fonte.write_text(svg)
    destino.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["rsvg-convert", "-w", str(px), "-h", str(px), "-o", str(destino), str(fonte)], check=True)
    print("gerado:", destino.relative_to(AQUI.parent))


if __name__ == "__main__":
    gerar("mecha-branca", BRANCA, 1024, PUBLICO / "mecha-branca.png")  # a logo (fundo escuro)
    gerar("mecha-roxa", ROXA, 1024, PUBLICO / "mecha-roxa.png")        # versão roxa, guardada
    gerar("mecha-preta", PRETA, 1024, PUBLICO / "mecha-preta.png")     # para fundo claro
    gerar("mecha-icone", BRANCA, 512, APP / "icon.png", CONTORNO.format(cor="#0a0a0a"))  # ícone da aba
