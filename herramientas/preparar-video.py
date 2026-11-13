#!/usr/bin/env python3
"""
Prepara un trabajo del portafolio: crea el video completo, el preview y la portada,
con el nombre correcto y en la carpeta correcta.

Uso:
    python herramientas/preparar-video.py ORIGEN.mp4 reel 01 "Café de especialidad"
    python herramientas/preparar-video.py ORIGEN.mp4 reel 03 "Mi reel" --inicio 5

Necesita FFmpeg instalado (https://ffmpeg.org/download.html).
"""
import argparse
import datetime
import re
import shutil
import subprocess
import sys
import unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent

# Medidas por tipo: (carpeta, alto máx. del completo, alto del preview, alto de la portada)
TIPOS = {
    "reel": ("reels", 1920, 640, 1280),
}


def slug(texto: str) -> str:
    """'Café de especialidad' -> 'cafe-de-especialidad'"""
    s = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return s or "sin-nombre"


def ffmpeg(*args: str) -> None:
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args]
    res = subprocess.run(cmd)
    if res.returncode != 0:
        sys.exit("FFmpeg falló. Revisa que el archivo de origen exista y sea un video válido.")


def main() -> None:
    ap = argparse.ArgumentParser(description="Prepara los 3 archivos de un trabajo del portafolio.")
    ap.add_argument("origen", help="Video original (el que exportas del editor)")
    ap.add_argument("tipo", choices=TIPOS.keys(), help="Por ahora solo existe reel (vertical 9:16)")
    ap.add_argument("numero", help="Número de dos cifras, por ejemplo 01")
    ap.add_argument("nombre", help='Nombre del trabajo entre comillas, por ejemplo "Café de especialidad"')
    ap.add_argument("--inicio", type=float, default=1.0, help="Segundo desde el que salen el preview y la portada (por defecto 1)")
    args = ap.parse_args()

    if not shutil.which("ffmpeg"):
        sys.exit("No encuentro FFmpeg. Instálalo desde https://ffmpeg.org/download.html y vuelve a intentar.")
    origen = Path(args.origen)
    if not origen.is_file():
        sys.exit(f"No encuentro el archivo: {origen}")

    carpeta, alto_completo, alto_preview, alto_portada = TIPOS[args.tipo]
    numero = args.numero.zfill(2)
    base = f"{args.tipo}-{numero}-{slug(args.nombre)}"
    destino = RAIZ / "media" / carpeta
    destino.mkdir(parents=True, exist_ok=True)

    print(f"Creando {base} ...")
    ffmpeg("-i", str(origen),
           "-vf", f"scale=-2:'min({alto_completo},ih)'",
           "-c:v", "libx264", "-crf", "23", "-preset", "slow", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart",
           str(destino / f"{base}.mp4"))
    ffmpeg("-ss", str(args.inicio), "-t", "4", "-i", str(origen),
           "-vf", f"scale=-2:{alto_preview}", "-an",
           "-c:v", "libx264", "-crf", "28", "-preset", "slow", "-pix_fmt", "yuv420p",
           "-movflags", "+faststart",
           str(destino / f"{base}-preview.mp4"))
    ffmpeg("-ss", str(args.inicio), "-i", str(origen),
           "-frames:v", "1", "-vf", f"scale=-2:{alto_portada}", "-q:v", "3",
           str(destino / f"{base}.jpg"))

    print("\nListo. Archivos creados en media/%s/:" % carpeta)
    for sufijo in (".mp4", "-preview.mp4", ".jpg"):
        f = destino / f"{base}{sufijo}"
        print(f"  {f.name}  ({f.stat().st_size / 1024 / 1024:.1f} MB)")
    categoria = "Reel"
    print("\nPega esta línea en js/data.js, dentro de la lista %ss:" % args.tipo)
    print(f'  {{ id: "{base}", title: "{args.nombre}", category: "{categoria}", year: {datetime.date.today().year} }},')


if __name__ == "__main__":
    main()
