# Portafolio de editor de video

Sitio estático (HTML, CSS y JavaScript). Sin instalación: todas las librerías ya están en `js/vendor/` y la fuente en `fonts/`.

## Ver el sitio
Usa un servidor local (no abras el HTML con doble clic):
- VS Code: extensión **Live Server**, o
- Terminal en esta carpeta: `python -m http.server 8000` y abre http://localhost:8000

## Qué editar
- `js/data.js`: tu nombre, textos (en español e inglés), enlaces, y la lista de reels.
- `js/i18n.js`: textos de la interfaz en español e inglés.
- `index.html`: título y descripción de la pestaña (líneas `<title>` y `<meta name="description">`).
- `css/base.css`: colores en `:root` (variable `--accent` para el azul, `--ink` y `--paper`).
- Videos: mira `GUIA-VIDEOS.md`.

## Estructura
```
index.html
css/base.css          colores (claro y oscuro), tipografía, nav, timeline, reproductor
css/sections.css      hero, reels, proceso, contacto y responsive
js/data.js            contenido editable (bilingüe)
js/i18n.js            textos de la interfaz ES / EN
js/main.js            animaciones y lógica
js/vendor/            GSAP, ScrollTrigger y Lenis (copias locales)
fonts/                Archivo (variable)
media/reels/          tus reels
herramientas/         script para preparar reels
```

## Funciones
- **Glitch suave** en el titular de la portada cuando el mouse pasa sobre las letras (solo con mouse).
- **Clics al deslizar**: sonidos sintetizados, sin archivos de audio. El botón con el altavoz (arriba a la derecha) los activa o silencia. Los navegadores solo dejan sonar audio después de la primera interacción (un clic o una tecla). Para que arranquen apagados, cambia `SOUND_DEFAULT` a `false` al inicio de `js/main.js`.
- **Modo oscuro** (botón de la luna) e **idioma ES / EN**: se recuerdan en el navegador.
- **Responsive**: menú a pantalla completa, reels como tira con scroll táctil, el reel visible reproduce su preview solo, reproductor con deslizar para cambiar de reel.

## Estado
- Escritorio completo. Laptops pequeñas, tablets y celulares: primera versión hecha.
- Pendiente: probar en dispositivos reales, previews más livianos para datos móviles y ajustes finos por pantalla.
- Con "reducir movimiento" activado en el sistema, se omiten la pantalla de carga y las animaciones de entrada.
