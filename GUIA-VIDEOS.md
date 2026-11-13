# Guía de videos del portafolio

Esta guía explica dónde guardar los videos y cómo nombrarlos para que la web los encuentre sola.

## La idea en corto

Cada reel se compone de **3 archivos** con el mismo nombre base:

| Archivo | Para qué sirve | Cuándo se carga |
|---|---|---|
| `NOMBRE.mp4` | El video completo, con sonido | Solo cuando alguien hace clic para verlo |
| `NOMBRE-preview.mp4` | Un adelanto de 4 segundos, sin sonido | Cuando alguien pasa el cursor por encima |
| `NOMBRE.jpg` | La portada (un fotograma) | Al instante, mientras carga lo demás |

Se hace así por rendimiento: la web nunca descarga los videos completos hasta que alguien los abre. Lo que se ve al pasar el cursor son los previews, que pesan muy poco.

## Dónde guardarlos

```
media/
└─ reels/     ← videos verticales (9:16): reels, TikToks, shorts
```

No hay más carpetas que crear. Los 3 primeros reels también aparecen como tarjetas flotantes en la portada (usan sus previews).

## Cómo nombrarlos

Formato: **`tipo-NN-nombre-corto`**

- `tipo`: siempre `reel`.
- `NN`: número de dos cifras (`01`, `02`, … `10`, `11`). Sirve para ordenarlos tú.
- `nombre-corto`: en minúsculas, **sin tildes, sin espacios, sin ñ ni símbolos**; las palabras se separan con guion `-`.

Ejemplo completo:

```
media/reels/reel-01-cafe-de-especialidad.mp4
media/reels/reel-01-cafe-de-especialidad-preview.mp4
media/reels/reel-01-cafe-de-especialidad.jpg
```

Reglas que evitan problemas:

- Las extensiones van en minúscula: `.mp4` y `.jpg` (no `.MP4` ni `.jpeg`). Los servidores distinguen mayúsculas.
- El nombre del preview siempre es el nombre base + `-preview`.
- Una vez publicado, no cambies el nombre de un archivo sin cambiarlo también en `js/data.js`.

## Agregar un trabajo nuevo (2 pasos)

**1.** Copia los 3 archivos a la carpeta `media/reels/`.

**2.** Agrega una línea en `js/data.js`, dentro de la lista `reels`. El `id` es el nombre base, sin extensión:

```js
{ id: "reel-09-mi-nuevo-trabajo", title: "Mi nuevo trabajo", category: "Reel", year: 2026 },
```

El orden de la lista es el orden en la web. Para quitar un trabajo, borra su línea (los archivos pueden quedarse en la carpeta).

## Cómo preparar los archivos (recomendado)

Necesitas [FFmpeg](https://ffmpeg.org/download.html) instalado. Hay dos formas.

### Opción A: con el script incluido (más fácil)

Un solo comando crea los 3 archivos, bien nombrados y en su carpeta:

```
python herramientas/preparar-video.py MI-VIDEO.mp4 reel 01 "Café de especialidad"
```

Los valores son: el archivo original, `reel`, el número y el nombre. Al terminar te imprime la línea lista para pegar en `js/data.js`.

Si quieres que el preview y la portada salgan de otro momento del video, agrega `--inicio 5` (segundo 5).

### Opción B: con FFmpeg a mano

Cambia `ORIGEN.mp4` y el nombre:

```
# Video completo (máx. 1080x1920, H.264 + AAC, listo para internet)
ffmpeg -i ORIGEN.mp4 -vf "scale=-2:'min(1920,ih)'" -c:v libx264 -crf 23 -preset slow -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart media/reels/reel-01-cafe-de-especialidad.mp4

# Preview de 4 segundos, sin audio, 360x640
ffmpeg -ss 1 -t 4 -i ORIGEN.mp4 -vf "scale=-2:640" -an -c:v libx264 -crf 28 -preset slow -pix_fmt yuv420p -movflags +faststart media/reels/reel-01-cafe-de-especialidad-preview.mp4

# Portada (un fotograma del segundo 1)
ffmpeg -ss 1 -i ORIGEN.mp4 -frames:v 1 -vf "scale=-2:1280" -q:v 3 media/reels/reel-01-cafe-de-especialidad.jpg
```

## Medidas y pesos recomendados

| | Reel (vertical 9:16) |
|---|---|
| Video completo | hasta 1080x1920 |
| Preview | alto 640 px, 3 a 5 s, sin audio |
| Portada | alto 1280 px |
| Peso del completo | 5 a 20 MB |
| Peso del preview | menos de 1 MB |
| Peso de la portada | menos de 150 KB |

Formato siempre **MP4 con H.264 y AAC** y la opción `+faststart` (ya incluida en los comandos), para que empiece a reproducirse sin esperar a que baje todo.

## Hosting: ojo con el peso

- Si publicas en **Cloudflare Pages** (como la web de referencia), cada archivo puede pesar como máximo unos **25 MB**. Revisa el límite vigente en su documentación. Si un reel lo supera, comprímelo más (sube el `-crf` a 26 o 28).
- Si el sitio tiene muchos reels, otra opción es un servicio de video (Cloudflare Stream, Bunny, etc.) y apuntar a esos enlaces. Eso se puede hacer en la fase de optimización.

## Qué pasa si falta algún archivo

La web no se rompe, solo muestra un reemplazo:

- **Falta la portada (`.jpg`):** se ve un degradado de color con el texto "Falta la portada" y la ruta que espera.
- **Falta el preview:** se ve la portada, sin movimiento al pasar el cursor.
- **Falta el video completo:** al hacer clic, el reproductor muestra un mensaje con la ruta exacta que no encuentra.

Si algo no se ve, lo primero es comparar el nombre del archivo con el `id` de `js/data.js`: tiene que coincidir letra por letra.

## Probar en tu computadora

Evita abrir `index.html` con doble clic. Lo mejor es usar un servidor local:

- En VS Code, la extensión **Live Server** (clic derecho en `index.html`, "Open with Live Server").
- O desde la carpeta del proyecto: `python -m http.server 8000` y abrir `http://localhost:8000`.

## Lista de revisión antes de publicar

- [ ] Cada trabajo tiene sus 3 archivos con el mismo nombre base.
- [ ] Nombres en minúsculas, sin espacios ni tildes; extensiones `.mp4` y `.jpg`.
- [ ] Cada `id` de `js/data.js` coincide con los nombres de archivo.
- [ ] Los previews pesan menos de 1 MB y los videos completos no pasan del límite de tu hosting.
- [ ] Probaste: pasar el cursor, hacer clic, flechas del teclado y la tecla Esc.
