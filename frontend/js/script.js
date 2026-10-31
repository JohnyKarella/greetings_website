/* ==========================================================================
   Sbl — script.js
   Shared behaviour for every page:
   navbar · mobile menu · scroll reveal · search overlay · favourites ·
   preview lightbox · glitter · floating shapes ·
   "coming soon" toasts · page transitions
   ========================================================================== */
(function () {
  'use strict';

  const body = document.body;
  const ROOT = body.dataset.root || '';               // "" on home, "../" on /events/ pages
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ------------------------------------------------------------------
     SEARCH INDEX — add new occasions / templates here.
     `url` and `img` are relative to the site root (ROOT is prefixed).
     ------------------------------------------------------------------ */
  const SEARCH_INDEX = [
    { title: 'All Events', type: 'All occasions', url: 'events/events.html', img: 'images/0 home/13 New Year.png', keys: 'all events every occasion greetings' },
    { title: 'Birthday', type: 'Occasion', url: 'events/birthday.html', img: 'images/events/birthday.jpg', keys: 'birthday bday party cake kids' },
    { title: 'Wedding', type: 'Occasion', url: 'events/wedding.html', img: 'images/events/wedding.jpg', keys: 'wedding marriage engagement invitation save the date' },
    { title: 'Anniversary', type: 'Occasion', url: 'events/anniversary.html', img: 'images/events/anniversary.jpg', keys: 'anniversary love couple parents' },
    { title: 'Festivals', type: 'Occasion', url: 'events/festivals.html', img: 'images/0 home/4 Festival.png', keys: 'festival festivals onam pongal holi eid' },
    { title: 'Special Days', type: 'Occasion', url: 'events/special-days.html', img: 'images/0 home/7 Father\'s Day.png', keys: 'special days national awareness' },
    { title: 'Diwali', type: 'Festival', url: 'events/festivals.html?filter=diwali', img: 'images/events/diwali.jpg', keys: 'diwali deepavali lights' },
    { title: 'Christmas', type: 'Festival', url: 'events/festivals.html?filter=christmas', img: 'images/events/christmas.jpg', keys: 'christmas xmas santa' },
    { title: 'New Year', type: 'Festival', url: 'events/festivals.html?filter=newyear', img: 'images/events/new-year.jpg', keys: 'new year' },
    { title: 'Mother\'s Day', type: 'Special Day', url: 'events/special-days.html?filter=mothers', img: 'images/events/mothers-day.jpg', keys: 'mother\'s day mothers mom mum' },
    { title: 'Father\'s Day', type: 'Special Day', url: 'events/special-days.html?filter=fathers', img: 'images/events/fathers-day.jpg', keys: 'father\'s day fathers dad' },
    { title: 'Friendship Day', type: 'Special Day', url: 'events/special-days.html?filter=friendship', img: 'images/events/friendship-day.jpg', keys: 'friendship friends' },
    { title: 'Valentine\'s Day', type: 'Special Day', url: 'events/special-days.html?filter=valentine', img: 'images/events/valentines-day.jpg', keys: 'valentine\'s valentines love' },
    { title: 'Women\'s Day', type: 'Awareness Day', url: 'events/special-days.html?filter=awareness', img: 'images/events/womens-day.jpg', keys: 'women\'s womens' },
    { title: 'Teachers\' Day', type: 'Awareness Day', url: 'events/special-days.html?filter=awareness', img: 'images/events/teachers-day.jpg', keys: 'teachers\' teacher' },
    { title: 'Environment Day', type: 'Awareness Day', url: 'events/special-days.html?filter=awareness', img: 'images/events/environment-day.jpg', keys: 'environment earth green' },
    { title: 'Independence Day', type: 'National Day', url: 'events/special-days.html?filter=national', img: 'images/events/independence-day.jpg', keys: 'independence 15 august india' },
    { title: 'Republic Day', type: 'National Day', url: 'events/special-days.html?filter=national', img: 'images/events/republic-day.jpg', keys: 'republic 26 january india' },
    { title: 'Baby Shower', type: 'Occasion', url: 'events/special-days.html?filter=baby', img: 'images/events/baby-shower.jpg', keys: 'baby shower newborn' },
    { title: 'Happy Birthday — Balloons', type: 'Editable birthday template', url: 'events/birthday.html?edit=birthday-01', img: 'images/events/birthday.jpg', keys: 'birthday balloons template' },
    { title: 'Best Friend Forever', type: 'Editable birthday template', url: 'events/birthday.html?edit=birthday-02', img: 'images/photos/confetti-woman.jpg', keys: 'birthday friend bff template' },
    { title: 'Happy Birthday Mom', type: 'Editable birthday template', url: 'events/birthday.html?edit=birthday-03', img: 'images/photos/pink-bouquet.jpg', keys: 'birthday mom mother family template' },
    { title: 'Happy Diwali — Golden Diyas', type: 'Editable festival template', url: 'index.html?edit=diwali-01', img: 'images/photos/diya.jpg', keys: 'diwali template festival' },
    { title: 'Merry Christmas', type: 'Editable festival template', url: 'index.html?edit=christmas-01', img: 'images/photos/christmas-baubles.jpg', keys: 'christmas template' },
    { title: 'Just Married', type: 'Editable wedding template', url: 'index.html?edit=wedding-01', img: 'images/photos/rings-roses.jpg', keys: 'wedding married template' },
    { title: 'Forever Begins — Lakeside', type: 'Editable wedding template', url: 'events/wedding.html?edit=wedding-01', img: 'images/0 home/8 Wedding.png', keys: 'wedding invitation invite elegant template' },
    { title: 'Just Married', type: 'Editable wedding template', url: 'events/wedding.html?edit=wedding-02', img: 'images/bg-wedding-flowers', keys: 'wedding just married married template' },
    { title: 'Save the Date', type: 'Editable wedding template', url: 'events/wedding.html?edit=wedding-03', img: 'images/bg-flowers-lace', keys: 'wedding save the date savedate template' },
    { title: 'Golden Vows', type: 'Editable wedding template', url: 'events/wedding.html?edit=wedding-04', img: 'images/bg-bokeh-gold', keys: 'wedding invitation invite elegant template' },
    { title: 'She Said Yes!', type: 'Editable wedding template', url: 'events/wedding.html?edit=wedding-05', img: 'images/bg-pink-roses', keys: 'wedding engagement engagement template' },
    { title: 'Shubh Vivah', type: 'Editable wedding template', url: 'events/wedding.html?edit=wedding-06', img: 'images/bg-red-roses', keys: 'wedding traditional traditional invite template' },
    { title: 'Happily Ever After', type: 'Editable wedding template', url: 'events/wedding.html?edit=wedding-07', img: 'images/bg-confetti-white', keys: 'wedding just married married template' },
    { title: 'Mr & Mrs', type: 'Editable wedding template', url: 'events/wedding.html?edit=wedding-08', img: 'images/bg-gold-stars', keys: 'wedding elegant married elegant template' },
    { title: 'Happy Anniversary — Paper Hearts', type: 'Editable anniversary template', url: 'events/anniversary.html?edit=anniversary-01', img: 'images/0 home/1 Anniversary.png', keys: 'anniversary for couple couple romantic template' },
    { title: 'Ten Wonderful Years', type: 'Editable anniversary template', url: 'events/anniversary.html?edit=anniversary-02', img: 'images/0 home/11 a Valentine\'s Day.png', keys: 'anniversary milestone milestone couple template' },
    { title: 'To Mom & Dad', type: 'Editable anniversary template', url: 'events/anniversary.html?edit=anniversary-03', img: 'images/bg-flowers-lace', keys: 'anniversary for parents parents elegant template' },
    { title: 'Still the One', type: 'Editable anniversary template', url: 'events/anniversary.html?edit=anniversary-04', img: 'images/bg-red-roses', keys: 'anniversary romantic romantic couple template' },
    { title: 'Silver Jubilee', type: 'Editable anniversary template', url: 'events/anniversary.html?edit=anniversary-05', img: 'images/bg-bokeh-gold', keys: 'anniversary milestone milestone parents template' },
    { title: 'Thanks for Tolerating Me', type: 'Editable anniversary template', url: 'events/anniversary.html?edit=anniversary-06', img: 'images/bg-balloons-pink-gold', keys: 'anniversary funny funny couple template' },
    { title: 'Our Love Story', type: 'Editable anniversary template', url: 'events/anniversary.html?edit=anniversary-07', img: 'images/bg-pink-roses', keys: 'anniversary romantic romantic couple template' },
    { title: 'Cheers to Us', type: 'Editable anniversary template', url: 'events/anniversary.html?edit=anniversary-08', img: 'images/bg-wedding-flowers', keys: 'anniversary for couple couple template' },
    { title: 'Happy Diwali — Golden Diyas', type: 'Editable festival template', url: 'events/festivals.html?edit=festival-diwali-01', img: 'images/bg-diya', keys: 'festival diwali diwali template' },
    { title: 'Shubh Deepavali', type: 'Editable festival template', url: 'events/festivals.html?edit=festival-diwali-02', img: 'images/0 home/3 Diwali.png', keys: 'festival diwali diwali template' },
    { title: 'Merry Christmas — Winter Frame', type: 'Editable festival template', url: 'events/festivals.html?edit=festival-christmas-01', img: 'images/0 home/12 Christmas.png', keys: 'festival christmas christmas template' },
    { title: 'Jingle All the Way', type: 'Editable festival template', url: 'events/festivals.html?edit=festival-christmas-02', img: 'images/bg-christmas-tree', keys: 'festival christmas christmas template' },
    { title: 'Happy New Year', type: 'Editable festival template', url: 'events/festivals.html?edit=festival-newyear-01', img: 'images/bg-fireworks', keys: 'festival new year newyear template' },
    { title: 'Hello 2027', type: 'Editable festival template', url: 'events/festivals.html?edit=festival-newyear-02', img: 'images/0 home/13 New Year.png', keys: 'festival new year newyear template' },
    { title: 'Happy Onam', type: 'Editable festival template', url: 'events/festivals.html?edit=festival-onam-01', img: 'images/0 home/4 a Festival.png', keys: 'festival harvest harvest template' },
    { title: 'Happy Holi', type: 'Editable festival template', url: 'events/festivals.html?edit=festival-holi-01', img: 'images/bg-confetti-sky', keys: 'festival holi holi template' },
    { title: 'Eid Mubarak', type: 'Editable festival template', url: 'events/festivals.html?edit=festival-eid-01', img: 'images/bg-gold-stars', keys: 'festival eid eid template' },
    { title: 'Happy Pongal', type: 'Editable festival template', url: 'events/festivals.html?edit=festival-pongal-01', img: 'images/bg-bokeh-gold', keys: 'festival harvest harvest template' },
    { title: 'Happy Mother\'s Day', type: 'Editable special day template', url: 'events/special-days.html?edit=special-mothers-01', img: 'images/bg-pink-roses', keys: 'special day mother\'s day mothers template' },
    { title: 'Thank You, Maa', type: 'Editable special day template', url: 'events/special-days.html?edit=special-mothers-02', img: 'images/0 home/6 Mother\'s Day.png', keys: 'special day mother\'s day mothers template' },
    { title: 'Happy Father\'s Day — Sunset', type: 'Editable special day template', url: 'events/special-days.html?edit=special-fathers-01', img: 'images/0 home/7 a Father\'s Day.png', keys: 'special day father\'s day fathers template' },
    { title: 'Friends Forever', type: 'Editable special day template', url: 'events/special-days.html?edit=special-friendship-01', img: 'images/0 home/9 a Friendship Day.png', keys: 'special day friendship day friendship template' },
    { title: 'Be Mine', type: 'Editable special day template', url: 'events/special-days.html?edit=special-valentine-01', img: 'images/0 home/11 a Valentine\'s Day.png', keys: 'special day valentine\'s day valentine template' },
    { title: 'Happy Independence Day', type: 'Editable special day template', url: 'events/special-days.html?edit=special-independence-01', img: 'images/0 home/14 a Independence Day.png', keys: 'special day national day national template' },
    { title: 'Happy Republic Day', type: 'Editable special day template', url: 'events/special-days.html?edit=special-republic-01', img: 'images/0 home/5 Republic Day.png', keys: 'special day national day national template' },
    { title: 'Happy Teachers\' Day', type: 'Editable special day template', url: 'events/special-days.html?edit=special-teachers-01', img: 'images/bg-books-apple', keys: 'special day awareness day awareness template' },
    { title: 'Thank You, Teacher', type: 'Editable special day template', url: 'events/special-days.html?edit=special-teachers-02', img: 'images/0 home/15 Teachers\' Day.png', keys: 'special day awareness day awareness template' },
    { title: 'Go Green', type: 'Editable special day template', url: 'events/special-days.html?edit=special-environment-01', img: 'images/0 home/16 a Environment Day.png', keys: 'special day awareness day awareness template' },
    { title: 'Happy Women\'s Day', type: 'Editable special day template', url: 'events/special-days.html?edit=special-womens-01', img: 'images/0 home/10 Women\'s Day.png', keys: 'special day awareness day awareness template' },
    { title: 'Baby Shower', type: 'Editable special day template', url: 'events/special-days.html?edit=special-baby-01', img: 'images/0 home/2 Baby Shower.png', keys: 'special day baby shower baby template' },
    { title: 'Happy Birthday — Rose Gold', type: 'Editable greeting template', url: 'events/events.html?edit=events-birthday-01', img: 'images/0 home/9 (2).png', keys: 'greeting birthday birthday template' },
    { title: 'Forever Begins — Lakeside', type: 'Editable greeting template', url: 'events/events.html?edit=events-wedding-01', img: 'images/0 home/8 Wedding.png', keys: 'greeting wedding wedding template' },
    { title: 'Happy Diwali — Golden Diyas', type: 'Editable greeting template', url: 'events/events.html?edit=events-diwali-01', img: 'images/bg-diya', keys: 'greeting festival festivals template' },
    { title: 'Happy Anniversary — Paper Hearts', type: 'Editable greeting template', url: 'events/events.html?edit=events-anniversary-01', img: 'images/0 home/1 Anniversary.png', keys: 'greeting anniversary anniversary template' },
    { title: 'Happy Father\'s Day — Sunset', type: 'Editable greeting template', url: 'events/events.html?edit=events-fathers-01', img: 'images/0 home/7 a Father\'s Day.png', keys: 'greeting special day special template' },
    { title: 'Merry Christmas — Winter Frame', type: 'Editable greeting template', url: 'events/events.html?edit=events-christmas-01', img: 'images/0 home/12 Christmas.png', keys: 'greeting festival festivals template' },
    { title: 'Just Married', type: 'Editable greeting template', url: 'events/events.html?edit=events-wedding-02', img: 'images/bg-wedding-flowers', keys: 'greeting wedding wedding template' },
    { title: 'Friends Forever', type: 'Editable greeting template', url: 'events/events.html?edit=events-friendship-01', img: 'images/0 home/9 a Friendship Day.png', keys: 'greeting special day special template' },
    { title: 'Happy Onam', type: 'Editable greeting template', url: 'events/events.html?edit=events-onam-01', img: 'images/0 home/4 a Festival.png', keys: 'greeting festival festivals template' },
    { title: 'Still the One', type: 'Editable greeting template', url: 'events/events.html?edit=events-anniversary-02', img: 'images/bg-red-roses', keys: 'greeting anniversary anniversary template' },
    { title: 'Happy Independence Day', type: 'Editable greeting template', url: 'events/events.html?edit=events-independence-01', img: 'images/0 home/14 a Independence Day.png', keys: 'greeting special day special template' },
    { title: 'Go Green', type: 'Editable greeting template', url: 'events/events.html?edit=events-environment-01', img: 'images/0 home/16 a Environment Day.png', keys: 'greeting special day special template' }
  ];
  const POPULAR = ['Birthday', 'Diwali', 'Wedding', "Mother's Day", 'Christmas', 'Anniversary'];

  /* ------------------------------------------------------------------
     TOAST
     ------------------------------------------------------------------ */
  const toast = $('#toast');
  const toastText = $('#toastText');
  let toastTimer;
  function showToast(message, ms) {
    if (!toast) return;
    toastText.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), ms || 2800);
  }

  /* ------------------------------------------------------------------
     PAGE LOAD + PAGE TRANSITIONS
     ------------------------------------------------------------------ */
  function pageReady() {
    body.classList.remove('is-loading');
    requestAnimationFrame(() => body.classList.add('is-ready'));
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', pageReady);
  } else { pageReady(); }
  // Coming back via the browser back button (bfcache)
  window.addEventListener('pageshow', (e) => { if (e.persisted) body.classList.remove('is-leaving', 'is-loading'); });

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;

    // Links to pages that are not built yet → friendly toast instead of a 404
    if (link.hasAttribute('data-soon')) {
      e.preventDefault();
      showToast(`${link.dataset.soon || 'This page'} is coming in the next phase.`);
      return;
    }

    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') ||
        link.hasAttribute('download') || link.target === '_blank' ||
        e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || reduceMotion) return;

    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin && location.protocol !== 'file:') return;
    // Same page with a hash → let smooth scrolling handle it
    if (url.pathname === location.pathname && url.hash) return;

    e.preventDefault();
    closeMenu();
    body.classList.add('is-leaving');
    setTimeout(() => { window.location.href = link.href; }, 320);
  });

  /* ------------------------------------------------------------------
     HEADER — shrink on scroll
     ------------------------------------------------------------------ */
  const header = $('#siteHeader');
  let ticking = false;
  function onScroll() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 24);
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  /* ------------------------------------------------------------------
     MOBILE MENU
     ------------------------------------------------------------------ */
  const toggle = $('.nav__toggle');
  const mobileMenu = $('#mobileMenu');
  function openMenu() {
    body.classList.add('nav-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
  }
  function closeMenu() {
    if (!toggle) return;
    body.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
  }
  if (toggle && mobileMenu) {
    toggle.addEventListener('click', () => body.classList.contains('nav-open') ? closeMenu() : openMenu());
    $$('a', mobileMenu).forEach((a) => a.addEventListener('click', () => {
      if (!a.hasAttribute('data-soon')) closeMenu();
    }));
    window.addEventListener('resize', () => { if (window.innerWidth > 1140) closeMenu(); });
  }

  /* ------------------------------------------------------------------
     SCROLL REVEAL
     ------------------------------------------------------------------ */
  const revealEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  function setActiveChip(group, chip) {
    $$('.chip', group).forEach((c) => {
      const active = c === chip;
      c.classList.toggle('is-active', active);
      c.setAttribute('aria-pressed', String(active));
    });
  }

  /* ------------------------------------------------------------------
     FAVOURITES (visual only)
     ------------------------------------------------------------------ */
  document.addEventListener('click', (e) => {
    const fav = e.target.closest('.poster-card__fav');
    if (!fav) return;
    const liked = fav.classList.toggle('is-liked');
    fav.setAttribute('aria-pressed', String(liked));
    showToast(liked ? 'Saved to your favourites ❤' : 'Removed from favourites');
  });

  /* ------------------------------------------------------------------
     OVERLAYS — shared open/close with focus handling
     ------------------------------------------------------------------ */
  let lastFocus = null;
  function openOverlay(el, focusTarget) {
    lastFocus = document.activeElement;
    el.classList.add('is-open');
    body.style.overflow = 'hidden';
    setTimeout(() => (focusTarget || el.querySelector('button, input, a')).focus(), 60);
  }
  function closeOverlay(el) {
    el.classList.remove('is-open');
    if (!body.classList.contains('nav-open')) body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }
  $$('.overlay').forEach((ov) => {
    ov.addEventListener('click', (e) => { if (e.target === ov) closeOverlay(ov); });
    // Keep keyboard focus inside the dialog
    ov.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const f = $$('a[href], button, input', ov).filter((n) => n.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const open = $('.overlay.is-open');
      if (open) closeOverlay(open);
      else closeMenu();
    }
    // Press "/" to search
    if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) {
      e.preventDefault();
      openSearch();
    }
  });

  /* ------------------------------------------------------------------
     SEARCH OVERLAY
     ------------------------------------------------------------------ */
  const searchOverlay = $('#searchOverlay');
  const searchInput = $('#globalSearch');
  const searchResults = $('#searchResults');
  const searchLabel = $('#searchLabel');

  function normalise(str) {
    return (str || '').toLowerCase().replace(/[’']/g, '').replace(/\s+/g, ' ').trim();
  }
  function renderResults(q) {
    if (!searchResults) return;
    const nq = normalise(q);
    let items;
    if (!nq) {
      items = SEARCH_INDEX.filter((i) => POPULAR.includes(i.title));
      searchLabel.textContent = 'Popular searches';
    } else {
      items = SEARCH_INDEX.filter((i) => normalise(i.title + ' ' + i.type + ' ' + i.keys).includes(nq));
      searchLabel.textContent = items.length ? `${items.length} result${items.length > 1 ? 's' : ''}` : 'No results';
    }
    if (!items.length) {
      searchResults.innerHTML = `<p class="search-empty">Nothing found for “${escapeHtml(q)}”. Try Birthday, Diwali or Wedding.</p>`;
      return;
    }
    searchResults.innerHTML = items.slice(0, 8).map((i) => `
      <a class="search-result" href="${ROOT + i.url}"${i.soon ? ` data-soon="${escapeHtml(i.title)} greetings"` : ''}>
        <img src="${ROOT + i.img}" alt="" width="52" height="52" loading="lazy">
        <div><strong>${escapeHtml(i.title)}</strong><span>${escapeHtml(i.type)}${i.soon ? ' · coming soon' : ''}</span></div>
        <svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg>
      </a>`).join('');
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }
  function openSearch() {
    if (!searchOverlay) return;
    closeMenu();
    renderResults(searchInput.value);
    openOverlay(searchOverlay, searchInput);
  }
  $$('[data-search-open]').forEach((b) => b.addEventListener('click', openSearch));
  $$('[data-search-close]').forEach((b) => b.addEventListener('click', () => closeOverlay(searchOverlay)));
  if (searchInput) {
    searchInput.addEventListener('input', () => renderResults(searchInput.value));
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const first = $('.search-result', searchResults);
        if (first) first.click();
      }
    });
  }

  /* ------------------------------------------------------------------
     PREVIEW LIGHTBOX — shows a full-size copy of the card's poster
     ------------------------------------------------------------------ */
  const lightbox = $('#lightbox');
  function openLightbox(card) {
    if (!lightbox || !card) return;
    const src = card.querySelector('.poster');
    const holder = $('#lightboxPoster');
    holder.innerHTML = '';
    if (src) {
      const copy = src.cloneNode(true);
      copy.querySelectorAll('img').forEach((i) => { i.loading = 'eager'; });
      if (!copy.dataset.name) copy.dataset.name = card.dataset.title || 'greeting';
      holder.appendChild(copy);
    }
    $('#lightboxTitle').textContent = card.dataset.title || '';
    $('#lightboxCat').textContent = card.dataset.cat || '';
    $('#lightboxEdit').dataset.edit = card.dataset.template || '';
    openOverlay(lightbox, $('[data-lightbox-close]', lightbox));
  }
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-preview]');
    if (!btn) return;
    openLightbox(btn.closest('[data-template]'));
  });
  $$('[data-lightbox-close]').forEach((b) => b.addEventListener('click', () => closeOverlay(lightbox)));

  /* Decorative copies of posters (e.g. the floating posters in the event header) */
  $$('[data-clone-poster]').forEach((slot) => {
    const src = document.querySelector(`[data-template="${slot.dataset.clonePoster}"] .poster`);
    if (src) slot.appendChild(src.cloneNode(true));
  });

  /* ------------------------------------------------------------------
     NEWSLETTER + FOOTER YEAR
     ------------------------------------------------------------------ */
  // Newsletter → saved in MongoDB by the backend (collection "subscribers")
  $$('[data-newsletter]').forEach((form) => form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = form.querySelector('input[type="email"]');
    const btn = form.querySelector('button[type="submit"]');
    if (!window.SblApi) { showToast('Could not subscribe — js/api.js is missing on this page.'); return; }
    if (btn) { btn.disabled = true; btn.classList.add('is-busy'); }
    try {
      const res = await window.SblApi.post('/api/newsletter', { email: input ? input.value : '' });
      form.reset();
      showToast(res.message || 'Thanks! New templates will land in your inbox.');
    } catch (err) {
      showToast(err.offline ? 'Could not subscribe right now — the server is not running.' : err.message, 5000);
    } finally {
      if (btn) { btn.disabled = false; btn.classList.remove('is-busy'); }
    }
  }));
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ------------------------------------------------------------------
     GLITTER — sparkle burst + glow ring on every button press
     ------------------------------------------------------------------ */
  const GLITTER_COLORS = ['#ff6b5b', '#ec5a8c', '#7c5ce6', '#ffd24d', '#2a9d8f', '#ffffff'];
  const GLITTER_TARGETS = '.btn, .poster-action, .chip, .icon-btn, .poster-card__fav, .pe-seg button, .pe-grid button, .pe__tabs button, .pe-bgs button, [data-glitter]';

  function burst(x, y, count, spread) {
    if (reduceMotion) return;
    const layer = document.createElement('div');
    layer.className = 'glitter-layer';
    layer.style.left = x + 'px';
    layer.style.top = y + 'px';
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
      const dist = spread * (0.5 + Math.random() * 0.7);
      p.className = 'glitter' + (Math.random() < 0.45 ? ' glitter--star' : '');
      p.style.setProperty('--tx', Math.cos(angle) * dist + 'px');
      p.style.setProperty('--ty', Math.sin(angle) * dist + 'px');
      p.style.setProperty('--c', GLITTER_COLORS[i % GLITTER_COLORS.length]);
      p.style.setProperty('--s', (6 + Math.random() * 8).toFixed(1) + 'px');
      p.style.setProperty('--r', Math.round(Math.random() * 360) + 'deg');
      p.style.animationDelay = (Math.random() * 0.08).toFixed(2) + 's';
      layer.appendChild(p);
    }
    const ring = document.createElement('span');
    ring.className = 'glitter-ring';
    layer.appendChild(ring);
    document.body.appendChild(layer);
    setTimeout(() => layer.remove(), 1100);
  }

  function celebrate(x, y) {
    const cx = x || window.innerWidth / 2;
    const cy = y || window.innerHeight / 2;
    burst(cx, cy, 34, 170);
    setTimeout(() => burst(cx - 60, cy - 30, 14, 90), 120);
    setTimeout(() => burst(cx + 60, cy - 20, 14, 90), 220);
  }

  document.addEventListener('pointerdown', (e) => {
    const target = e.target.closest(GLITTER_TARGETS);
    if (!target || target.disabled) return;
    burst(e.clientX, e.clientY, target.matches('.btn, .poster-action') ? 22 : 12, target.matches('.btn') ? 110 : 70);
    target.classList.remove('is-glowing');
    void target.offsetWidth;
    target.classList.add('is-glowing');
    setTimeout(() => target.classList.remove('is-glowing'), 700);
  });

  /* ------------------------------------------------------------------
     FLOATING SHAPES — fills any [data-floaters="N"] container
     data-floaters-type="balloons" makes balloons rise instead
     ------------------------------------------------------------------ */
  const SHAPE_SVGS = {
    star: '<svg viewBox="0 0 24 24"><path d="M12 2c.6 4.8 2.9 7.3 8 8-5.1.7-7.4 3.2-8 8-.6-4.8-2.9-7.3-8-8 5.1-.7 7.4-3.2 8-8Z"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M12 21s-8-4.9-10-9.8C.7 7.7 3 4.2 6.6 4.2c2.2 0 3.7 1.2 5.4 3.3 1.7-2.1 3.2-3.3 5.4-3.3 3.6 0 5.9 3.5 4.6 7C20 16.1 12 21 12 21Z"/></svg>',
    squiggle: '<svg viewBox="0 0 40 16"><path d="M2 8c4-8 8 8 12 0s8 8 12 0 8 8 12 0" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
    balloon: '<svg viewBox="0 0 30 60"><ellipse cx="15" cy="14" rx="12" ry="14"/><path d="M15 28l-3 4h6z"/><path d="M15 32c-3 8 3 14 0 26" fill="none" stroke="currentColor" stroke-width="1" opacity=".5"/><ellipse cx="10" cy="9" rx="3" ry="5" fill="#fff" opacity=".35"/></svg>'
  };
  const FLOAT_COLORS = ['var(--accent)', 'var(--accent-2)', 'var(--secondary)', 'var(--gold)', '#2a9d8f', '#ffb4c8', '#b7a4ff'];

  function initFloaters() {
    $$('[data-floaters]').forEach((host) => {
      if (host.querySelector('.floaters')) return;
      const count = Number(host.dataset.floaters) || 8;
      const type = host.dataset.floatersType;
      const layer = document.createElement('div');
      layer.className = 'floaters' + (type === 'balloons' ? ' floaters--balloons' : '');
      layer.setAttribute('aria-hidden', 'true');
      for (let i = 0; i < count; i++) {
        const el = document.createElement('span');
        const r = Math.random;
        let kind;
        if (type === 'balloons') kind = 'balloon';
        else kind = ['dot', 'ring', 'star', 'star', 'heart', 'squiggle', 'dot'][i % 7];
        el.className = 'floater floater--' + kind;
        if (SHAPE_SVGS[kind]) el.innerHTML = SHAPE_SVGS[kind];
        el.style.setProperty('--x', (r() * 96 + 2).toFixed(1) + '%');
        el.style.setProperty('--y', (r() * 90 + 5).toFixed(1) + '%');
        el.style.setProperty('--size', (kind === 'balloon' ? 26 + r() * 26 : kind === 'dot' ? 8 + r() * 14 : 16 + r() * 22).toFixed(0) + 'px');
        el.style.setProperty('--c', FLOAT_COLORS[Math.floor(r() * FLOAT_COLORS.length)]);
        el.style.setProperty('--dur', (kind === 'balloon' ? 14 + r() * 12 : 7 + r() * 8).toFixed(1) + 's');
        el.style.setProperty('--delay', (-r() * 20).toFixed(1) + 's');
        el.style.setProperty('--dx', ((r() - 0.5) * 60).toFixed(0) + 'px');
        el.style.setProperty('--dy', (-20 - r() * 40).toFixed(0) + 'px');
        el.style.setProperty('--rot', ((r() - 0.5) * 90).toFixed(0) + 'deg');
        layer.appendChild(el);
      }
      host.classList.add('has-floaters');
      host.prepend(layer);
    });

    // Pause animations while a section is off-screen (saves battery)
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => en.target.classList.toggle('is-paused', !en.isIntersecting));
      });
      $$('.floaters').forEach((f) => io.observe(f));
    }
  }
  if (!reduceMotion) initFloaters();

  /* ------------------------------------------------------------------
     3D TILT on poster & event cards (mouse only)
     ------------------------------------------------------------------ */
  if (!reduceMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.addEventListener('pointermove', (e) => {
      const media = e.target.closest('.poster-card__media');
      $$('.is-tilting').forEach((m) => { if (m !== media) { m.classList.remove('is-tilting'); m.style.removeProperty('--rx'); m.style.removeProperty('--ry'); } });
      if (!media) return;
      const r = media.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      media.classList.add('is-tilting');
      media.style.setProperty('--rx', (-py * 10).toFixed(2) + 'deg');
      media.style.setProperty('--ry', (px * 12).toFixed(2) + 'deg');
      media.style.setProperty('--gx', ((px + 0.5) * 100).toFixed(0) + '%');
      media.style.setProperty('--gy', ((py + 0.5) * 100).toFixed(0) + '%');
    }, { passive: true });
  }

  // Small public API for page-specific scripts (home.js, event-page.js, editor.js)
  window.Sbl = { showToast, openLightbox, normalise, setActiveChip, celebrate, burst, ROOT };
})();







