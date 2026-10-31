/* ==========================================================================
   Sbl — event-page.js   (shared by every inner page)
   Event / category pages: live search, filter chips, sorting, result count.
   Works with any event page that uses the same markup:
     #templateSearch · #templateFilters · #templateSort · #templateGrid
   ========================================================================== */
(function () {
  'use strict';

  const grid = document.getElementById('templateGrid');
  if (!grid) return;

  const { normalise, setActiveChip } = window.Sbl;
  const searchInput = document.getElementById('templateSearch');
  const filterGroup = document.getElementById('templateFilters');
  const sortSelect = document.getElementById('templateSort');
  const countEl = document.getElementById('resultsCount');
  const emptyEl = document.getElementById('templatesEmpty');
  const cards = Array.from(grid.querySelectorAll('.poster-card'));
  cards.forEach((c, i) => { c.dataset.order = i; });

  const state = { query: '', filter: 'all', sort: 'featured' };

  // Total template count in hero
  document.querySelectorAll('[data-total-count]').forEach((el) => { el.textContent = cards.length; });

  // Allow deep links like birthday.html?filter=friends&q=mom
  const params = new URLSearchParams(location.search);
  if (params.get('filter')) state.filter = params.get('filter');
  if (params.get('q')) { state.query = params.get('q'); if (searchInput) searchInput.value = state.query; }

  function apply() {
    const q = normalise(state.query);
    let shown = 0;

    cards.forEach((card) => {
      const tags = (card.dataset.tags || '').split(' ');
      const text = normalise(card.dataset.title + ' ' + card.dataset.cat + ' ' + card.dataset.tags);
      const matchFilter = state.filter === 'all' || tags.includes(state.filter);
      const matchQuery = !q || text.includes(q);
      const visible = matchFilter && matchQuery;
      card.hidden = !visible;
      if (visible) shown++;
    });

    // Sort (re-append in order; hidden cards are simply skipped visually)
    const sorted = cards.slice().sort((a, b) => {
      if (state.sort === 'newest') return b.dataset.added.localeCompare(a.dataset.added);
      if (state.sort === 'az') return a.dataset.title.localeCompare(b.dataset.title);
      return Number(a.dataset.order) - Number(b.dataset.order);
    });
    sorted.forEach((card, i) => {
      card.style.animationDelay = Math.min(i, 12) * 0.035 + 's';
      // Restart the entry animation so filtering feels alive
      grid.appendChild(card);
    });

    if (countEl) {
      countEl.innerHTML = shown
        ? `Showing <strong>${shown}</strong> of ${cards.length} templates`
        : 'Showing <strong>0</strong> templates';
    }
    if (emptyEl) emptyEl.classList.toggle('is-visible', shown === 0);
  }

  // Search (debounced)
  let t;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => { state.query = searchInput.value; apply(); }, 120);
    });
  }

  // Filter chips
  if (filterGroup) {
    const initial = filterGroup.querySelector(`[data-filter="${state.filter}"]`);
    if (initial) setActiveChip(filterGroup, initial); else state.filter = 'all';

    filterGroup.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-filter]');
      if (!chip) return;
      setActiveChip(filterGroup, chip);
      state.filter = chip.dataset.filter;
      chip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      apply();
    });
  }

  // Sort
  if (sortSelect) {
    sortSelect.addEventListener('change', () => { state.sort = sortSelect.value; apply(); });
  }

  apply();
})();

/* ==========================================================================
   HERO SCENE — shared engine.  Each page starts it from its own file
   (js/birthday.js, js/wedding.js …) with its own colours and particles:

     EventPage.init({
       particles: { type: 'confetti', colors: ['#ff6b8a', …], amount: 1 },
       bokeh:    ['rgba(255,236,170,.95)', …],
       sparkles: ['#fff6c9', …]
     });

   particle types:  confetti · petals · hearts · sparks · stars · mix
   ========================================================================== */
