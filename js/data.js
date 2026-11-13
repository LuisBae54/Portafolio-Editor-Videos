/* ==========================================================================
   CONTENIDO DEL PORTAFOLIO
   Aquí cambias textos, enlaces y la lista de reels. Todo lo de abajo es
   de ejemplo: reemplázalo por lo tuyo.

   Los textos que se traducen van como { es: "...", en: "..." }.
   Los titulares en varias líneas van como listas, con el mismo número de
   líneas en los dos idiomas.

   Los videos se buscan por el "id" de cada trabajo. Si el id es
   "reel-01-cafe-de-especialidad", la web busca:
     media/reels/reel-01-cafe-de-especialidad.mp4          (video completo)
     media/reels/reel-01-cafe-de-especialidad-preview.mp4  (preview corto)
     media/reels/reel-01-cafe-de-especialidad.jpg          (portada)
   Mira GUIA-VIDEOS.md para el detalle.
   ========================================================================== */

window.PORTFOLIO = {
  name: "André",
  role: { es: "Editor de video", en: "Video editor" },

  // Titular del hero: una línea por elemento (3 líneas en cada idioma).
  headline: {
    es: ["Título de", "ejemplo para", "el inicio."],
    en: ["Sample", "headline for", "the start."],
  },
  intro: {
    es: "Texto de ejemplo. Aquí va una descripción corta sobre ti y lo que haces.",
    en: "Sample text. A short description about you and what you do goes here.",
  },

  // Textos de otras secciones (también de ejemplo)
  reelsIntro: {
    es: "Texto de ejemplo para describir la sección de reels.",
    en: "Sample text to describe the reels section.",
  },
  contactTitle: {
    es: ["Texto de ejemplo", "para contacto."],
    en: ["Sample text", "for contact."],
  },
  marquee: { es: "Texto de ejemplo", en: "Sample text" },

  // Contacto (deja "" lo que no uses y desaparece el enlace)
  email: "correo@ejemplo.com",
  whatsapp: {
    es: "https://wa.me/580000000000?text=Hola%2C%20vi%20tu%20portafolio%20y%20quiero%20hablar%20de%20un%20proyecto.",
    en: "https://wa.me/580000000000?text=Hi%2C%20I%20saw%20your%20portfolio%20and%20I%27d%20like%20to%20talk%20about%20a%20project.",
  },
  instagram: "https://instagram.com/tu_usuario",
  tiktok: "https://tiktok.com/@tu_usuario",
  youtube: "",

  // Videos verticales (9:16). El orden de la lista es el orden en la web.
  reels: [
    { id: "reel-01-lineas-masglo", title: "Líneas Masglo", category: "Reel", year: 2026 },
    { id: "reel-02-fhocos", title: "Fhocos", category: "Reel", year: 2026 },
    { id: "reel-03-la-estrella", title: "La Estrella", category: "Reel", year: 2026 },
    { id: "reel-04-japon-china-corea", title: "Japón, China y Corea", category: "Reel", year: 2026 },
    { id: "reel-05-invercucine", title: "Invercucine", category: "Reel", year: 2026 },
    { id: "reel-06-masglo-70k", title: "Masglo 70K", category: "Reel", year: 2026 },
    { id: "reel-07-soho-room-reel-recap", title: "Soho Room Reel Recap", category: "Reel", year: 2026 },
    { id: "reel-08-turquia", title: "Turquía", category: "Reel", year: 2026 },
  ],

  // Cómo trabajas (es una secuencia, por eso va numerada).
  process: [
    {
      title: { es: "Me envías el material", en: "You send me the footage" },
      text: {
        es: "Me pasas lo que grabaste y me cuentas dónde se va a publicar y qué quieres lograr.",
        en: "You share what you shot and tell me where it will be published and what you want to achieve.",
      },
    },
    {
      title: { es: "Estructuro y corto", en: "I structure and cut" },
      text: {
        es: "Armo la historia, quito lo que sobra y dejo un primer corte con buen ritmo.",
        en: "I build the story, trim the extras and deliver a first cut with good pacing.",
      },
    },
    {
      title: { es: "Ritmo, color y sonido", en: "Pace, color and sound" },
      text: {
        es: "Subtítulos, música, efectos, corrección de color y mezcla de audio.",
        en: "Captions, music, effects, color correction and audio mixing.",
      },
    },
    {
      title: { es: "Revisiones y entrega", en: "Revisions and delivery" },
      text: {
        es: "Ajustamos lo que haga falta y te entrego los archivos listos para publicar.",
        en: "We adjust whatever is needed and I hand you the files ready to publish.",
      },
    },
  ],
  processIntro: {
    es: "Texto de ejemplo para describir cómo es tu proceso de trabajo.",
    en: "Sample text to describe how your work process goes.",
  },

  tools: ["Premiere Pro", "After Effects", "DaVinci Resolve"],
};
