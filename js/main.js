/* ==========================================================================
   PORTAFOLIO: lógica principal
   Orden del archivo:
   1. Utilidades, modos, idioma y sonido
   2. Render del contenido desde js/data.js e idioma
   3. Scroll suave, navegación, menú y cursor
   4. Animaciones por sección (incluye el glitch del titular)
   5. Timeline fija
   6. Herramientas: idioma, tema oscuro y sonido
   7. Reproductor (modal con transición desde la tarjeta)
   8. Pantalla de carga e intro
   ========================================================================== */
(() => {
  'use strict';

  const D = window.PORTFOLIO;
  const I18N = window.I18N;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const html = document.documentElement;

  // Cambia a false si no quieres que los clics al deslizar estén activados por defecto
  const SOUND_DEFAULT = true;

  /* ---------- 1. Modos ---------- */
  const mqDesktop = matchMedia('(min-width: 1025px)');
  const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  const mqFine = matchMedia('(hover: hover) and (pointer: fine)');

  const ANIM = !mqReduce.matches;               // animaciones de entrada
  const FULL = mqDesktop.matches && ANIM;       // reels anclados + efectos pesados
  const CURSOR = mqDesktop.matches && mqFine.matches;

  html.classList.toggle('no-pin', !FULL);
  mqDesktop.addEventListener('change', () => location.reload());
  mqReduce.addEventListener('change', () => location.reload());
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } }
  };

  /* ---------- Idioma ---------- */
  let LANG = store.get('pf-lang') === 'en' ? 'en' : 'es';
  const L = (key, vars) => {
    let s = I18N[LANG] && I18N[LANG][key];
    if (s === undefined) s = I18N.es[key] ?? key;
    if (vars && typeof s === 'string') for (const k in vars) s = s.replace(`{${k}}`, vars[k]);
    return s;
  };
  // Valor traducible de data.js: { es, en } o un valor simple
  const T = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? (v[LANG] ?? v.es ?? '') : v);

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const mediaPath = (kind, id, suffix = '') => `media/${kind}/${id}${suffix}`;
  const hueFor = (kind, i) => (215 + i * 47) % 360;
  const pad2 = (n) => String(n).padStart(2, '0');
  const timecode = (sec) => {
    const s = Math.max(0, sec);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = Math.floor(s % 60);
    const f = Math.floor((s % 1) * 30);
    return `${pad2(h)}:${pad2(m)}:${pad2(ss)}:${pad2(f)}`;
  };
  const clock = (sec) => (isFinite(sec) ? `${Math.floor(sec / 60)}:${pad2(Math.floor(sec % 60))}` : '0:00');

  // Pone un titular en líneas enmascaradas (si ya existen, solo cambia el texto)
  function setLines(el, lines) {
    lines = lines || [];
    let ls = $$(':scope > .line', el);
    if (ls.length !== lines.length) {
      el.innerHTML = lines.map(() => '<span class="line"><span></span></span>').join('');
      ls = $$(':scope > .line', el);
    }
    ls.forEach((ln, i) => {
      const sp = ln.firstElementChild;
      sp.textContent = lines[i];
      sp.dataset.text = lines[i]; // lo usa el glitch del titular
      if (el.hasAttribute('aria-label')) ln.setAttribute('aria-hidden', 'true');
    });
  }

  /* ---------- Sonido: clics sintetizados (no usa archivos de audio) ----------
     Los navegadores solo dejan crear/iniciar el audio después de una interacción
     real (clic, toque o tecla). Por eso el AudioContext se crea solo cuando ya hubo
     una interacción válida, y seguimos intentando en cada clic/tecla hasta que
     esté corriendo. Hasta entonces el scroll no suena y el botón del altavoz late. */
  const Sound = (() => {
    let ctx = null, master = null, noise = null, last = 0;
    let enabled = SOUND_DEFAULT;
    let onChange = () => {};
    const saved = store.get('pf-sound');
    if (saved) enabled = saved === 'on';

    const activated = () => !('userActivation' in navigator) || navigator.userActivation.hasBeenActive;
    const running = () => !!ctx && ctx.state === 'running';

    function build() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
      const len = Math.floor(ctx.sampleRate * 0.06);
      noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      ctx.addEventListener('statechange', () => { onChange(); if (running()) unbind(); });
      return true;
    }

    // Se llama solo desde eventos de usuario
    function ensure() {
      if (!activated()) return false;           // p. ej. F12 o una tecla que no cuenta
      if (!ctx && !build()) return false;
      if (ctx.state !== 'running') ctx.resume().catch(() => {});
      return true;
    }

    const EVENTS = ['pointerup', 'click', 'keydown', 'touchend'];
    const handler = () => { ensure(); if (running()) unbind(); };
    function bind() { EVENTS.forEach((ev) => window.addEventListener(ev, handler, { passive: true, capture: true })); }
    function unbind() { EVENTS.forEach((ev) => window.removeEventListener(ev, handler, { capture: true })); }
    bind();
    // Al volver a la pestaña el navegador puede haber suspendido el audio
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && ctx && ctx.state !== 'running') bind();
    });

    // Un clic corto: ráfaga de ruido filtrada + un "toc" grave muy breve
    function tick(pitch = 1, vol = 1) {
      if (!enabled || !running()) return;
      const now = ctx.currentTime;
      if (now - last < 0.04) return;
      last = now;

      const src = ctx.createBufferSource();
      src.buffer = noise;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2400 * pitch;
      bp.Q.value = 5;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.16 * vol, now + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
      src.connect(bp); bp.connect(g); g.connect(master);
      src.start(now); src.stop(now + 0.05);

      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(1100 * pitch, now);
      o.frequency.exponentialRampToValueAtTime(600 * pitch, now + 0.03);
      const og = ctx.createGain();
      og.gain.setValueAtTime(0.0001, now);
      og.gain.exponentialRampToValueAtTime(0.05 * vol, now + 0.002);
      og.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
      o.connect(og); og.connect(master);
      o.start(now); o.stop(now + 0.05);
    }

    return {
      ensure, tick,
      get enabled() { return enabled; },
      get ready() { return running(); },
      set onChange(fn) { onChange = fn; },
      set(v) { enabled = v; store.set('pf-sound', v ? 'on' : 'off'); if (v) ensure(); }
    };
  })();

  function initScrollSound() {
    const STEP = 140; // un clic cada 140 px de scroll
    let lastY = window.scrollY, acc = 0, lastT = performance.now();
    window.addEventListener('scroll', () => {
      const y = window.scrollY, dy = Math.abs(y - lastY);
      lastY = y;
      const now = performance.now();
      const speed = dy / Math.max(16, now - lastT); // px por ms
      lastT = now;
      acc += dy;
      if (acc >= STEP) {
        acc %= STEP;
        const s = Math.min(speed, 3);
        Sound.tick(0.92 + s * 0.1 + (Math.random() * 0.06 - 0.03), 0.7 + s * 0.12);
      }
    }, { passive: true });
  }

  /* ---------- 2. Render del contenido ---------- */
  const reelEls = [];   // .reel__media de cada reel
  const reelHits = [];  // botón de cada reel (para el aria-label)
  let measureMarquee = () => {};
  let refreshClipLabels = () => {};

  const lazyIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const v = e.target;
      if (v.dataset.src && !v.getAttribute('src')) { v.src = v.dataset.src; v.load(); }
      lazyIO.unobserve(v);
    });
  }, { rootMargin: '0px 60% 0px 60%' });

  function bindHoverPlay(hoverEl, flagEl, video) {
    video.addEventListener('playing', () => flagEl.classList.add('is-playing'));
    video.addEventListener('error', () => flagEl.classList.remove('is-playing'));
    hoverEl.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'touch') return; // en táctil se controla por visibilidad
      if (!video.getAttribute('src') && video.dataset.src) { video.src = video.dataset.src; video.load(); }
      video.play().catch(() => {});
    });
    hoverEl.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'touch') return;
      video.pause();
      flagEl.classList.remove('is-playing');
    });
  }

  // Parte que no cambia con el idioma
  function buildStatic() {
    $('#steps').innerHTML = D.process.map((s, i) => `
      <li class="step">
        <span class="step__n">${pad2(i + 1)}</span>
        <h3></h3>
        <p></p>
      </li>`).join('');

    const social = [['Instagram', D.instagram], ['TikTok', D.tiktok], ['YouTube', D.youtube]].filter((x) => x[1]);
    $('#socials').innerHTML = social.map(([n, u]) => `<li><a class="ulink" href="${esc(u)}" target="_blank" rel="noopener"><span>${n}</span></a></li>`).join('');

    const mail = $('#contactMail');
    if (D.email) { mail.href = `mailto:${D.email}`; $('span', mail).textContent = D.email; } else mail.hidden = true;
    const insta = $('#endInsta');
    if (D.instagram) insta.href = D.instagram; else insta.hidden = true;

    const row = `<div class="marquee__row">${'<span></span>'.repeat(3)}</div>`;
    $('#marqueeTrack').innerHTML = row + row;
    $('#footName').textContent = `© ${new Date().getFullYear()} ${D.name}`;
  }

  // Todo lo que depende del idioma (se vuelve a llamar al cambiar de idioma)
  function applyLang() {
    html.lang = LANG;
    document.title = `${D.name} — ${T(D.role)}`;
    const md = $('meta[name="description"]');
    if (md) md.content = L('meta.desc', { name: D.name });
    $('#navBrand').textContent = D.name;

    $$('[data-i18n]').forEach((el) => {
      const v = L(el.dataset.i18n);
      el.textContent = v;
      if ('t' in el.dataset) el.dataset.t = v;
    });
    $$('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', L(el.dataset.i18nAria)));
    $$('[data-i18n-lines]').forEach((el) => setLines(el, L(el.dataset.i18nLines)));

    const ht = $('#heroTitle');
    ht.setAttribute('aria-label', (T(D.headline) || []).join(' '));
    setLines(ht, T(D.headline));
    setLines($('#contactTitle'), T(D.contactTitle));

    $('#heroIntro').textContent = T(D.intro) || '';
    $('#reelsLead').textContent = T(D.reelsIntro) || '';
    $('#processIntro').textContent = T(D.processIntro) || '';

    const tools = D.tools || [];
    $('#processTools').textContent = tools.length
      ? L('process.tools', { list: tools.length > 1 ? `${tools.slice(0, -1).join(', ')} ${L('and')} ${tools[tools.length - 1]}` : tools[0] })
      : '';

    $$('.step').forEach((el, i) => {
      $('h3', el).textContent = T(D.process[i].title);
      $('p', el).textContent = T(D.process[i].text);
    });

    const whats = T(D.whatsapp) || (D.email ? `mailto:${D.email}` : '#contacto');
    $('#heroWhats').href = whats;
    $('#contactBtn').href = whats;

    const phrase = T(D.marquee) || '';
    $$('.marquee__row span').forEach((s) => { s.textContent = phrase; });
    measureMarquee();

    $('#reelsCount').textContent = `${D.reels.length} ${D.reels.length === 1 ? L('reels.one') : L('reels.many')}`;
    reelHits.forEach((b, i) => b.setAttribute('aria-label', L('reel.aria', { t: D.reels[i].title })));

    refreshClipLabels();
    refreshToolStates();
    if (P && P.video) syncPlayUi();
  }

  function renderReels() {
    const track = $('.reels__track');
    const end = $('.reels__end');
    D.reels.forEach((r, i) => {
      const el = document.createElement('article');
      el.className = 'reel';
      el.style.setProperty('--hue', hueFor('reels', i));
      el.innerHTML = `
        <div class="reel__media">
          <div class="reel__inner">
            <img class="reel__poster" src="${mediaPath('reels', r.id, '.jpg')}" alt="" decoding="async">
            <video class="reel__video" muted loop playsinline preload="none" data-src="${mediaPath('reels', r.id, '-preview.mp4')}"></video>
          </div>
          <p class="reel__hint">Falta la portada:<br>media/reels/${esc(r.id)}.jpg</p>
          <button class="reel__hit" type="button" data-cursor="Ver"></button>
        </div>
        <div class="reel__meta"><h3>${esc(r.title)}</h3><span>${esc(r.category)}, ${esc(r.year)}</span></div>`;
      track.insertBefore(el, end);

      const media = $('.reel__media', el);
      const img = $('.reel__poster', el);
      const video = $('.reel__video', el);
      img.addEventListener('error', () => { img.remove(); el.classList.add('no-poster'); });
      lazyIO.observe(video);
      bindHoverPlay(media, el, video);
      const hit = $('.reel__hit', el);
      hit.addEventListener('click', () => openPlayer('reels', i));
      reelEls.push(media);
      reelHits.push(hit);
    });
  }

  function renderHeroCards() {
    $$('.hcard').forEach((card, i) => {
      const r = D.reels[i];
      if (!r) { card.remove(); return; }
      const v = document.createElement('video');
      v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true; v.preload = 'auto';
      v.setAttribute('muted', '');
      v.src = mediaPath('reels', r.id, '-preview.mp4');
      v.addEventListener('error', () => v.remove());
      $('.hcard__inner', card).append(v);
    });
    const hv = $$('.hcard video');
    new IntersectionObserver((en) => {
      en.forEach((e) => hv.forEach((v) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause())));
    }).observe($('.hero'));
  }

  // En pantallas táctiles no hay hover: el reel más visible reproduce su preview
  function initTouchPreview() {
    if (mqFine.matches) return;
    const cards = $$('.reel');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const card = e.target;
        const video = $('.reel__video', card);
        if (e.isIntersecting && e.intersectionRatio >= 0.6) {
          if (!video.getAttribute('src') && video.dataset.src) { video.src = video.dataset.src; video.load(); }
          video.play().catch(() => {});
        } else {
          video.pause();
          card.classList.remove('is-playing');
        }
      });
    }, { threshold: [0, 0.6, 1] });
    cards.forEach((c) => io.observe(c));
  }

  /* ---------- 3. Scroll suave, navegación, menú y cursor ---------- */
  let lenis = null;
  if (FULL) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  const sectionStart = (el) => {
    const box = el.closest('.pin-spacer') || el;
    return Math.round(box.getBoundingClientRect().top + window.scrollY);
  };
  function scrollToY(y) {
    const dist = Math.abs(y - window.scrollY);
    if (lenis) {
      lenis.scrollTo(y, {
        duration: Math.min(2.8, Math.max(1.2, dist / 2200)),
        easing: (t) => (t < 0.5 ? 8 * t ** 4 : 1 - Math.pow(-2 * t + 2, 4) / 2)
      });
    } else window.scrollTo({ top: y, behavior: ANIM ? 'smooth' : 'auto' });
  }

  const nav = $('#nav');
  const navParts = () => $$('.nav__brand, .nav__burger, .nav__links, .nav__tools');

  function setMenu(open) {
    nav.classList.toggle('is-menu', open);
    html.classList.toggle('menu-open', open);
    html.classList.toggle('is-locked', open);
    $('#navBurger').setAttribute('aria-expanded', String(open));
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-go]');
    if (!a) return;
    const target = $(a.dataset.go);
    if (!target) return;
    e.preventDefault();
    const wasOpen = nav.classList.contains('is-menu');
    if (wasOpen) setMenu(false);
    // Si el menú estaba abierto, esperamos un instante para que el bloqueo de scroll se libere
    setTimeout(() => scrollToY(sectionStart(target)), wasOpen ? 60 : 0);
  });

  function initMenu() {
    $('#navBurger').addEventListener('click', () => setMenu(!nav.classList.contains('is-menu')));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('is-menu')) setMenu(false); });
    mqDesktop.addEventListener('change', () => setMenu(false));
  }

  function initCursor() {
    if (!CURSOR) return;
    html.classList.add('has-cursor');
    const c = $('.cursor');
    const label = $('span', c);
    const xTo = gsap.quickTo(c, 'x', { duration: 0.3, ease: 'power3.out' });
    const yTo = gsap.quickTo(c, 'y', { duration: 0.3, ease: 'power3.out' });
    let first = true;
    window.addEventListener('pointermove', (e) => {
      if (first) { gsap.set(c, { x: e.clientX, y: e.clientY }); first = false; }
      xTo(e.clientX); yTo(e.clientY);
      c.classList.add('is-on');
    }, { passive: true });
    document.addEventListener('pointerover', (e) => {
      const t = e.target;
      const view = t.closest('[data-cursor]');
      c.classList.toggle('is-hidden', !!t.closest('[data-cursor-hide]'));
      if (view) {
        label.textContent = L('reels.view') === 'reels.view' ? 'Ver' : L('reels.view');
        c.classList.add('is-view'); c.classList.remove('is-link');
        return;
      }
      c.classList.remove('is-view');
      c.classList.toggle('is-link', !!t.closest('a, button, [role="slider"]'));
    });
    document.documentElement.addEventListener('mouseleave', () => c.classList.remove('is-on'));
  }

  /* ---------- 4. Animaciones por sección ---------- */
  function revealTitle(title, opts = {}) {
    if (!ANIM) return;
    const spans = $$('.line > span', title);
    if (!spans.length) return;
    gsap.set(spans, { yPercent: 112 });
    ScrollTrigger.create({
      trigger: opts.trigger || title,
      containerAnimation: opts.containerAnimation,
      start: opts.start || 'top 82%',
      once: true,
      onEnter: () => gsap.to(spans, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.08 })
    });
  }

  function initHero() {
    const hero = $('.hero');
    if (!FULL) return;

    gsap.to('.hero__inner', { yPercent: -14, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__stage', { yPercent: -26, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });

    if (!mqFine.matches) return;
    // El mouse cambia el ancho de la tipografía, mueve las tarjetas y activa el glitch
    const cards = $$('.hcard');
    const title = $('#heroTitle');
    let tw = 64, cw = 64, mx = 0, my = 0, cx = 0, cy = 0, visible = true;
    let px = -999, py = -999, spd = 0, gl = 0;
    new IntersectionObserver((en) => { visible = en[0].isIntersecting; }).observe(hero);
    window.addEventListener('pointermove', (e) => {
      const nx = e.clientX / innerWidth;
      tw = 62 + nx * 26;
      mx = nx * 2 - 1;
      my = (e.clientY / innerHeight) * 2 - 1;
      spd = Math.min(60, Math.hypot(e.clientX - px, e.clientY - py));
      px = e.clientX; py = e.clientY;
    }, { passive: true });

    gsap.ticker.add(() => {
      if (!visible) return;
      cw += (tw - cw) * 0.07;
      cx += (mx - cx) * 0.06;
      cy += (my - cy) * 0.06;
      hero.style.setProperty('--w', cw.toFixed(2));
      cards.forEach((c) => {
        const d = parseFloat(c.dataset.depth) || 1;
        gsap.set(c, { x: -cx * 38 * d, y: -cy * 30 * d });
      });

      // Glitch: solo cuando el cursor está sobre o muy cerca del titular
      const tr = title.getBoundingClientRect();
      const near = px > tr.left - 30 && px < tr.right + 30 && py > tr.top - 30 && py < tr.bottom + 30;
      const target = near ? 0.45 + Math.min(spd / 60, 1) * 0.55 : 0;
      gl += (target - gl) * 0.1;
      spd *= 0.9;
      const on = gl > 0.02;
      title.classList.toggle('is-glitch', on);
      if (on) {
        title.style.setProperty('--g', gl.toFixed(3));
        $$('.line > span', title).forEach((sp) => {
          const r = sp.getBoundingClientRect();
          sp.style.setProperty('--mx', (px - r.left).toFixed(1) + 'px');
          sp.style.setProperty('--my', (py - r.top).toFixed(1) + 'px');
        });
      }
    });
  }

  let reelsTween = null;
  function initReels() {
    const section = $('.reels');
    const track = $('.reels__track');
    if (FULL) {
      const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
      const bar = $('.reels__progress i');
      reelsTween = gsap.to(track, {
        x: () => -dist(),
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => '+=' + dist(),
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          anticipatePin: 1,
          onUpdate: (s) => gsap.set(bar, { scaleX: s.progress })
        }
      });
      $$('.reel').forEach((card) => {
        gsap.fromTo($('.reel__inner', card), { xPercent: -7 }, {
          xPercent: 7, ease: 'none',
          scrollTrigger: { trigger: card, containerAnimation: reelsTween, start: 'left right', end: 'right left', scrub: true }
        });
      });
    }
    revealTitle($('.reels__intro .title'), { trigger: section, start: 'top 70%' });
    if (FULL) revealTitle($('.reels__end .title'), { containerAnimation: reelsTween, start: 'left 85%' });
  }

  function initProcess() {
    const steps = $$('.step');
    gsap.to('.process__rail i', { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '#steps', start: 'top 60%', end: 'bottom 60%', scrub: true } });
    steps.forEach((s) => {
      ScrollTrigger.create({
        trigger: s, start: 'top 62%',
        onEnter: () => s.classList.add('is-on'),
        onLeaveBack: () => s.classList.remove('is-on')
      });
    });
    revealTitle($('.process__left .title'));
  }

  function initContact() {
    const section = $('.contact');
    if (FULL) {
      gsap.fromTo(section,
        { clipPath: 'inset(8vh 5vw 0vh 5vw round 28px 28px 0px 0px)' },
        { clipPath: 'inset(0vh 0vw 0vh 0vw round 0px 0px 0px 0px)', ease: 'none',
          scrollTrigger: { trigger: section, start: 'top bottom', end: 'top 20%', scrub: true } });
    }
    revealTitle($('#contactTitle'), { start: 'top 80%' });

    // La interfaz fija (nav y timeline) toma los colores de la sección de contacto
    ScrollTrigger.create({
      trigger: section, start: 'top 45%',
      onEnter: () => { document.body.dataset.ui = 'contact'; },
      onLeaveBack: () => { document.body.dataset.ui = 'base'; }
    });

    const track = $('#marqueeTrack');
    let pos = 0, visible = false, rowW = 0;
    measureMarquee = () => { const r = $('.marquee__row', track); rowW = r ? r.offsetWidth : 0; };
    new IntersectionObserver((en) => { visible = en[0].isIntersecting; }).observe(track);
    if (ANIM) {
      gsap.ticker.add(() => {
        if (!visible) return;
        const v = lenis ? lenis.velocity : 0;
        pos -= 0.7 + Math.min(Math.abs(v), 40) * 0.3;
        if (rowW && pos <= -rowW) pos += rowW;
        track.style.transform = `translate3d(${pos}px,0,0)`;
      });
    }
    ScrollTrigger.addEventListener('refresh', measureMarquee);
    measureMarquee();

    if (FULL && mqFine.matches) {
      const btn = $('#contactBtn');
      const inner = $('.magnet__in', btn);
      const mk = (el, p) => gsap.quickTo(el, p, { duration: 0.9, ease: 'elastic.out(1, 0.45)' });
      const bx = mk(btn, 'x'), by = mk(btn, 'y'), ix = mk(inner, 'x'), iy = mk(inner, 'y');
      section.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        if (Math.hypot(dx, dy) < r.width * 0.9) { bx(dx * 0.32); by(dy * 0.32); ix(dx * 0.18); iy(dy * 0.18); }
        else { bx(0); by(0); ix(0); iy(0); }
      });
      section.addEventListener('pointerleave', () => { bx(0); by(0); ix(0); iy(0); });
    }
  }

  function initNavHide() {
    let hidden = false;
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: (s) => {
        if (nav.classList.contains('is-menu')) return;
        const y = s.scroll();
        const want = y > 320 && s.direction === 1 ? true : s.direction === -1 ? false : hidden;
        if (want !== hidden) {
          hidden = want;
          gsap.to(navParts(), { yPercent: hidden ? -130 : 0, duration: 0.7, ease: 'expo.out', overwrite: 'auto' });
        }
      }
    });
  }

  /* ---------- 5. Timeline fija ---------- */
  function initTimeline() {
    const secs = $$('[data-clip]');
    const clipsEl = $('#tlClips');
    const head = $('#tlHead');
    const tcEl = $('#tlTc');
    const track = $('#tlTrack');
    const TOTAL_SECONDS = 90; // duración "falsa" que muestra el timecode

    const clips = secs.map((sec) => {
      const a = document.createElement('a');
      a.className = 'clip';
      a.href = '#' + sec.id;
      a.addEventListener('click', (e) => { e.preventDefault(); scrollToY(sectionStart(sec)); });
      clipsEl.append(a);
      return a;
    });
    refreshClipLabels = () => clips.forEach((c, i) => { c.textContent = L('clip.' + secs[i].id); });
    refreshClipLabels();

    let Y = [0, 1], X = [0, 1], vh = innerHeight, lastActive = -1;
    function calc() {
      vh = innerHeight;
      const max = ScrollTrigger.maxScroll(window);
      const starts = secs.map(sectionStart);
      const lastStart = starts[starts.length - 1];
      Y = [...starts, Math.max(max, lastStart + 1)];
      const weights = starts.map((s, i) => {
        const next = i < starts.length - 1 ? starts[i + 1] : Math.max(max, s) + vh * 0.5;
        return Math.max(vh * 0.75, next - s);
      });
      X = [0];
      weights.forEach((w) => X.push(X[X.length - 1] + w));
      clips.forEach((c, i) => { c.style.flexGrow = weights[i]; });
      update(window.scrollY);
    }

    const headX = gsap.quickTo(head, 'x', { duration: 0.45, ease: 'power3.out' });
    function update(y) {
      let i = Y.length - 2;
      for (let k = 0; k < Y.length - 1; k++) { if (y <= Y[k + 1]) { i = k; break; } }
      const t = Math.min(1, Math.max(0, (y - Y[i]) / (Y[i + 1] - Y[i])));
      const ratio = (X[i] + t * (X[i + 1] - X[i])) / X[X.length - 1];
      headX(ratio * track.clientWidth);
      tcEl.textContent = timecode(ratio * TOTAL_SECONDS);
      let active = 0;
      for (let k = 0; k < secs.length; k++) { if (Y[k] <= y + vh * 0.35) active = k; }
      clips.forEach((c, k) => c.classList.toggle('is-active', k === active));
      // Clic más grave al cambiar de sección
      if (lastActive !== -1 && active !== lastActive) Sound.tick(0.62, 1.3);
      lastActive = active;
    }

    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => update(s.scroll()) });
    ScrollTrigger.addEventListener('refresh', calc);
    calc();
  }

  /* ---------- 6. Herramientas: idioma, tema y sonido ---------- */
  function refreshToolStates() {
    const lang = $('#langBtn');
    if (!lang) return;
    $$('span', lang).forEach((s) => s.classList.toggle('is-active', s.dataset.l === LANG));
    lang.setAttribute('aria-label', L('tool.lang'));

    const dark = html.dataset.theme === 'dark';
    const th = $('#themeBtn');
    th.setAttribute('aria-pressed', String(dark));
    th.setAttribute('aria-label', dark ? L('tool.theme.toLight') : L('tool.theme.toDark'));

    const sb = $('#soundBtn');
    sb.classList.toggle('is-off', !Sound.enabled);
    const waiting = Sound.enabled && !Sound.ready;
    sb.classList.toggle('needs-gesture', waiting);
    sb.setAttribute('aria-pressed', String(Sound.enabled));
    sb.setAttribute('aria-label', Sound.enabled ? L('tool.sound.off') : L('tool.sound.on'));
    if (waiting) sb.title = L('tool.sound.hint'); else sb.removeAttribute('title');
  }

  function setTheme(t, origin) {
    const apply = () => {
      html.dataset.theme = t;
      store.set('pf-theme', t);
      const m = $('meta[name="theme-color"]');
      if (m) m.content = t === 'dark' ? '#0B0D1A' : '#FBFAF6';
      refreshToolStates();
    };
    if (document.startViewTransition && ANIM && origin) {
      const { x, y } = origin;
      const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      const vt = document.startViewTransition(apply);
      vt.ready.then(() => {
        html.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
          { duration: 850, easing: 'cubic-bezier(.76,0,.24,1)', pseudoElement: '::view-transition-new(root)' }
        );
      }).catch(() => {});
    } else apply();
  }

  function initTools() {
    $('#themeBtn').addEventListener('click', (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      setTheme(html.dataset.theme === 'dark' ? 'light' : 'dark', { x: r.left + r.width / 2, y: r.top + r.height / 2 });
      Sound.tick(0.8, 1.2);
    });

    $('#langBtn').addEventListener('click', () => {
      LANG = LANG === 'es' ? 'en' : 'es';
      store.set('pf-lang', LANG);
      applyLang();
      ScrollTrigger.refresh();
      if (ANIM) {
        gsap.fromTo('.hero__title .line > span', { yPercent: 55, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.9, ease: 'expo.out', stagger: 0.07 });
        gsap.fromTo(['.hero__intro', '.hero__cta'], { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'expo.out', stagger: 0.06 });
      }
      Sound.tick(1.1, 1);
    });

    $('#soundBtn').addEventListener('click', () => {
      Sound.set(!Sound.enabled);
      refreshToolStates();
      if (Sound.enabled) Sound.tick(1, 1.2);
    });
    Sound.onChange = refreshToolStates;
    refreshToolStates();
  }

  /* ---------- 7. Reproductor ---------- */
  const P = {
    root: $('#player'), frame: $('#plFrame'), media: $('#plMedia'), video: $('#plVideo'), msg: $('#plMsg'),
    play: $('#plPlay'), prog: $('#plProgress'), progI: $('#plProgress i'), time: $('#plTime'), mute: $('#plMute'),
    info: $('#plInfo'), title: $('#plTitle'), meta: $('#plMeta'), close: $('#plClose'),
    prev: $('#plPrev'), next: $('#plNext'), backdrop: $('#plBackdrop'),
    open: false, kind: 'reels', list: [], i: 0, busy: false
  };
  const ui = () => [P.info, P.close, P.prev, P.next];

  function frameRect() {
    const vw = innerWidth, vh = innerHeight;
    const small = vw <= 640;
    const h = Math.min(vh * (small ? 0.74 : 0.84), 920);
    const w = Math.min((h * 9) / 16, vw - 24);
    const hh = (w * 16) / 9;
    return { left: (vw - w) / 2, top: small ? vh * 0.13 : (vh - hh) / 2 - 10, width: w, height: hh };
  }
  const originEl = () => reelEls[P.i];
  const onScreen = (r) => r.width > 0 && r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight;

  function loadItem() {
    const it = P.list[P.i];
    P.title.textContent = it.title;
    P.meta.textContent = `${it.category}, ${it.year}`;
    P.frame.style.setProperty('--hue', hueFor('reels', P.i));
    P.frame.classList.remove('is-error');
    P.msg.hidden = true;
    P.video.pause();
    P.video.poster = mediaPath('reels', it.id, '.jpg');
    P.video.src = mediaPath('reels', it.id, '.mp4');
    P.video.load();
    P.progI.style.transform = 'scaleX(0)';
    P.time.textContent = '0:00';
    syncPlayUi();
  }

  function playCurrent() { P.video.play().catch(() => {}); }

  function syncPlayUi() {
    P.play.textContent = P.video.paused ? L('player.play') : L('player.pause');
    P.mute.textContent = P.video.muted ? L('player.unmute') : L('player.mute');
  }

  P.video.addEventListener('play', syncPlayUi);
  P.video.addEventListener('pause', syncPlayUi);
  P.video.addEventListener('timeupdate', () => {
    const d = P.video.duration;
    if (d) P.progI.style.transform = `scaleX(${P.video.currentTime / d})`;
    P.time.textContent = clock(P.video.currentTime);
    P.prog.setAttribute('aria-valuenow', d ? Math.round((P.video.currentTime / d) * 100) : 0);
  });
  P.video.addEventListener('error', () => {
    if (!P.video.getAttribute('src')) return;
    const it = P.list[P.i];
    P.frame.classList.add('is-error');
    P.msg.hidden = false;
    P.msg.textContent = L('player.missing', { path: `media/reels/${it.id}.mp4` });
  });
  P.video.addEventListener('click', () => (P.video.paused ? P.video.play() : P.video.pause()));
  P.play.addEventListener('click', () => (P.video.paused ? P.video.play() : P.video.pause()));
  P.mute.addEventListener('click', () => { P.video.muted = !P.video.muted; syncPlayUi(); });
  P.prog.addEventListener('click', (e) => {
    const r = P.prog.getBoundingClientRect();
    if (P.video.duration) P.video.currentTime = ((e.clientX - r.left) / r.width) * P.video.duration;
  });

  function openPlayer(kind, index) {
    if (P.open || P.busy) return;
    P.kind = kind;
    P.list = D.reels;
    P.i = index;
    P.open = true;
    P.busy = true;

    html.classList.add('is-locked');
    if (lenis) lenis.stop();
    P.root.classList.add('is-open');
    P.root.setAttribute('aria-hidden', 'false');
    loadItem();

    const from = originEl().getBoundingClientRect();
    const to = frameRect();
    gsap.set(P.frame, { left: from.left, top: from.top, width: from.width, height: from.height, borderRadius: 10, opacity: 1, scale: 1 });
    gsap.set(P.media, { opacity: 1 });
    gsap.to(P.backdrop, { opacity: 1, duration: 0.6, ease: 'power2.out' });
    gsap.to(P.frame, {
      ...to, borderRadius: 14, duration: ANIM ? 1 : 0.01, ease: 'expo.inOut',
      onComplete: () => { P.busy = false; playCurrent(); P.close.focus({ preventScroll: true }); }
    });
    gsap.fromTo(ui(), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.6, delay: ANIM ? 0.5 : 0, stagger: 0.05, ease: 'expo.out' });
  }

  function closePlayer() {
    if (!P.open || P.busy) return;
    P.open = false;
    P.busy = true;
    P.video.pause();
    gsap.to(ui(), { opacity: 0, duration: 0.25, ease: 'power2.out' });

    const target = originEl();
    const r = target ? target.getBoundingClientRect() : null;
    if (r && onScreen(r)) {
      gsap.to(P.frame, { left: r.left, top: r.top, width: r.width, height: r.height, borderRadius: 10, duration: ANIM ? 0.85 : 0.01, ease: 'expo.inOut' });
    } else {
      gsap.to(P.frame, { opacity: 0, scale: 0.92, duration: 0.4, ease: 'power2.in' });
    }
    gsap.to(P.backdrop, {
      opacity: 0, duration: 0.55, delay: 0.25, ease: 'power2.inOut',
      onComplete: () => {
        P.root.classList.remove('is-open');
        P.root.setAttribute('aria-hidden', 'true');
        html.classList.remove('is-locked');
        if (lenis) lenis.start();
        P.busy = false;
        const hit = target && $('button', target.closest('.reel') || target);
        if (hit) hit.focus({ preventScroll: true });
      }
    });
  }

  function stepPlayer(d) {
    if (!P.open || P.busy || P.list.length < 2) return;
    P.busy = true;
    gsap.to(P.media, {
      opacity: 0, duration: 0.2, ease: 'power2.out',
      onComplete: () => {
        P.i = (P.i + d + P.list.length) % P.list.length;
        loadItem();
        gsap.to(P.media, { opacity: 1, duration: 0.4, ease: 'power2.out' });
        gsap.fromTo(P.info, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'expo.out' });
        P.busy = false;
        playCurrent();
      }
    });
  }

  P.close.addEventListener('click', closePlayer);
  P.backdrop.addEventListener('click', closePlayer);
  P.prev.addEventListener('click', () => stepPlayer(-1));
  P.next.addEventListener('click', () => stepPlayer(1));
  window.addEventListener('resize', () => { if (P.open && !P.busy) gsap.set(P.frame, frameRect()); });

  // Deslizar a los lados para cambiar de reel (táctil)
  let swipeX = null;
  P.frame.addEventListener('touchstart', (e) => {
    swipeX = e.target.closest('#plProgress') ? null : e.touches[0].clientX;
  }, { passive: true });
  P.frame.addEventListener('touchend', (e) => {
    if (swipeX === null) return;
    const dx = e.changedTouches[0].clientX - swipeX;
    swipeX = null;
    if (Math.abs(dx) > 60) stepPlayer(dx < 0 ? 1 : -1);
  }, { passive: true });

  document.addEventListener('keydown', (e) => {
    if (!P.open) return;
    if (e.key === 'Escape') closePlayer();
    else if (e.target === P.prog && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      P.video.currentTime += e.key === 'ArrowRight' ? 5 : -5;
    }
    else if (e.key === 'ArrowRight') stepPlayer(1);
    else if (e.key === 'ArrowLeft') stepPlayer(-1);
    else if (e.key === ' ' && !(e.target instanceof HTMLButtonElement)) {
      e.preventDefault();
      P.video.paused ? P.video.play() : P.video.pause();
    } else if (e.key === 'Tab') {
      const f = [P.close, P.prev, P.next, P.play, P.mute].filter((el) => el.offsetParent !== null || el === P.close);
      const idx = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(idx + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });

  /* ---------- 8. Pantalla de carga e intro ---------- */
  function runIntro() {
    const pre = $('.preloader');
    if (!ANIM) { pre.remove(); return; }

    const heroSpans = $$('.hero__title .line > span');
    const fade = ['.hero__intro', '.hero__cta', '.hero__hint'];
    window.scrollTo(0, 0);
    if (lenis) lenis.stop();

    gsap.set(heroSpans, { yPercent: 112 });
    gsap.set(fade, { autoAlpha: 0, y: 26 });
    gsap.set('.hcard', { clipPath: 'inset(100% 0% 0% 0%)' });
    gsap.set('.hcard__inner', { scale: 1.35 });
    gsap.set(navParts(), { yPercent: -130 });
    gsap.set('.timeline', { y: 150 });

    const counter = { v: 0 };
    const tcEl = $('.preloader__tc');
    const fontsReady = Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]);

    gsap.to(counter, {
      v: 1, duration: 1.9, ease: 'power2.inOut',
      onUpdate: () => { tcEl.textContent = timecode(counter.v * 4); },
      onComplete: () => {
        fontsReady.then(() => {
          ScrollTrigger.refresh();
          const tl = gsap.timeline({
            onComplete: () => { pre.remove(); if (lenis) lenis.start(); }
          });
          tl.to('.preloader__center', { autoAlpha: 0, duration: 0.3 })
            .to('.preloader__half--top', { yPercent: -100, duration: 1.15, ease: 'expo.inOut' }, '>')
            .to('.preloader__half--bottom', { yPercent: 100, duration: 1.15, ease: 'expo.inOut' }, '<')
            .to(heroSpans, { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.09 }, '-=0.8')
            .to('.hcard', { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.25, ease: 'expo.inOut', stagger: 0.12 }, '<0.1')
            .to('.hcard__inner', { scale: 1, duration: 1.8, ease: 'expo.out', stagger: 0.12 }, '<')
            .to(fade, { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.1 }, '-=1')
            .to(navParts(), { yPercent: 0, duration: 1, ease: 'expo.out', stagger: 0.06 }, '-=1.1')
            .to('.timeline', { y: 0, duration: 1, ease: 'expo.out' }, '<');
        });
      }
    });
  }

  /* ---------- Arranque ---------- */
  buildStatic();
  renderReels();
  renderHeroCards();
  applyLang();
  initCursor();
  initMenu();
  initTouchPreview();

  // El orden importa: ScrollTrigger calcula las posiciones en el orden de creación
  initHero();
  initReels();
  initProcess();
  initContact();
  initNavHide();
  initTimeline();
  initTools();
  initScrollSound();

  window.addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts.ready.then(() => ScrollTrigger.refresh());

  runIntro();
})();
