/* ==========================================================================
   Sbl — editor.js  ·  Poster Studio
   Opens a full-screen editor on top of any page.

   ▸ <button data-edit>          inside a poster card → edits that card's poster
   ▸ <button data-edit="id">     → edits the card with data-template="id"
   ▸ <button data-edit="blank">  → starts from <template id="blankPoster">
   ▸ URL  page.html?edit=birthday-03  opens that poster straight away

   The preview IS a copy of the HTML poster, so the editor shows exactly what
   the card shows, and Download saves exactly what the editor shows.
   Nothing is saved back into the HTML file — to change a template for good,
   edit its markup in the .html file.
   ========================================================================== */
(function () {
  'use strict';

  const FONTS = [
    ['Fraunces', 'serif', 'Fraunces · serif'],
    ['Playfair Display', 'serif', 'Playfair · serif'],
    ['Cormorant Garamond', 'serif', 'Cormorant · elegant'],
    ['Great Vibes', 'cursive', 'Great Vibes · calligraphy'],
    ['Dancing Script', 'cursive', 'Dancing Script · handwritten'],
    ['Pacifico', 'cursive', 'Pacifico · fun script'],
    ['Lobster', 'cursive', 'Lobster · bold script'],
    ['Caveat', 'cursive', 'Caveat · marker'],
    ['Bebas Neue', 'sans-serif', 'Bebas Neue · tall caps'],
    ['Poppins', 'sans-serif', 'Poppins · modern'],
    ['Plus Jakarta Sans', 'sans-serif', 'Jakarta · clean']
  ];
  const ROLES = [
    { role: 'kicker', label: 'Small top line', min: 1.6, max: 8, rows: 1 },
    { role: 'heading', label: 'Heading', min: 4, max: 24, rows: 2 },
    { role: 'message', label: 'Message', min: 2, max: 8, rows: 3 },
    { role: 'from', label: 'Name', min: 2, max: 10, rows: 1 }
  ];
  const SHAPE_ICONS = {
    circle: '<circle cx="12" cy="12" r="9"/>',
    rounded: '<rect x="3" y="3" width="18" height="18" rx="4"/>',
    arch: '<path d="M5 21V11a7 7 0 0 1 14 0v10Z"/>',
    heart: '<path d="M12 20s-7.5-4.6-9.3-9.2C1.5 7.6 3.7 4.5 7 4.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.3 0 5.5 3.1 4.3 6.3C19.5 15.4 12 20 12 20Z"/>',
    star: '<path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9Z"/>',
    hexagon: '<path d="M12 2.5 20.5 7.3v9.4L12 21.5l-8.5-4.8V7.3Z"/>',
    blob: '<path d="M12 3c4 0 8 2.5 8.4 7 .5 4.8-3 10-8.4 10S3 16.5 3.6 11.6C4.1 6.6 8 3 12 3Z"/>'
  };
  const POS = ['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br'];
  const POS_LABEL = { tl: 'Top left', tc: 'Top centre', tr: 'Top right', ml: 'Middle left', mc: 'Centre', mr: 'Middle right', bl: 'Bottom left', bc: 'Bottom centre', br: 'Bottom right' };

  let root, stage, wrap, P = null, sourceHTML = '', lastFocus = null;

  /* Paid logo change (js/paid.js).  The template's own logo is free; removing it
     or using another logo is paid — once per logo change.
       paid       a logo change was paid for on this poster
       src/hidden the template's original logo and whether the template hides it
       credit     a paid change that has not been used yet (Pay button in the preview area)
       saved      the poster was downloaded after the paid change */
  let LOGO = { paid: false, credit: 0, src: '', hidden: false, saved: true };
  const Pay = () => window.LogoPay;
  const FEE = () => (Pay() ? Pay().priceLabel : '');

  /* ------------------------------------------------------------------
     SMALL HELPERS
     ------------------------------------------------------------------ */
  const $ = (s, c) => (c || root).querySelector(s);
  const $$ = (s, c) => Array.from((c || root).querySelectorAll(s));
  const part = (name) => P.querySelector('.poster__' + name);
  const getVar = (el, name, fallback) => {
    const v = el && el.style.getPropertyValue('--' + name).trim();
    return v === '' || v == null ? fallback : v;
  };
  const setVar = (el, name, value) => { if (el) el.style.setProperty('--' + name, value); };
  const num = (v, d) => { const n = parseFloat(v); return isNaN(n) ? d : n; };
  const ICON = (id) => `<svg class="icon" aria-hidden="true"><use href="#${id}"/></svg>`;
  const toast = (m, ms) => window.Sbl && window.Sbl.showToast(m, ms);

  function toHex(c) {
    if (!c) return '#000000';
    if (c[0] === '#') return c.length === 4 ? '#' + c.slice(1).split('').map((x) => x + x).join('') : c.slice(0, 7);
    const m = c.match(/[\d.]+/g);
    if (!m) return '#000000';
    return '#' + m.slice(0, 3).map((x) => Math.round(+x).toString(16).padStart(2, '0')).join('');
  }
  function alphaOf(c) {
    const m = c && c.match(/rgba?\(([^)]+)\)/);
    if (!m) return 1;
    const p = m[1].split(',');
    return p.length > 3 ? parseFloat(p[3]) : 1;
  }
  function rgba(hex, a) {
    const h = hex.replace('#', '');
    const n = parseInt(h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${(+a).toFixed(2)})`;
  }
  function textOf(el) {
    const c = el.cloneNode(true);
    c.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
    return c.textContent;
  }
  function setText(el, value) {
    el.innerHTML = '';
    String(value).split('\n').forEach((line, i) => {
      if (i) el.appendChild(document.createElement('br'));
      el.appendChild(document.createTextNode(line));
    });
  }

  /* ------------------------------------------------------------------
     UI MARKUP
     ------------------------------------------------------------------ */
  const range = (key, label, min, max, step, unit) => `
    <label class="pe-field pe-range"><span class="pe-label">${label} <output data-out="${key}"></output>${unit || ''}</span>
      <input type="range" data-ctl="${key}" min="${min}" max="${max}" step="${step || 1}"></label>`;
  const toggle = (key, label) => `
    <label class="pe-toggle"><input type="checkbox" data-ctl="${key}"><span class="pe-switch" aria-hidden="true"></span><span>${label}</span></label>`;
  const color = (key, label) => `<label class="pe-color"><input type="color" data-ctl="${key}"><span>${label}</span></label>`;
  const seg = (key, opts, label, extra) => `
    <div class="pe-seg ${extra || ''}" role="radiogroup" aria-label="${label}" data-seg="${key}">
      ${opts.map(([v, t, title]) => `<button type="button" role="radio" aria-checked="false" data-value="${v}"${title ? ` title="${title}" aria-label="${title}"` : ''}>${t}</button>`).join('')}
    </div>`;
  const grid = (key, label) => `
    <div class="pe-grid" role="radiogroup" aria-label="${label}" data-seg="${key}">
      ${POS.map((p) => `<button type="button" role="radio" aria-checked="false" data-value="${p}" title="${POS_LABEL[p]}" aria-label="${POS_LABEL[p]}"><span></span></button>`).join('')}
    </div>`;
  const uploadField = (key, label, small) => `
    <label class="pe-upload"><input type="file" accept="image/*" data-upload="${key}">
      <span class="pe-upload__icon">${ICON('i-image')}</span>
      <span><strong>${label}</strong><small>${small || 'JPG or PNG from your phone or computer'}</small></span></label>`;
  const ALIGN = [
    ['left', '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 11h10M4 16h16M4 21h10"/></svg>', 'Align left'],
    ['center', '<svg viewBox="0 0 24 24"><path d="M4 6h16M7 11h10M4 16h16M7 21h10"/></svg>', 'Align centre'],
    ['right', '<svg viewBox="0 0 24 24"><path d="M4 6h16M10 11h10M4 16h16M10 21h10"/></svg>', 'Align right']
  ];

  function roleEditor(r, open) {
    const k = r.role;
    return `
      <details class="pe-block" ${open ? 'open' : ''}>
        <summary><span>${r.label}</span><small data-preview-text="${k}"></small></summary>
        <div class="pe-block__body">
          ${r.rows > 1
            ? `<textarea data-ctl="${k}.text" rows="${r.rows}" aria-label="${r.label} text"></textarea>`
            : `<input type="text" data-ctl="${k}.text" aria-label="${r.label} text">`}
          <label class="pe-field"><span class="pe-label">Font</span>
            <select data-ctl="${k}.font">${FONTS.map((f) => `<option value="${f[0]}" style="font-family:'${f[0]}'">${f[2]}</option>`).join('')}</select></label>
          ${range(k + '.size', 'Size', r.min, r.max, 0.1)}
          <div class="pe-row pe-row--center">
            ${color(k + '.color', 'Colour')}
            <div class="pe-seg pe-seg--icons" role="group" aria-label="Style">
              <button type="button" data-flag="${k}.bold" aria-pressed="false" title="Bold"><b>B</b></button>
              <button type="button" data-flag="${k}.italic" aria-pressed="false" title="Italic"><i>I</i></button>
              <button type="button" data-flag="${k}.upper" aria-pressed="false" title="CAPITALS">Aa</button>
            </div>
          </div>
          ${seg(k + '.align', ALIGN, r.label + ' alignment')}
          ${k === 'heading' ? `<span class="pe-label">Effect</span>${seg('heading.effect', [['none', 'None'], ['shadow', 'Shadow'], ['glow', 'Glow'], ['outline', 'Outline']], 'Heading effect')}` : ''}
        </div>
      </details>`;
  }

  function build() {
    root = document.createElement('div');
    root.className = 'pe';
    root.id = 'posterEditor';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Poster editor');
    root.innerHTML = `
      <div class="pe__backdrop" data-pe-close></div>
      <div class="pe__window">
        <header class="pe__bar">
          <div class="pe__title">
            <span class="pe__badge">${ICON('i-sparkle')}</span>
            <div><strong>Poster Studio</strong><small data-pe-name></small></div>
          </div>
          <div class="pe__bar-actions">
            <div class="format-switch pe__hide-sm" role="group" aria-label="File format">
              <button type="button" class="is-on" data-format-choice="png" aria-pressed="true">PNG</button>
              <button type="button" data-format-choice="jpg" aria-pressed="false">JPG</button>
            </div>
            <button class="btn btn--sm pe__download" type="button" data-download>${ICON('i-download')} <span>Download</span></button>
            <button class="icon-btn" type="button" data-pe-close aria-label="Close editor">${ICON('i-close')}</button>
          </div>
        </header>

        <div class="pe__body">
          <div class="pe__stage">
            <!-- Mobile only: view the poster on the whole screen -->
            <button class="pe__full-btn" type="button" data-pe-full aria-label="View poster full screen" title="Full screen">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>
            </button>
            <button class="pe__full-close" type="button" data-pe-full-close aria-label="Close full screen" title="Close">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
            </button>
            <div class="pe__canvas-wrap"></div>
            <div class="pe__dock">
              <span class="pe__live"><i></i> Live preview</span>
              ${Pay() ? '<div class="pe__paybar" data-logo-bar></div>' : ''}
            </div>
          </div>

          <div class="pe__panel">
            <div class="pe__tabs" role="tablist">
              <button role="tab" aria-selected="true" data-tab="text">${ICON('i-type')}<span>Text</span></button>
              <button role="tab" aria-selected="false" data-tab="photo">${ICON('i-image')}<span>Photo</span></button>
              <button role="tab" aria-selected="false" data-tab="logo">${ICON('i-sparkle')}<span>Logo</span></button>
              <button role="tab" aria-selected="false" data-tab="bg">${ICON('i-layout')}<span>Background</span></button>
            </div>

            <div class="pe__scroll">
              <section class="pe__pane is-active" data-pane="text">
                ${ROLES.map((r, i) => roleEditor(r, i < 2)).join('')}
                <details class="pe-block" open>
                  <summary><span>Text placement</span></summary>
                  <div class="pe-block__body">
                    ${seg('text.pos', [['top', 'Top'], ['middle', 'Middle'], ['bottom', 'Bottom']], 'Text position')}
                    ${range('text.x', 'Left ↔ right', 10, 90, 1, '%')}
                    ${range('text.y', 'Up ↕ down', 0, 100, 1, '%')}
                    ${range('text.w', 'Text width', 36, 96, 1, '%')}
                    ${toggle('text.card', 'Frosted text card')}
                    <div class="pe-row pe-row--center">
                      ${color('text.cardColor', 'Card colour')}
                    </div>
                    ${range('text.cardAlpha', 'Card strength', 20, 100, 1, '%')}
                  </div>
                </details>
              </section>

              <section class="pe__pane" data-pane="photo">
                ${uploadField('photo', 'Upload main photo')}
                ${toggle('photo.on', 'Show main photo')}
                <span class="pe-label">Shape</span>
                ${seg('photo.shape', Object.keys(SHAPE_ICONS).map((k) => [k, `<svg viewBox="0 0 24 24">${SHAPE_ICONS[k]}</svg>`, k]), 'Photo shape', 'pe-seg--shapes')}
                <span class="pe-label">Decoration shapes</span>
                ${seg('photo.decor', [['none', 'None'], ['ring', 'Ring'], ['dots', 'Dots'], ['blob', 'Blob'], ['layers', 'Layers'], ['sparkles', 'Sparkle']], 'Decoration')}
                ${range('photo.w', 'Size', 16, 80, 1, '%')}
                <div class="pe-place">
                  <div><span class="pe-label">Placement</span>${grid('photo.pos', 'Photo placement')}</div>
                  <div class="pe-place__side">
                    ${range('photo.x', 'Left ↔ right', 0, 100, 1, '%')}
                    ${range('photo.y', 'Up ↕ down', 0, 100, 1, '%')}
                    ${color('photo.frame', 'Frame colour')}
                  </div>
                </div>
              </section>

              <section class="pe__pane" data-pane="logo">
                ${Pay() ? '<div class="pe-paid" data-logo-note></div>' : ''}
                ${uploadField('logo', Pay() ? 'Use your own logo' : 'Upload your logo', Pay() ? `${FEE()} per logo · JPG or PNG` : '')}
                ${toggle('logo.on', 'Show logo')}
                ${toggle('logo.badge', 'White badge behind logo')}
                ${range('logo.w', 'Logo size', 5, 32, 0.5, '%')}
                <div class="pe-place">
                  <div><span class="pe-label">Placement</span>${grid('logo.pos', 'Logo placement')}</div>
                  <div class="pe-place__side">
                    ${range('logo.x', 'Left ↔ right', 0, 100, 1, '%')}
                    ${range('logo.y', 'Up ↕ down', 0, 100, 1, '%')}
                  </div>
                </div>
              </section>

              <section class="pe__pane" data-pane="bg">
                ${uploadField('bg', 'Upload background')}
                <span class="pe-label">Or choose a background</span>
                <div class="pe-bgs" data-bgs></div>
                ${range('bg.focus', 'Image focus ↕', 0, 100, 1, '%')}
                <div class="pe-row pe-row--center">${color('bg.overlay', 'Colour wash')}</div>
                ${range('bg.overlayAlpha', 'Wash strength', 0, 80, 1, '%')}
                ${toggle('bg.confetti', 'Add confetti & sparkles')}
                ${color('accent', 'Accent colour (decor & effects)')}
              </section>
            </div>

            <footer class="pe__foot">
              <button class="btn btn--light" type="button" data-pe-close>Cancel</button>
              <button class="btn btn--light" type="button" data-pe-reset>Reset</button>
              <button class="btn pe__download" type="button" data-download>${ICON('i-download')} Download</button>
            </footer>
          </div>
        </div>
      </div>`;
    document.body.appendChild(root);
    stage = $('.pe__stage');
    wrap = $('.pe__canvas-wrap');
    bind();
    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(stage);
    window.addEventListener('resize', () => { if (window.innerWidth > 900 && root.classList.contains('is-full')) fullScreen(false); fit(); });
  }

  /* ------------------------------------------------------------------
     READ  poster → controls
     ------------------------------------------------------------------ */
  function read(key) {
    const [a, b] = key.split('.');
    const photo = part('photo'), logo = part('logo'), text = part('text'), bg = part('bg'), ov = part('overlay');
    if (ROLES.some((r) => r.role === a)) {
      const el = part(a);
      if (!el) return '';
      switch (b) {
        case 'text': return textOf(el);
        case 'font': return getVar(el, 'font', 'Plus Jakarta Sans').replace(/['"]/g, '');
        case 'size': return num(getVar(el, 'size'), 4);
        case 'color': return toHex(getVar(el, 'color', '#1f1a2e'));
        case 'align': return getVar(el, 'align', 'center');
        case 'bold': return num(getVar(el, 'weight'), 500) >= 600;
        case 'italic': return getVar(el, 'style', 'normal') === 'italic';
        case 'upper': return getVar(el, 'case', 'none') === 'uppercase';
        case 'effect': return el.dataset.effect || 'none';
      }
    }
    switch (key) {
      case 'text.pos': return text.dataset.anchor || 'bottom';
      case 'text.x': return num(getVar(text, 'x'), 50);
      case 'text.y': return num(getVar(text, 'y'), 92);
      case 'text.w': return num(getVar(text, 'w'), 84);
      case 'text.card': return text.hasAttribute('data-card');
      case 'text.cardColor': return toHex(getVar(text, 'card', 'rgba(255,255,255,0.84)'));
      case 'text.cardAlpha': return Math.round(alphaOf(getVar(text, 'card', 'rgba(255,255,255,0.84)')) * 100);
      case 'photo.on': return !!photo && !photo.hidden;
      case 'photo.shape': return photo ? photo.dataset.shape || 'circle' : 'circle';
      case 'photo.decor': return photo ? photo.dataset.decor || 'none' : 'none';
      case 'photo.w': return num(getVar(photo, 'w'), 44);
      case 'photo.x': return num(getVar(photo, 'x'), 50);
      case 'photo.y': return num(getVar(photo, 'y'), 40);
      case 'photo.frame': return toHex(getVar(photo, 'frame', '#ffffff'));
      case 'photo.pos': return '';
      case 'logo.on': return !!logo && !logo.hidden;
      case 'logo.badge': return !!logo && logo.hasAttribute('data-badge');
      case 'logo.w': return num(getVar(logo, 'w'), 12);
      case 'logo.x': return num(getVar(logo, 'x'), 12);
      case 'logo.y': return num(getVar(logo, 'y'), 8);
      case 'logo.pos': return '';
      case 'bg.focus': return num(String(getVar(bg, 'pos', '50% 50%')).split(/\s+/)[1], 50);
      case 'bg.overlay': return toHex(ov ? getVar(ov, 'overlay', 'rgba(255,255,255,0)') : '#ffffff');
      case 'bg.overlayAlpha': return ov ? Math.round(alphaOf(getVar(ov, 'overlay', 'rgba(0,0,0,0)')) * 100) : 0;
      case 'bg.confetti': return !!P.dataset.confetti;
      case 'accent': return toHex(getVar(P, 'accent', '#ec5a8c'));
    }
    return '';
  }

  function sync() {
    $$('[data-ctl]').forEach((c) => {
      const v = read(c.dataset.ctl);
      if (c.type === 'checkbox') c.checked = !!v;
      else c.value = v;
    });
    $$('[data-seg]').forEach((g) => {
      const v = String(read(g.dataset.seg));
      $$('[data-value]', g).forEach((b) => {
        const on = b.dataset.value === v;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-checked', String(on));
      });
    });
    $$('[data-flag]').forEach((b) => {
      const on = !!read(b.dataset.flag);
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    $$('[data-out]').forEach((o) => { o.textContent = read(o.dataset.out); });
    $$('[data-preview-text]').forEach((s) => { s.textContent = read(s.dataset.previewText + '.text').replace(/\n/g, ' ').slice(0, 28); });
    const bg = part('bg');
    $$('[data-bg-src]').forEach((b) => b.classList.toggle('is-on', bg && bg.getAttribute('src') === b.dataset.bgSrc));
    $('[data-pe-name]').textContent = (P.dataset.name || 'Poster') + ' · editable';
    paintLogoFee();
  }

  /* ------------------------------------------------------------------
     PAID LOGO CHANGE
     ------------------------------------------------------------------ */
  const logoLocked = () => !!Pay() && !LOGO.paid;

  /** Show the fee in the preview area (bar + tag on the logo) and in the Logo tab. */
  function paintLogoFee() {
    if (!Pay()) return;
    const fee = FEE(), logo = part('logo');
    const state = LOGO.credit ? 'credit' : LOGO.paid ? 'paid' : 'locked';
    root.dataset.logo = state;
    if (logo) { logo.dataset.fee = fee; logo.title = state === 'locked' ? `Change this logo for ${fee}` : ''; }
    const payBtn = (label) => `<button type="button" class="pe-pay" data-logo-pay>${label}</button>`;
    const bar = $('[data-logo-bar]'), note = $('[data-logo-note]');
    if (bar) {
      bar.innerHTML = state === 'credit'
        ? `<span><b>Paid ✓</b> 1 logo change</span><button type="button" class="pe-pay" data-logo-go>Change logo</button>`
        : state === 'paid'
          ? `<span><b>Logo changed ✓</b></span>${payBtn(`New logo ${fee}`)}`
          : `<span>Logo change <b>${fee}</b></span>${payBtn(`Pay ${fee}`)}`;
    }
    if (note) {
      note.classList.toggle('is-paid', state !== 'locked');
      note.innerHTML = state === 'credit'
        ? `<span class="pe-paid__tag">Paid ✓</span><span><strong>1 logo change is ready</strong>Switch “Show logo” off to remove the logo, or upload your own logo below.</span>`
        : state === 'paid'
          ? `<span class="pe-paid__tag">Paid ✓</span><span><strong>Logo change paid for this poster</strong>Download the poster before you close the editor. Another new logo is ${fee} again.${payBtn(`Pay ${fee} for a new logo`)}</span>`
          : `<span class="pe-paid__tag">${fee}</span><span><strong>Logo change · ${fee} each</strong>The ${Pay().brand} logo is included free. Removing it or using your own logo costs ${fee} per change. Size, badge and position are free.${payBtn(`Pay ${fee}`)}</span>`;
    }
  }

  /** "Pay" in the preview area: pay first, then remove or replace the logo. */
  function buyLogoChange() {
    if (LOGO.credit) { showTab('logo'); return; }
    Pay().request({ action: 'change', poster: P.dataset.name || 'this poster' }).then((ok) => {
      if (!ok) return;
      LOGO.credit = 1; LOGO.saved = false;
      if (root.classList.contains('is-full')) fullScreen(false);
      showTab('logo');
      sync();
      toast('Paid ✓ Now remove the logo or upload your own', 4200);
    });
  }

  /** Ask for the fee, then run `apply`. */
  function payForLogo(action, preview, apply) {
    if (LOGO.credit) {                       // already paid with the Pay button
      LOGO.credit = 0; LOGO.paid = true; LOGO.saved = false;
      apply(); sync();
      return;
    }
    Pay().request({ action, preview, poster: P.dataset.name || 'this poster' }).then((ok) => {
      if (!ok) { sync(); return; }
      LOGO.paid = true; LOGO.saved = false;
      apply();
      sync();
    });
  }

  /** While the free logo is on, keep it fully inside the poster. */
  function keepLogoInside() {
    const logo = part('logo');
    if (!logoLocked() || !logo || logo.hidden) return;
    const pr = P.getBoundingClientRect(), r = logo.getBoundingClientRect();
    if (!pr.width || !r.width) return;
    const hw = (r.width / pr.width) * 50, hh = (r.height / pr.height) * 50;
    const fix = (name, half, d) => {
      const v = num(getVar(logo, name), d), c = Math.min(100 - half, Math.max(half, v));
      if (Math.abs(c - v) > 0.05) setVar(logo, name, Math.round(c * 10) / 10);
    };
    fix('x', hw, 12); fix('y', hh, 8);
  }

  /** Before a download: an unpaid poster always carries the template's own logo. */
  function guardLogo() {
    const logo = part('logo');
    if (!logo) return;
    if (logoLocked()) {
      const img = logo.querySelector('img');
      if (img.getAttribute('src') !== LOGO.src) img.setAttribute('src', LOGO.src);
      if (!LOGO.hidden) logo.hidden = false;
      ['opacity', 'display', 'visibility', 'transform', 'clip-path', 'filter'].forEach((k) => logo.style.removeProperty(k));
      if (P.lastElementChild !== logo) P.appendChild(logo);
      keepLogoInside();
    }
    LOGO.saved = true;
  }

  /* ------------------------------------------------------------------
     WRITE  controls → poster
     ------------------------------------------------------------------ */
  function ensureOverlay() {
    let ov = part('overlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.className = 'poster__overlay';
      part('bg').after(ov);
    }
    return ov;
  }

  function write(key, value) {
    const [a, b] = key.split('.');
    if (ROLES.some((r) => r.role === a)) {
      const el = part(a);
      if (!el) return;
      switch (b) {
        case 'text': setText(el, value); break;
        case 'font': {
          const f = FONTS.find((x) => x[0] === value) || FONTS[0];
          setVar(el, 'font', `'${f[0]}'`); setVar(el, 'fallback', f[1]);
          break;
        }
        case 'size': setVar(el, 'size', value); break;
        case 'color': setVar(el, 'color', value); break;
        case 'align': setVar(el, 'align', value); break;
        case 'bold': setVar(el, 'weight', value ? 700 : (/(Great Vibes|Pacifico|Lobster|Bebas)/.test(getVar(el, 'font', '')) ? 400 : 500)); break;
        case 'italic': setVar(el, 'style', value ? 'italic' : 'normal'); break;
        case 'upper': setVar(el, 'case', value ? 'uppercase' : 'none'); break;
        case 'effect': if (value === 'none') el.removeAttribute('data-effect'); else el.dataset.effect = value; break;
      }
      return;
    }
    const photo = part('photo'), logo = part('logo'), text = part('text');
    switch (key) {
      case 'text.pos': {
        text.dataset.anchor = value;
        setVar(text, 'y', value === 'top' ? 5 : value === 'middle' ? 50 : 95);
        break;
      }
      case 'text.x': setVar(text, 'x', value); break;
      case 'text.y': setVar(text, 'y', value); break;
      case 'text.w': setVar(text, 'w', value); break;
      case 'text.card': if (value) text.setAttribute('data-card', ''); else text.removeAttribute('data-card'); break;
      case 'text.cardColor': setVar(text, 'card', rgba(value, read('text.cardAlpha') / 100)); break;
      case 'text.cardAlpha': setVar(text, 'card', rgba(read('text.cardColor'), value / 100)); break;
      case 'photo.on': if (photo) photo.hidden = !value; break;
      case 'photo.shape': photo.dataset.shape = value; Poster.refreshPhoto(photo); break;
      case 'photo.decor': photo.dataset.decor = value; Poster.refreshPhoto(photo); break;
      case 'photo.w': setVar(photo, 'w', value); break;
      case 'photo.x': setVar(photo, 'x', value); break;
      case 'photo.y': setVar(photo, 'y', value); break;
      case 'photo.frame': setVar(photo, 'frame', value); break;
      case 'photo.pos': place(photo, value, 6); break;
      case 'logo.on': if (logo) logo.hidden = !value; break;
      case 'logo.badge': if (value) logo.setAttribute('data-badge', ''); else logo.removeAttribute('data-badge'); break;
      case 'logo.w': setVar(logo, 'w', value); keepLogoInside(); break;
      case 'logo.x': setVar(logo, 'x', value); keepLogoInside(); break;
      case 'logo.y': setVar(logo, 'y', value); keepLogoInside(); break;
      case 'logo.pos': place(logo, value, 4); break;
      case 'bg.focus': setVar(part('bg'), 'pos', `50% ${value}%`); break;
      case 'bg.overlay': setVar(ensureOverlay(), 'overlay', rgba(value, read('bg.overlayAlpha') / 100)); break;
      case 'bg.overlayAlpha': setVar(ensureOverlay(), 'overlay', rgba(read('bg.overlay'), value / 100)); break;
      case 'bg.confetti':
        if (value) P.dataset.confetti = String(Math.floor(Math.random() * 90) + 3); else delete P.dataset.confetti;
        Poster.refreshConfetti(P);
        break;
      case 'accent': setVar(P, 'accent', value); break;
    }
  }

  /** 3 × 3 placement: work out x / y so the element stays inside the poster. */
  function place(el, pos, margin) {
    if (!el) return;
    const pr = P.getBoundingClientRect(), r = el.getBoundingClientRect();
    const wPct = (r.width / pr.width) * 100, hPct = (r.height / pr.height) * 100;
    const col = pos[1], row = pos[0];
    const x = col === 'l' ? margin + wPct / 2 : col === 'r' ? 100 - margin - wPct / 2 : 50;
    const y = row === 't' ? margin * 0.8 + hPct / 2 : row === 'b' ? 100 - margin * 0.8 - hPct / 2 : 50;
    setVar(el, 'x', Math.round(x * 10) / 10);
    setVar(el, 'y', Math.round(y * 10) / 10);
    el.hidden = false;
  }

  /* ------------------------------------------------------------------
     EVENTS
     ------------------------------------------------------------------ */
  function bind() {
    root.addEventListener('input', (e) => {
      const c = e.target.closest('[data-ctl]');
      if (!c || c.type === 'checkbox') return;
      write(c.dataset.ctl, c.type === 'range' ? Number(c.value) : c.value);
      if (/^logo\.[xy]$/.test(c.dataset.ctl) && logoLocked()) c.value = read(c.dataset.ctl);   // free logo stays inside the poster
      const out = $(`[data-out="${c.dataset.ctl}"]`);
      if (out) out.textContent = c.value;
      if (c.dataset.ctl.endsWith('.text')) {
        const s = $(`[data-preview-text="${c.dataset.ctl.split('.')[0]}"]`);
        if (s) s.textContent = c.value.replace(/\n/g, ' ').slice(0, 28);
      }
    });
    root.addEventListener('change', (e) => {
      const c = e.target;
      if (c.dataset.upload) { upload(c); return; }
      if (c.dataset.ctl === 'logo.on' && !c.checked && logoLocked() && !LOGO.hidden) {
        c.checked = !LOGO.credit;                           // stays on until the fee is paid
        payForLogo('remove', '', () => write('logo.on', false));
        return;
      }
      if (c.type === 'checkbox' && c.dataset.ctl) { write(c.dataset.ctl, c.checked); sync(); }
    });
    root.addEventListener('click', (e) => {
      const opt = e.target.closest('[data-seg] [data-value]');
      if (opt) { write(opt.closest('[data-seg]').dataset.seg, opt.dataset.value); sync(); if (opt.closest('[data-seg]').dataset.seg.endsWith('.pos')) mark(opt); return; }
      const flag = e.target.closest('[data-flag]');
      if (flag) { write(flag.dataset.flag, !read(flag.dataset.flag)); sync(); return; }
      const bgBtn = e.target.closest('[data-bg-src]');
      if (bgBtn) { part('bg').src = bgBtn.dataset.bgSrc; sync(); return; }
      const tab = e.target.closest('[data-tab]');
      if (tab) { showTab(tab.dataset.tab); return; }
      if (e.target.closest('[data-pe-full]')) { fullScreen(true); return; }
      if (e.target.closest('[data-pe-full-close]')) { fullScreen(false); return; }
      if (e.target.closest('[data-pe-close]')) { close(); return; }
      if (e.target.closest('[data-pe-reset]')) { reset(); return; }
      if (e.target.closest('[data-logo-pay]')) { buyLogoChange(); return; }
      if (e.target.closest('[data-logo-go]')) { showTab('logo'); return; }
      if (logoLocked() && !LOGO.credit && e.target.closest('.pe__canvas-wrap .poster__logo')) { buyLogoChange(); return; }
      if (e.target.closest('[data-download]')) guardLogo();   // runs just before poster.js saves the file
    });
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (root.classList.contains('is-full')) fullScreen(false); else close();
      }
      if (e.key === 'Tab') {
        const f = $$('button, input, select, textarea, summary').filter((n) => n.offsetParent !== null);
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  function mark(btn) { // highlight the chosen 3×3 cell briefly (positions have no stored state)
    $$('[data-value]', btn.parentElement).forEach((b) => { b.classList.toggle('is-on', b === btn); b.setAttribute('aria-checked', String(b === btn)); });
  }

  function upload(input) {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    if (!/^image\//.test(file.type)) { toast('Please choose an image file.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result, key = input.dataset.upload;
      if (key === 'bg') part('bg').src = url;
      if (key === 'photo') { const f = part('photo'); f.querySelector('img').src = url; f.hidden = false; }
      if (key === 'logo') {
        const setLogo = () => { const l = part('logo'); l.querySelector('img').src = url; l.hidden = false; };
        if (Pay()) { payForLogo('replace', url, () => { setLogo(); toast('Your logo is on the poster ✨'); }); return; }   // every new logo is one paid change
        setLogo();
      }
      sync();
      toast('Image added ✨');
    };
    reader.readAsDataURL(file);
  }

  function showTab(name) {
    $$('[data-tab]').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
    $$('[data-pane]').forEach((p) => p.classList.toggle('is-active', p.dataset.pane === name));
    $('.pe__scroll').scrollTop = 0;
  }

  /* Full-screen poster view (the button only shows on phones / small screens) */
  function fullScreen(on) {
    root.classList.toggle('is-full', on);
    fit();
    requestAnimationFrame(fit);
    const focus = $(on ? '[data-pe-full-close]' : '[data-pe-full]');
    if (focus) focus.focus({ preventScroll: true });
  }

  function fit() {
    if (!P || !root.classList.contains('is-open')) return;
    const r = wrap.getBoundingClientRect();
    const w = Math.max(120, Math.min(r.width, r.height * 0.8));
    P.style.width = Math.floor(w) + 'px';
  }

  function backgrounds() {
    const seen = new Set();
    const list = [];
    document.querySelectorAll('.poster__bg, template').forEach((n) => {
      const imgs = n.tagName === 'TEMPLATE' ? n.content.querySelectorAll('.poster__bg') : [n];
      imgs.forEach((img) => {
        const src = img.getAttribute('src');
        if (src && !src.startsWith('data:') && !seen.has(src)) { seen.add(src); list.push(src); }
      });
    });
    $('[data-bgs]').innerHTML = list.map((src) =>
      `<button type="button" data-bg-src="${src}" aria-label="Use this background"><img src="${src}" alt="" loading="lazy"></button>`).join('');
  }

  /* ------------------------------------------------------------------
     OPEN / CLOSE / RESET
     ------------------------------------------------------------------ */
  function findSource(id) {
    if (id && id !== 'blank') {
      const s = document.querySelector(`[data-template="${CSS.escape(id)}"] .poster`);
      if (s) return s;
    }
    const tpl = document.getElementById('blankPoster');
    return tpl ? tpl.content.querySelector('.poster') : null;
  }

  function mount(html) {
    wrap.innerHTML = html;
    P = wrap.querySelector('.poster');
    P.style.transform = 'none';
    P.querySelectorAll('img').forEach((i) => { i.loading = 'eager'; });
    ['photo', 'logo'].forEach((k) => { // make sure both exist so they can be switched on
      if (!part(k)) {
        const f = document.createElement('figure');
        f.className = 'poster__' + k;
        f.hidden = true;
        f.innerHTML = `<img src="${(window.Sbl && window.Sbl.ROOT) || ''}images/logo/logo-mark.png" alt="">`;
        if (k === 'photo') { f.dataset.shape = 'circle'; f.dataset.decor = 'none'; }
        part('text').before(f);
      }
    });
    if (Pay()) P.appendChild(part('logo'));   // logo is the top layer, so nothing can be placed over it
    Poster.hydrate(wrap);
    fit();
    sync();
  }

  function open(id) {
    if (!root) build();
    const src = findSource(id);
    if (!src) return;
    sourceHTML = src.outerHTML;
    const srcLogo = src.querySelector('.poster__logo');
    LOGO = {
      paid: false, credit: 0, saved: true,
      src: srcLogo ? srcLogo.querySelector('img').getAttribute('src') : ((window.Sbl && window.Sbl.ROOT) || '') + 'images/logo/logo-mark.png',
      hidden: !srcLogo || srcLogo.hidden
    };
    root.classList.add('is-open');
    document.body.classList.add('pe-open');
    backgrounds();
    mount(sourceHTML);
    showTab('text');
    lastFocus = document.activeElement;
    requestAnimationFrame(fit);
    setTimeout(() => {
      const first = window.innerWidth > 900 ? $('[data-ctl="heading.text"]') : $('.pe__bar .icon-btn');
      if (first) first.focus({ preventScroll: true });
    }, 80);
  }

  function close() {
    if (!root) return;
    if ((LOGO.paid || LOGO.credit) && !LOGO.saved && root.classList.contains('is-open') &&
      !window.confirm('You paid for a logo change on this poster but have not downloaded it yet.\n\nClose without downloading?')) return;
    root.classList.remove('is-open', 'is-full');
    document.body.classList.remove('pe-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  function reset() {
    // a logo change that was paid for survives the reset
    const old = LOGO.paid ? part('logo') : null;
    const keep = old ? { src: old.querySelector('img').getAttribute('src'), hidden: old.hidden } : null;
    mount(sourceHTML);
    if (keep) { const l = part('logo'); l.querySelector('img').setAttribute('src', keep.src); l.hidden = keep.hidden; sync(); }
    toast(keep ? 'Poster reset — your paid logo change is kept' : 'Poster reset to the original design');
  }

  /* ------------------------------------------------------------------
     TRIGGERS
     ------------------------------------------------------------------ */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-edit]');
    if (!t || (root && root.contains(t))) return;
    e.preventDefault();
    let id = t.dataset.edit;
    if (!id) { const card = t.closest('[data-template]'); id = card ? card.dataset.template : 'blank'; }
    document.querySelectorAll('.overlay.is-open').forEach((o) => o.classList.remove('is-open'));
    document.body.style.overflow = '';
    document.body.classList.remove('nav-open');
    open(id);
  });

  const param = new URLSearchParams(location.search).get('edit');
  if (param) window.addEventListener('load', () => open(param));

  window.PosterEditor = { open, close };
})();