window.EventPage = (function () {
  'use strict';
  const R = Math.random;

  function init(cfg) {
    cfg = cfg || {};
    const hero = document.querySelector('.event-hero');
    if (!hero) return;

    /* Glowing bokeh lights */
    const bokeh = hero.querySelector('[data-bokeh]');
    if (bokeh) {
      const colors = cfg.bokeh || ['rgba(255,236,170,0.95)', 'rgba(255,190,215,0.9)', 'rgba(255,255,255,0.95)', 'rgba(210,195,255,0.85)', 'rgba(255,205,160,0.9)'];
      const n = Number(bokeh.dataset.bokeh) || 16;
      for (let i = 0; i < n; i++) {
        const b = document.createElement('span');
        b.className = 'bokeh';
        const s = 24 + R() * 90;
        b.style.cssText = `--x:${(R() * 100).toFixed(1)}%;--y:${(10 + R() * 85).toFixed(1)}%;--s:${s.toFixed(0)}px;` +
          `--b:${(s / 14).toFixed(1)}px;--c:${colors[i % colors.length]};--o:${(0.45 + R() * 0.5).toFixed(2)};` +
          `--d:${(9 + R() * 10).toFixed(1)}s;--delay:${(-R() * 18).toFixed(1)}s;--dx:${((R() - 0.5) * 70).toFixed(0)}px`;
        bokeh.appendChild(b);
      }
    }

    /* Twinkling sparkles */
    const sparkles = hero.querySelector('[data-sparkles]');
    if (sparkles) {
      const colors = cfg.sparkles || ['#fff6c9', '#ffffff', '#ffd76a', '#ffc2d6'];
      const n = Number(sparkles.dataset.sparkles) || 16;
      for (let i = 0; i < n; i++) {
        const s = document.createElement('span');
        s.className = 'sparkle';
        s.style.cssText = `--x:${(R() * 100).toFixed(1)}%;--y:${(R() * 95).toFixed(1)}%;--s:${(8 + R() * 16).toFixed(0)}px;` +
          `--c:${colors[i % colors.length]};--d:${(2.4 + R() * 3).toFixed(1)}s;--delay:${(-R() * 5).toFixed(1)}s`;
        sparkles.appendChild(s);
      }
    }

    /* Bunting garlands (only on pages that have <div data-bunting="colours">) */
    const bunting = hero.querySelector('[data-bunting]');
    if (bunting) {
      const colors = bunting.dataset.bunting.split(',').map((c) => c.trim());
      const garland = (side) => {
        const W = 520, flags = 9, sag = 70;
        const y = (x) => { const t = x / W; return 8 + sag * 4 * t * (1 - t) * (side === 'l' ? 1 - t * 0.35 : 0.65 + t * 0.35); };
        let path = `M0 ${y(0)}`;
        for (let x = 10; x <= W; x += 10) path += ` L${x} ${y(x).toFixed(1)}`;
        let svg = `<svg class="bunting bunting--${side}" viewBox="0 0 ${W} 150" aria-hidden="true">` +
          `<path d="${path}" fill="none" stroke="rgba(90,70,60,0.55)" stroke-width="2"/>`;
        for (let i = 0; i < flags; i++) {
          const x = 26 + i * ((W - 52) / (flags - 1));
          const top = y(x) + 1, w = 34, h = 44;
          const c = colors[i % colors.length];
          svg += `<g class="flag" style="--fd:${(2 + R() * 1.4).toFixed(2)}s;--fdelay:${(-R() * 2).toFixed(2)}s">` +
            `<path d="M${x - w / 2} ${top} L${x + w / 2} ${top} L${x} ${top + h} Z" fill="${c}"/>` +
            `<path d="M${x - w / 2} ${top} L${x + w / 2} ${top} L${x + w / 2 - 6} ${top + 7} L${x - w / 2 + 6} ${top + 7} Z" fill="rgba(255,255,255,0.35)"/></g>`;
        }
        return svg + '</svg>';
      };
      bunting.innerHTML = garland('l') + garland('r');
      const right = bunting.querySelector('.bunting--r');
      if (right) right.style.transform = 'scaleX(-1)';
    }

    particles(hero, cfg.particles || { type: 'confetti' });
  }

  /* ------------------------------------------------------------------
     Falling / rising particles drawn on <canvas data-confetti-canvas>
     ------------------------------------------------------------------ */
  function particles(hero, opt) {
    const canvas = hero.querySelector('[data-confetti-canvas]');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    const type = opt.type || 'confetti';
    const COLORS = opt.colors || ['#ff6b8a', '#ffc93c', '#7c5ce6', '#2ec4b6', '#ff9f5a', '#ffffff', '#f7a8c4'];
    const amount = opt.amount || 1;
    let W = 0, H = 0, dpr = 1, pieces = [], bursts = [], running = true, last = 0, nextBurst = 1.2;

    const kindFor = () => {
      if (type === 'mix') return ['confetti', 'heart', 'star', 'confetti'][Math.floor(R() * 4)];
      return { confetti: 'confetti', petals: 'petal', hearts: 'heart', sparks: 'spark', stars: 'star' }[type] || 'confetti';
    };

    function make(initial) {
      const kind = kindFor();
      const up = kind === 'heart' || kind === 'spark';
      const p = {
        kind, up,
        x: R() * W,
        y: initial ? R() * H : (up ? H + 20 + R() * 60 : -20 - R() * 60),
        color: COLORS[Math.floor(R() * COLORS.length)],
        sway: 18 + R() * 40, swaySpeed: 0.6 + R() * 1.2, phase: R() * Math.PI * 2,
        rot: R() * Math.PI * 2, rotSpeed: (R() - 0.5) * 2.4,
        flip: R() * Math.PI * 2, flipSpeed: 2 + R() * 4
      };
      if (kind === 'confetti') { p.w = 6 + R() * 7; p.h = 10 + R() * 10; p.round = R() < 0.22; p.vy = 22 + R() * 38; }
      if (kind === 'petal')    { p.s = 9 + R() * 11; p.vy = 16 + R() * 26; p.sway = 30 + R() * 60; p.flipSpeed = 0.8 + R() * 1.6; p.rotSpeed = (R() - 0.5) * 1.2; }
      if (kind === 'heart')    { p.s = 7 + R() * 12; p.vy = 14 + R() * 26; p.alpha = 0.45 + R() * 0.45; }
      if (kind === 'spark')    { p.s = 1.2 + R() * 2.4; p.vy = 18 + R() * 40; p.sway = 8 + R() * 22; p.tw = R() * 6; }
      if (kind === 'star')     { p.s = 5 + R() * 8; p.vy = 12 + R() * 22; p.tw = R() * 6; }
      return p;
    }

    function resize() {
      const r = hero.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.round(Math.min(90, Math.max(26, W / 16)) * amount);
      while (pieces.length < target) pieces.push(make(true));
      pieces.length = target;
    }

    function heartPath(s) {
      ctx.beginPath();
      ctx.moveTo(0, s * 0.9);
      ctx.bezierCurveTo(-s * 1.5, -s * 0.2, -s * 0.7, -s * 1.2, 0, -s * 0.35);
      ctx.bezierCurveTo(s * 0.7, -s * 1.2, s * 1.5, -s * 0.2, 0, s * 0.9);
      ctx.closePath();
    }
    function starPath(s) {
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.quadraticCurveTo(0, 0, s, 0); ctx.quadraticCurveTo(0, 0, 0, s);
      ctx.quadraticCurveTo(0, 0, -s, 0); ctx.quadraticCurveTo(0, 0, 0, -s);
      ctx.closePath();
    }

    function draw(p, x, t) {
      ctx.save();
      ctx.translate(x, p.y);
      if (p.kind === 'confetti') {
        const flip = Math.cos(p.flip);
        ctx.rotate(p.rot); ctx.scale(1, flip);
        ctx.globalAlpha = 0.9; ctx.fillStyle = p.color;
        if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.w * 0.45, 0, Math.PI * 2); ctx.fill(); }
        else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        if (flip < 0) { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); }
      } else if (p.kind === 'petal') {
        ctx.rotate(p.rot); ctx.scale(1, 0.45 + 0.55 * Math.abs(Math.cos(p.flip)));
        const g = ctx.createLinearGradient(0, -p.s, 0, p.s);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, p.color); g.addColorStop(1, p.color);
        ctx.fillStyle = g; ctx.globalAlpha = 0.92;
        ctx.beginPath();
        ctx.moveTo(0, -p.s);
        ctx.bezierCurveTo(p.s * 0.95, -p.s * 0.6, p.s * 0.8, p.s * 0.7, 0, p.s);
        ctx.bezierCurveTo(-p.s * 0.8, p.s * 0.7, -p.s * 0.95, -p.s * 0.6, 0, -p.s);
        ctx.fill();
      } else if (p.kind === 'heart') {
        ctx.rotate(Math.sin(p.phase) * 0.3);
        ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color;
        ctx.shadowColor = p.color; ctx.shadowBlur = 8;
        heartPath(p.s); ctx.fill();
      } else if (p.kind === 'spark') {
        const tw = 0.55 + 0.45 * Math.sin(t / 180 + p.tw);
        ctx.globalAlpha = tw; ctx.fillStyle = p.color;
        ctx.shadowColor = p.color; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(0, 0, p.s, 0, Math.PI * 2); ctx.fill();
      } else if (p.kind === 'star') {
        const tw = 0.6 + 0.4 * Math.sin(t / 260 + p.tw);
        ctx.rotate(p.rot); ctx.globalAlpha = tw; ctx.fillStyle = p.color;
        ctx.shadowColor = p.color; ctx.shadowBlur = 8;
        starPath(p.s * (0.8 + 0.2 * tw)); ctx.fill();
      }
      ctx.restore();
    }

    /* Firework bursts (used by the "sparks" scene) */
    function burst() {
      const cx = W * (0.12 + R() * 0.76), cy = H * (0.12 + R() * 0.4);
      const color = COLORS[Math.floor(R() * COLORS.length)], n = 26 + Math.floor(R() * 14);
      const parts = [];
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n + R() * 0.2, sp = 60 + R() * 90;
        parts.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1 });
      }
      bursts.push({ parts, color });
    }
    function drawBursts(dt) {
      bursts.forEach((b) => {
        ctx.fillStyle = b.color; ctx.shadowColor = b.color; ctx.shadowBlur = 10;
        b.parts.forEach((q) => {
          q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 46 * dt; q.vx *= 0.985; q.vy *= 0.985; q.life -= dt * 0.62;
          if (q.life <= 0) return;
          ctx.globalAlpha = Math.max(0, q.life);
          ctx.beginPath(); ctx.arc(q.x, q.y, 1.8 + q.life * 1.4, 0, Math.PI * 2); ctx.fill();
        });
      });
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      bursts = bursts.filter((b) => b.parts.some((q) => q.life > 0));
    }

    function frame(t) {
      if (!running) return;
      const dt = Math.min(0.05, (t - (last || t)) / 1000);
      last = t;
      ctx.clearRect(0, 0, W, H);
      for (const p of pieces) {
        p.phase += p.swaySpeed * dt;
        p.y += (p.up ? -p.vy : p.vy) * dt;
        p.rot += p.rotSpeed * dt;
        p.flip += p.flipSpeed * dt;
        if ((!p.up && p.y > H + 30) || (p.up && p.y < -30)) Object.assign(p, make(false));
        draw(p, p.x + Math.sin(p.phase) * p.sway, t);
      }
      if (type === 'sparks') {
        nextBurst -= dt;
        if (nextBurst <= 0) { burst(); nextBurst = 1.6 + R() * 2.2; }
        drawBursts(dt);
      }
      requestAnimationFrame(frame);
    }

    const start = () => { if (!running) { running = true; last = 0; requestAnimationFrame(frame); } };
    const stop = () => { running = false; };

    resize();
    window.addEventListener('resize', resize);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => (e.isIntersecting && !document.hidden ? start() : stop())).observe(hero);
    }
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    requestAnimationFrame(frame);
  }

  return { init };
})();
