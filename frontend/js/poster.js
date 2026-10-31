/* ==========================================================================
   Sbl — poster.js
   Brings the HTML posters to life and turns any poster into a PNG / JPG.

   • hydrate()   adds the photo frame, decoration shapes and confetti that are
                 described by data-attributes in the HTML (data-shape,
                 data-decor, data-confetti).
   • toCanvas()  draws a poster onto a 1080 × 1350 canvas by measuring the real
                 HTML layout, so the download looks exactly like the page.
   • download()  saves the poster as PNG or JPG — no new tab, no extra steps.

   Any button with  data-download  inside a poster card, the preview window or
   the editor downloads that poster.  Add  data-format="jpg"  for JPG.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     SHAPES — drawn inside a 0‥1 box (used by CSS clip-path and canvas)
     ------------------------------------------------------------------ */
  function starPath(points, inner) {
    let d = '';
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? 0.5 : 0.5 * inner;
      const a = (Math.PI / points) * i - Math.PI / 2;
      d += (i ? 'L' : 'M') + (0.5 + Math.cos(a) * r).toFixed(4) + ',' + (0.53 + Math.sin(a) * r).toFixed(4);
    }
    return d + 'Z';
  }
  const SHAPES = {
    circle: 'M0.5,0 A0.5,0.5 0 1 1 0.5,1 A0.5,0.5 0 1 1 0.5,0 Z',
    rounded: 'M0.14,0 H0.86 A0.14,0.14 0 0 1 1,0.14 V0.86 A0.14,0.14 0 0 1 0.86,1 H0.14 A0.14,0.14 0 0 1 0,0.86 V0.14 A0.14,0.14 0 0 1 0.14,0 Z',
    arch: 'M0,1 V0.5 A0.5,0.5 0 0 1 1,0.5 V1 Z',
    heart: 'M0.5,0.96 C0.2,0.76 0,0.55 0,0.31 C0,0.14 0.13,0.03 0.28,0.03 C0.39,0.03 0.46,0.09 0.5,0.18 C0.54,0.09 0.61,0.03 0.72,0.03 C0.87,0.03 1,0.14 1,0.31 C1,0.55 0.8,0.76 0.5,0.96 Z',
    star: starPath(5, 0.5),
    hexagon: 'M0.5,0 L0.933,0.25 L0.933,0.75 L0.5,1 L0.067,0.75 L0.067,0.25 Z',
    blob: 'M0.53,0.01 C0.76,0.02 0.96,0.17 0.99,0.42 C1.02,0.68 0.84,0.96 0.55,0.99 C0.26,1.02 0.02,0.83 0.01,0.56 C0,0.29 0.22,0 0.53,0.01 Z'
  };
  const SPARKLE = 'M0,-1 Q0,0 1,0 Q0,0 0,1 Q0,0 -1,0 Q0,0 0,-1 Z';

  /* ------------------------------------------------------------------
     DECORATION SHAPES around the main photo (units: photo box = 0‥100)
     ------------------------------------------------------------------ */
  const ringDot = (deg, r) => ({ t: 'circle', cx: 50 + Math.cos(deg * Math.PI / 180) * 61, cy: 50 + Math.sin(deg * Math.PI / 180) * 61, r, fill: 'accent' });
  const DECOR = {
    none: [],
    ring: [
      { t: 'circle', cx: 50, cy: 50, r: 61, stroke: 'accent', sw: 1.3, dash: [0.01, 4.2] },
      ringDot(-40, 3.4), ringDot(25, 2.4), ringDot(140, 2)
    ],
    blob: [
      { t: 'shape', shape: 'blob', x: -4, y: 2, w: 114, h: 114, fill: 'accent', op: 0.32 },
      { t: 'circle', cx: 2, cy: 8, r: 5, fill: 'accent', op: 0.9 },
      { t: 'circle', cx: 106, cy: 88, r: 3, fill: 'accent', op: 0.9 }
    ],
    layers: [
      { t: 'shape', shape: 'self', x: -5, y: -5, w: 110, h: 110, rot: -9, fill: 'accent', op: 0.25 },
      { t: 'shape', shape: 'self', x: 4, y: 4, w: 104, h: 104, rot: 7, fill: 'accent', op: 0.45 }
    ],
    sparkles: [
      { t: 'sparkle', cx: -8, cy: 6, r: 9, fill: 'accent' },
      { t: 'sparkle', cx: 106, cy: 12, r: 6, fill: '#ffc93c' },
      { t: 'sparkle', cx: 104, cy: 96, r: 8, fill: 'accent' },
      { t: 'sparkle', cx: -4, cy: 88, r: 5, fill: '#ffc93c' },
      { t: 'sparkle', cx: 52, cy: -12, r: 4, fill: '#ffc93c' }
    ],
    dots: Array.from({ length: 14 }, (_, i) => ({
      t: 'circle',
      cx: 50 + Math.cos(i / 14 * Math.PI * 2) * 62,
      cy: 50 + Math.sin(i / 14 * Math.PI * 2) * 62,
      r: i % 2 ? 1.6 : 2.6, fill: 'accent', op: i % 2 ? 0.6 : 1
    }))
  };

  /* Seeded random so confetti is identical on screen and in the download */
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const CONFETTI_COLORS = ['accent', '#ffc93c', '#7c5ce6', '#2a9d8f', '#ff6b5b', '#ffffff'];
  function confettiPrims(seed) {
    const r = rng(Number(seed) || 7), out = [];
    for (let i = 0; i < 70; i++) {
      const cx = r() * 100, cy = r() * 125, fill = CONFETTI_COLORS[Math.floor(r() * CONFETTI_COLORS.length)];
      const kind = r();
      if (kind < 0.45) out.push({ t: 'rect', x: cx, y: cy, w: 2.4, h: 0.9, rot: r() * 180, fill, op: 0.9 });
      else if (kind < 0.8) out.push({ t: 'circle', cx, cy, r: 0.5 + r() * 0.6, fill, op: 0.9 });
      else out.push({ t: 'sparkle', cx, cy, r: 1 + r() * 1.4, fill });
    }
    return out;
  }

  /* ------------------------------------------------------------------
     SVG helpers (screen)
     ------------------------------------------------------------------ */
  const NS = 'http://www.w3.org/2000/svg';
  const col = (c, accent) => (c === 'accent' ? accent : c);

  function primToSvg(p, selfShape) {
    const op = p.op != null ? ` opacity="${p.op}"` : '';
    const fill = p.fill ? `fill="${p.fill === 'accent' ? 'var(--accent)' : p.fill}"` : 'fill="none"';
    if (p.t === 'circle') {
      const stroke = p.stroke ? ` stroke="var(--accent)" stroke-width="${p.sw}" stroke-linecap="round"${p.dash ? ` stroke-dasharray="${p.dash.join(' ')}"` : ''}` : '';
      return `<circle cx="${p.cx}" cy="${p.cy}" r="${p.r}" ${fill}${stroke}${op}/>`;
    }
    if (p.t === 'rect') {
      return `<rect x="${-p.w / 2}" y="${-p.h / 2}" width="${p.w}" height="${p.h}" rx="0.2" transform="translate(${p.cx || p.x} ${p.cy || p.y}) rotate(${p.rot})" ${fill}${op}/>`;
    }
    if (p.t === 'sparkle') {
      return `<path d="${SPARKLE}" transform="translate(${p.cx} ${p.cy}) scale(${p.r})" ${fill}${op}/>`;
    }
    if (p.t === 'shape') {
      const d = SHAPES[p.shape === 'self' ? selfShape : p.shape] || SHAPES.circle;
      return `<path d="${d}" transform="translate(${p.x + p.w / 2} ${p.y + p.h / 2}) rotate(${p.rot || 0}) translate(${-p.w / 2} ${-p.h / 2}) scale(${p.w} ${p.h})" ${fill}${op}/>`;
    }
    return '';
  }

  function injectClipPaths() {
    if (document.getElementById('ps-defs')) return;
    const svg = document.createElementNS(NS, 'svg');
    svg.id = 'ps-defs';
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'absolute';
    svg.innerHTML = '<defs>' + Object.keys(SHAPES).map((k) =>
      `<clipPath id="ps-${k}" clipPathUnits="objectBoundingBox"><path d="${SHAPES[k]}"/></clipPath>`).join('') + '</defs>';
    document.body.prepend(svg);
  }

  /** Build frame + decoration around a main photo (safe to call again after edits). */
  function refreshPhoto(fig) {
    let body = fig.querySelector('.ps-body');
    const img = fig.querySelector('img');
    if (!body) {
      body = document.createElement('div');
      body.className = 'ps-body';
      const frame = document.createElement('div');
      frame.className = 'ps-frame';
      body.appendChild(frame);
      if (img) body.appendChild(img);
      fig.appendChild(body);
    }
    let decor = fig.querySelector('.ps-decor');
    if (!decor) {
      decor = document.createElementNS(NS, 'svg');
      decor.setAttribute('class', 'ps-decor');
      decor.setAttribute('viewBox', '-20 -20 140 140');
      decor.setAttribute('preserveAspectRatio', 'none');
      decor.setAttribute('aria-hidden', 'true');
      fig.insertBefore(decor, body);
    }
    const prims = DECOR[fig.dataset.decor || 'none'] || [];
    decor.innerHTML = prims.map((p) => primToSvg(p, fig.dataset.shape || 'circle')).join('');
  }

  function refreshConfetti(poster) {
    let layer = poster.querySelector(':scope > .poster__confetti');
    const seed = poster.dataset.confetti;
    if (!seed) { if (layer) layer.remove(); return; }
    if (!layer) {
      layer = document.createElementNS(NS, 'svg');
      layer.setAttribute('class', 'poster__confetti');
      layer.setAttribute('viewBox', '0 0 100 125');
      layer.setAttribute('preserveAspectRatio', 'none');
      layer.setAttribute('aria-hidden', 'true');
      const after = poster.querySelector(':scope > .poster__overlay') || poster.querySelector(':scope > .poster__bg');
      after ? after.after(layer) : poster.prepend(layer);
    }
    layer.innerHTML = confettiPrims(seed).map((p) => primToSvg(p)).join('');
  }

  function hydrate(root) {
    injectClipPaths();
    (root || document).querySelectorAll('.poster').forEach((poster) => {
      poster.querySelectorAll('.poster__photo').forEach(refreshPhoto);
      refreshConfetti(poster);
    });
  }

  /* ------------------------------------------------------------------
     CANVAS EXPORT
     ------------------------------------------------------------------ */
  function drawPrims(ctx, prims, box, accent, selfShape) {
    const sx = box.w / 100, sy = box.h / 100;
    prims.forEach((p) => {
      ctx.save();
      ctx.translate(box.x, box.y);
      ctx.scale(sx, sy);
      ctx.globalAlpha = p.op != null ? p.op : 1;
      if (p.t === 'circle') {
        ctx.beginPath(); ctx.arc(p.cx, p.cy, p.r, 0, Math.PI * 2);
        if (p.fill) { ctx.fillStyle = col(p.fill, accent); ctx.fill(); }
        if (p.stroke) {
          ctx.strokeStyle = col(p.stroke, accent); ctx.lineWidth = p.sw; ctx.lineCap = 'round';
          if (p.dash) ctx.setLineDash(p.dash);
          ctx.stroke();
        }
      } else if (p.t === 'rect') {
        ctx.translate(p.cx || p.x, p.cy || p.y); ctx.rotate(p.rot * Math.PI / 180);
        ctx.fillStyle = col(p.fill, accent); ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      } else if (p.t === 'sparkle') {
        ctx.translate(p.cx, p.cy); ctx.scale(p.r, p.r);
        ctx.fillStyle = col(p.fill, accent); ctx.fill(new Path2D(SPARKLE));
      } else if (p.t === 'shape') {
        ctx.translate(p.x + p.w / 2, p.y + p.h / 2); ctx.rotate((p.rot || 0) * Math.PI / 180);
        ctx.translate(-p.w / 2, -p.h / 2); ctx.scale(p.w, p.h);
        ctx.fillStyle = col(p.fill, accent);
        ctx.fill(new Path2D(SHAPES[p.shape === 'self' ? selfShape : p.shape] || SHAPES.circle));
      }
      ctx.restore();
    });
  }

  function shapePath(shape, r) { // path of a shape fitted into rect r (canvas px)
    const p = new Path2D();
    p.addPath(new Path2D(SHAPES[shape] || SHAPES.circle), new DOMMatrix().translate(r.x, r.y).scale(r.w, r.h));
    return p;
  }

  function parsePos(v) { // object-position → [0‥1, 0‥1]
    const parts = String(v || '50% 50%').split(/\s+/);
    const map = { left: 0, top: 0, center: 50, right: 100, bottom: 100 };
    const n = (s) => (s in map ? map[s] : parseFloat(s));
    return [n(parts[0]) / 100, n(parts[1] || '50%') / 100];
  }

  function drawCover(ctx, img, r, pos) {
    if (!img.naturalWidth) return;
    const s = Math.max(r.w / img.naturalWidth, r.h / img.naturalHeight);
    const iw = img.naturalWidth * s, ih = img.naturalHeight * s;
    const [px, py] = parsePos(pos);
    ctx.drawImage(img, r.x + (r.w - iw) * px, r.y + (r.h - ih) * py, iw, ih);
  }

  function roundRect(ctx, x, y, w, h, rad) {
    const r = Math.min(rad, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  const waitImg = (img) => (img.complete && img.naturalWidth) ? Promise.resolve()
    : new Promise((res) => { img.addEventListener('load', res, { once: true }); img.addEventListener('error', res, { once: true }); });

  /* When the site is opened by double-click (file://) browsers refuse to export
     pictures made from the image files.  Open the site through the backend
     (http://localhost:8000) and this is never needed.  (Copies in images/data/
     are still used if that folder exists.) */
  const ROOT = document.body.dataset.root || '';
  const dataLoads = {};
  function keyFor(src) {
    const clean = decodeURIComponent(String(src).split(/[?#]/)[0]);
    const i = clean.lastIndexOf('/images/');
    return i < 0 ? null : clean.slice(i + 1);
  }
  function loadData(key) {
    window.__WC_IMG = window.__WC_IMG || {};
    if (window.__WC_IMG[key]) return Promise.resolve(window.__WC_IMG[key]);
    if (dataLoads[key]) return dataLoads[key];
    const rel = key.replace(/^images\//, '').split('/').join('__');   // e.g. "1 birthday__2.png"
    const file = ROOT + 'images/data/' + rel.split('/').map(encodeURIComponent).join('/') + '.js';
    dataLoads[key] = new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = file;
      s.onload = () => resolve(window.__WC_IMG[key] || null);
      s.onerror = () => { delete dataLoads[key]; resolve(null); };
      document.head.appendChild(s);
    });
    return dataLoads[key];
  }
  function useLocalCopies(clone) {
    return Promise.all(Array.from(clone.querySelectorAll('img')).map(async (img) => {
      const src = img.getAttribute('src') ? img.src : '';
      if (!src || /^(data|blob):/.test(src)) return;
      const key = keyFor(src);
      if (!key) return;
      const data = await loadData(key);
      if (!data) return;
      // Make sure the saved copy is the SAME picture as the file on disk.
      // (If an image file was replaced, its old copy would otherwise be used.)
      const [live, copy] = await Promise.all([sizeOf(src), sizeOf(data)]);
      if (live && copy && (live.w !== copy.w || live.h !== copy.h)) {
        const err = new Error('Outdated download copy: ' + key);
        err.name = 'OutdatedCopy';
        throw err;
      }
      img.src = data;
    }));
  }
  function sizeOf(url) {
    return new Promise((resolve) => {
      const i = new Image();
      i.onload = () => resolve({ w: i.naturalWidth, h: i.naturalHeight });
      i.onerror = () => resolve(null);
      i.src = url;
    });
  }

  let exportHost;
  async function toCanvas(poster, width) {
    width = width || 1080;
    if (!exportHost) {
      exportHost = document.createElement('div');
      exportHost.setAttribute('aria-hidden', 'true');
      exportHost.style.cssText = 'position:fixed;left:-20000px;top:0;width:540px;pointer-events:none;';
      document.body.appendChild(exportHost);
    }
    const clone = poster.cloneNode(true);
    clone.style.width = '540px';
    clone.style.transform = 'none';
    clone.querySelectorAll('img').forEach((i) => { i.loading = 'eager'; });
    exportHost.appendChild(clone);
    try {
      hydrate(clone);
      if (location.protocol === 'file:') await useLocalCopies(clone);
      await Promise.all(Array.from(clone.querySelectorAll('img')).map(waitImg));
      if (document.fonts && document.fonts.ready) {
        const loads = Array.from(clone.querySelectorAll('.poster__text > *')).map((el) => {
          const cs = getComputedStyle(el);
          return document.fonts.load(`${cs.fontStyle} ${cs.fontWeight} 40px ${cs.fontFamily}`, el.textContent || 'a').catch(() => {});
        });
        await Promise.all(loads);
        await document.fonts.ready;
      }

      const pr = clone.getBoundingClientRect();
      const k = width / pr.width;
      const W = width, H = Math.round(pr.height * k), cq = W / 100;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');
      const R = (el) => { const r = el.getBoundingClientRect(); return { x: (r.left - pr.left) * k, y: (r.top - pr.top) * k, w: r.width * k, h: r.height * k }; };
      const accentOf = (el) => getComputedStyle(el).getPropertyValue('--accent').trim() || '#ec5a8c';

      ctx.fillStyle = getComputedStyle(clone).backgroundColor || '#fff';
      ctx.fillRect(0, 0, W, H);

      Array.from(clone.children).forEach((el) => {
        const cs = getComputedStyle(el);
        if (el.hidden || cs.display === 'none' || cs.visibility === 'hidden') return;
        ctx.save();
        if (el.matches('.poster__bg')) {
          drawCover(ctx, el, R(el), cs.objectPosition);
        } else if (el.matches('.poster__overlay')) {
          ctx.fillStyle = cs.backgroundColor; ctx.fillRect(0, 0, W, H);
        } else if (el.matches('.poster__confetti')) {
          drawPrims(ctx, confettiPrims(clone.dataset.confetti), { x: 0, y: 0, w: W, h: H * 100 / 125 }, accentOf(clone));
        } else if (el.matches('.poster__photo')) {
          drawPhoto(ctx, el, R, accentOf(el), cq);
        } else if (el.matches('.poster__logo')) {
          drawLogo(ctx, el, cs, R, k, cq);
        } else if (el.matches('.poster__text')) {
          drawText(ctx, el, cs, R, pr, k, cq);
        }
        ctx.restore();
      });
      return canvas;
    } finally {
      clone.remove();
    }
  }

  function drawPhoto(ctx, fig, R, accent, cq) {
    const box = R(fig);
    const shape = fig.dataset.shape || 'circle';
    // decoration (the SVG covers 140% of the box, starting at -20%)
    drawPrims(ctx, DECOR[fig.dataset.decor || 'none'] || [], box, accent, shape);
    // frame with shadow
    const frame = fig.querySelector('.ps-frame');
    if (frame) {
      const fr = R(frame);
      ctx.save();
      ctx.shadowColor = 'rgba(31,26,46,0.3)'; ctx.shadowBlur = 2.2 * cq; ctx.shadowOffsetY = 1.4 * cq;
      ctx.fillStyle = getComputedStyle(frame).backgroundColor;
      ctx.fill(shapePath(shape, fr));
      ctx.restore();
    }
    const img = fig.querySelector('img');
    if (img && img.naturalWidth) {
      ctx.save();
      ctx.clip(shapePath(shape, box));
      drawCover(ctx, img, box, getComputedStyle(img).objectPosition);
      ctx.restore();
    }
  }

  function drawLogo(ctx, fig, cs, R, k, cq) {
    const img = fig.querySelector('img');
    if (fig.hasAttribute('data-badge')) {
      const r = R(fig);
      ctx.save();
      ctx.shadowColor = 'rgba(31,26,46,0.2)'; ctx.shadowBlur = 2.4 * cq; ctx.shadowOffsetY = 1 * cq;
      ctx.fillStyle = cs.backgroundColor;
      roundRect(ctx, r.x, r.y, r.w, r.h, parseFloat(cs.borderTopLeftRadius) * k || 0);
      ctx.fill();
      ctx.restore();
    }
    if (img && img.naturalWidth) { const r = R(img); ctx.drawImage(img, r.x, r.y, r.w, r.h); }
  }

  function drawText(ctx, block, cs, R, pr, k, cq) {
    if (block.hasAttribute('data-card')) {
      const r = R(block);
      ctx.save();
      ctx.shadowColor = 'rgba(31,26,46,0.18)'; ctx.shadowBlur = 4 * cq; ctx.shadowOffsetY = 1.6 * cq;
      ctx.fillStyle = cs.backgroundColor;
      roundRect(ctx, r.x, r.y, r.w, r.h, parseFloat(cs.borderTopLeftRadius) * k || 0);
      ctx.fill();
      ctx.restore();
    }
    const range = document.createRange();
    Array.from(block.children).forEach((line) => {
      const ls = getComputedStyle(line);
      if (ls.display === 'none') return;
      const size = parseFloat(ls.fontSize) * k;
      ctx.font = `${ls.fontStyle} ${ls.fontWeight} ${size}px ${ls.fontFamily}`;
      ctx.fillStyle = ls.color;
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      const spacing = parseFloat(ls.letterSpacing);
      if ('letterSpacing' in ctx) ctx.letterSpacing = (isNaN(spacing) ? 0 : spacing * k) + 'px';
      const upper = ls.textTransform === 'uppercase';
      const effect = line.dataset.effect;
      const accent = ls.getPropertyValue('--accent').trim() || '#ec5a8c';

      const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const re = /\S+/g; let m;
        while ((m = re.exec(node.data))) {
          range.setStart(node, m.index);
          range.setEnd(node, m.index + m[0].length);
          const rects = range.getClientRects();
          if (!rects.length) continue;
          const word = upper ? m[0].toUpperCase() : m[0];
          const rc = rects[0];
          const x = (rc.left - pr.left) * k;
          const top = (rc.top - pr.top) * k, h = rc.height * k;
          const tm = ctx.measureText(word);
          const asc = tm.fontBoundingBoxAscent, desc = tm.fontBoundingBoxDescent;
          const y = (asc != null && desc != null) ? top + asc + (h - asc - desc) / 2 : top + h * 0.8;
          ctx.save();
          if (effect === 'shadow') { ctx.shadowColor = 'rgba(31,26,46,0.4)'; ctx.shadowBlur = 1.2 * cq; ctx.shadowOffsetY = 0.5 * cq; }
          if (effect === 'glow') { ctx.shadowColor = accent; ctx.shadowBlur = 3 * cq; ctx.fillText(word, x, y); ctx.shadowBlur = 1.4 * cq; }
          if (effect === 'outline') { ctx.lineWidth = 0.44 * cq; ctx.strokeStyle = accent; ctx.lineJoin = 'round'; ctx.strokeText(word, x, y); }
          ctx.fillText(word, x, y);
          ctx.restore();
        }
      }
    });
  }

  /* ------------------------------------------------------------------
     DOWNLOAD
     ------------------------------------------------------------------ */
  function slug(s) { return (s || 'greeting').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'greeting'; }

  function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 2000);
  }

  function toast(msg, ms) { if (window.Sbl && window.Sbl.showToast) window.Sbl.showToast(msg, ms); }

  let busy = false;
  async function download(poster, name, format, x, y) {
    if (!poster || busy) return;
    busy = true;
    const jpg = /jpe?g/i.test(format || '');
    try {
      const canvas = await toCanvas(poster, 1080);
      const blob = await new Promise((resolve, reject) => {
        try { canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('empty'))), jpg ? 'image/jpeg' : 'image/png', 0.93); }
        catch (e) { reject(e); }
      });
      saveBlob(blob, 'Sbl-' + slug(name) + (jpg ? '.jpg' : '.png'));
      toast('Poster downloaded ✓');
      if (window.SblApi) window.SblApi.track('/api/downloads', { poster: name, format: jpg ? 'jpg' : 'png' });   // download count (admin page)
      if (window.Sbl && window.Sbl.celebrate) window.Sbl.celebrate(x, y);
    } catch (err) {
      if (err && (err.name === 'SecurityError' || err.name === 'OutdatedCopy')) {
        // Only happens when index.html is double-clicked (file://).
        toast('Downloads need the server: run backend/app.py and open the site at ' + ((window.SblApi && window.SblApi.backendUrl) || 'http://localhost:8000'), 8000);
      } else {
        toast('Download failed — please try again.');
        console.error(err);
      }
    } finally {
      busy = false;
    }
  }

  /** Find the poster and name that belong to a download button. */
  function posterFor(btn) {
    if (btn.dataset.target) return document.querySelector(btn.dataset.target);
    const scope = btn.closest('[data-template], .lightbox, .pe, [data-poster-scope]');
    return scope ? scope.querySelector('.poster') : null;
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-download]');
    if (!btn) return;
    e.preventDefault();
    const poster = posterFor(btn);
    const card = btn.closest('[data-template]');
    const name = (card && card.dataset.title) || (poster && poster.dataset.name) || 'greeting';
    let format = btn.dataset.format;
    if (!format) {
      const picked = btn.closest('[data-poster-scope], .lightbox, .pe');
      const chosen = picked && picked.querySelector('[data-format-choice].is-on');
      format = chosen ? chosen.dataset.formatChoice : 'png';
    }
    btn.classList.add('is-busy');
    download(poster, name, format, e.clientX, e.clientY).finally(() => btn.classList.remove('is-busy'));
  });

  // PNG / JPG switch
  document.addEventListener('click', (e) => {
    const choice = e.target.closest('[data-format-choice]');
    if (!choice) return;
    choice.parentElement.querySelectorAll('[data-format-choice]').forEach((b) => {
      b.classList.toggle('is-on', b === choice);
      b.setAttribute('aria-pressed', String(b === choice));
    });
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => hydrate());
  else hydrate();

  window.Poster = { hydrate, refreshPhoto, refreshConfetti, toCanvas, download, saveBlob, SHAPES, DECOR };
})();