/* ==========================================================================
   BACK TO TOP — shows after scrolling down, glides smoothly to the top
   ========================================================================== */
(function () {
  'use strict';
  const btn = document.getElementById('toTop');
  if (!btn) return;

  const SHOW_AFTER = 400;   // px scrolled before the button appears
  const DURATION = 700;     // ms of the scroll animation
  let animating = false;

  function toggle() {
    btn.classList.toggle('is-visible', window.scrollY > SHOW_AFTER);
  }
  window.addEventListener('scroll', toggle, { passive: true });
  toggle();

  btn.addEventListener('click', function () {
    if (animating) return;
    const start = window.scrollY;
    const t0 = performance.now();
    const root = document.documentElement;
    const oldBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';       // we animate it ourselves
    animating = true;

    function step(now) {
      const p = Math.min((now - t0) / DURATION, 1);
      const eased = 1 - Math.pow(1 - p, 3);   // ease-out
      window.scrollTo(0, Math.round(start * (1 - eased)));
      if (p < 1 && animating) {
        requestAnimationFrame(step);
      } else {
        animating = false;
        root.style.scrollBehavior = oldBehavior;
      }
    }
    requestAnimationFrame(step);
  });

  // if the visitor scrolls by hand during the animation, stop it
  ['wheel', 'touchstart'].forEach(function (ev) {
    window.addEventListener(ev, function () { animating = false; }, { passive: true });
  });
})();