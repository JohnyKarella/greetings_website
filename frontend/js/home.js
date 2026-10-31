/* ==========================================================================
   Sbl — home.js
   Only for the HOME page (index.html):
   hero parallax · occasion search · "Trending now" filter chips
   Needs js/script.js to be loaded first.
   ========================================================================== */
(function () {
  'use strict';

  const W = window.Sbl || {};
  const normalise = W.normalise || ((s) => String(s).toLowerCase().trim());
  const setActiveChip = W.setActiveChip || function () {};
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ------------------------------------------------------------------
     HERO PARALLAX (mouse only, desktop)
     ------------------------------------------------------------------ */
  const stage = $('#heroStage');
  if (stage && !reduceMotion && window.matchMedia('(pointer: fine)').matches) {
    const hero = stage.closest('section');
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
      stage.style.setProperty('--px', x.toFixed(3));
      stage.style.setProperty('--py', y.toFixed(3));
    });
    hero.addEventListener('pointerleave', () => {
      stage.style.setProperty('--px', 0);
      stage.style.setProperty('--py', 0);
    });
  }

  /* ------------------------------------------------------------------
     HOME — filter occasion cards
     ------------------------------------------------------------------ */
  const eventFilter = $('#eventFilter');
  const eventsGrid = $('#eventsGrid');
  if (eventFilter && eventsGrid) {
    const cards = $$('.event-card', eventsGrid);
    const empty = $('#eventsEmpty');
    eventFilter.addEventListener('input', () => {
      const q = normalise(eventFilter.value);
      let shown = 0;
      cards.forEach((card) => {
        const hay = normalise(card.textContent + ' ' + (card.dataset.search || ''));
        const match = !q || hay.includes(q);
        card.hidden = !match;
        card.style.display = match ? '' : 'none';
        if (match) { shown++; card.classList.add('is-visible'); }
      });
      if (empty) empty.classList.toggle('is-visible', shown === 0);
    });
  }

  /* ------------------------------------------------------------------
     HOME — trending filter chips
     ------------------------------------------------------------------ */
  const trendingFilters = $('#trendingFilters');
  if (trendingFilters) {
    const posters = $$('#trendingGrid .poster-card');
    trendingFilters.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-filter]');
      if (!chip) return;
      setActiveChip(trendingFilters, chip);
      const f = chip.dataset.filter;
      posters.forEach((p) => {
        const show = f === 'all' || (p.dataset.tags || '').split(' ').includes(f);
        p.hidden = !show;
        if (show) p.classList.add('is-visible');
      });
    });
  }
})();
