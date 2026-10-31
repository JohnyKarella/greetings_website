/* ==========================================================================
   Sbl — paid.js  ·  paid logo change  (linked to the backend)
   Every template keeps the site logo for free.  Removing that logo, or putting
   the visitor's own logo on the poster, costs a small fee per logo change.
   Everything else in Poster Studio stays free.

   ▸ PRICE, UPI ID, RAZORPAY KEYS AND WHATSAPP ARE NOW SET IN  backend/config.py
     (the browser reads them from the server, so nothing to change here).
   ▸ Every payment is checked and saved by the server in MongoDB (collection "payments"),
     so a reference number can be used only once — on every phone and computer.

   Used by js/editor.js:
     LogoPay.request({ action: 'change' | 'remove' | 'replace', poster: 'Name', preview: url })
       → Promise that gives true when the visitor has paid, false when cancelled.
   Needs js/api.js (loaded before this file).
   ========================================================================== */
(function () {
  'use strict';

  /* Defaults until the server answers (the real values come from backend/config.py). */
  const SETTINGS = { price: 15, brand: 'Sbl', upiId: '', razorpayKey: '', whatsapp: '', mode: 'loading', test: false };

  const API = window.SblApi;
  const ROOT = document.body.dataset.root || '';
  const label = () => '₹' + SETTINGS.price;
  let PRICE = label();
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m, ms) => window.Sbl && window.Sbl.showToast(m, ms);
  let TEST = false, UPI_ID = '';
  let offlineMsg = '';
  /* 'upi' | 'razorpay' | 'none' (payments off) | 'offline' (server not running) | 'loading' */
  const mode = () => SETTINGS.mode;

  function applyConfig(c) {
    Object.assign(SETTINGS, {
      price: c.price, brand: c.brand, upiId: c.upiId || '', razorpayKey: c.razorpayKey || '',
      whatsapp: c.whatsapp || '', test: !!c.test,
      mode: c.mode === 'razorpay' ? 'razorpay' : (c.upiId ? 'upi' : 'none')
    });
    PRICE = label(); TEST = SETTINGS.test; UPI_ID = SETTINGS.upiId;
    Object.assign(window.LogoPay, { price: SETTINGS.price, priceLabel: PRICE, brand: SETTINGS.brand, test: TEST });
  }
  /** Load the payment settings from the server (retried every time the window opens until it works). */
  function loadConfig() {
    if (!API) { SETTINGS.mode = 'offline'; offlineMsg = 'js/api.js is missing on this page.'; return Promise.resolve(); }
    return API.config().then(applyConfig, (e) => { SETTINGS.mode = 'offline'; offlineMsg = e.message; });
  }

  const PHONE = window.matchMedia('(pointer: coarse)').matches;
  const IOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  /* The UPI payment methods shown in the window.
     `scheme` opens that app directly on a phone; '' = the phone asks which UPI app to use. */
  const METHODS = [
    { id: 'gpay', name: 'Google Pay', short: 'G', color: '#4285f4', scheme: IOS ? 'gpay://upi/pay' : 'tez://upi/pay' },
    { id: 'phonepe', name: 'PhonePe', short: 'Pe', color: '#5f259f', scheme: 'phonepe://pay' },
    { id: 'paytm', name: 'Paytm', short: 'P', color: '#00baf2', scheme: 'paytmmp://pay' },
    { id: 'bhim', name: 'BHIM', short: 'B', color: '#e8651a', scheme: '' },
    { id: 'other', name: 'Other UPI app', short: 'UPI', color: '#2a9d8f', scheme: '' },
    { id: 'qr', name: 'Scan QR code', short: 'QR', color: '#1f1a2e', scheme: null }
  ];

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Could not load ' + src));
      document.head.appendChild(s);
    });
  }

  /* ------------------------------------------------------------------
     UPI
     ------------------------------------------------------------------ */
  function upiLink(note, scheme) {
    const q = [
      ['pa', UPI_ID],
      ['pn', SETTINGS.brand],
      ['am', Number(SETTINGS.price).toFixed(2)],
      ['cu', 'INR'],
      ['tn', note]
    ].map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');
    return (scheme || 'upi://pay') + '?' + q;
  }

  async function drawQR(holder, text) {
    try {
      if (!window.qrcode) await loadScript(ROOT + 'js/qrcode.js');
      const qr = window.qrcode(0, 'M');
      qr.addData(text);
      qr.make();
      const n = qr.getModuleCount(), quiet = 3, size = n + quiet * 2;
      let d = '';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + quiet} ${r + quiet}h1v1h-1z`;
      holder.innerHTML = `<svg viewBox="0 0 ${size} ${size}" role="img" aria-label="UPI payment QR code for ${PRICE}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><path d="${d}" fill="#1f1a2e"/></svg>`;
    } catch (e) {
      holder.innerHTML = `<p class="lp__qr-fail">Pay to UPI ID<br><strong>${esc(UPI_ID)}</strong></p>`;
    }
  }

  /* ------------------------------------------------------------------
     THE PAYMENT WINDOW
     ------------------------------------------------------------------ */
  let box = null, done = null, lastFocus = null;

  function contactHTML() {
    const tel = document.querySelector('.footer-contact a[href^="tel:"]');
    const bits = [];
    if (SETTINGS.whatsapp) bits.push(`<a href="https://wa.me/${esc(SETTINGS.whatsapp)}?text=${encodeURIComponent('Hi, I need help with a logo change payment on ' + SETTINGS.brand)}" target="_blank" rel="noopener">WhatsApp us</a>`);
    if (tel) bits.push(`<a href="${esc(tel.getAttribute('href'))}">Call ${esc(tel.textContent.trim())}</a>`);
    return bits.join(' · ');
  }

  function bodyHTML() {
    const help = contactHTML();
    const helpLine = help ? `<p class="lp__help">Problem paying? ${help}</p>` : '';
    if (mode() === 'razorpay') {
      return `
        <button class="btn lp__pay" type="button" data-lp-razorpay>Pay ${PRICE} securely</button>
        <p class="lp__small">UPI, cards, net banking and wallets. The logo changes as soon as the payment is done.</p>
        ${helpLine}`;
    }
    if (mode() === 'upi') {
      return `
        ${TEST ? '<p class="lp__test"><strong>Test mode</strong> — no money is collected. Type any 12-digit number (e.g. 412345678901). Add your UPI ID in <code>backend/config.py</code> before the site goes live.</p>' : ''}
        <p class="lp__step-title" id="lpPick">Choose a UPI payment method</p>
        <div class="lp__methods" role="radiogroup" aria-labelledby="lpPick">
          ${METHODS.map((m) => `
            <button type="button" class="lp__method" role="radio" aria-checked="false" data-lp-method="${m.id}">
              <span class="lp__method-icon" style="--c:${m.color}" aria-hidden="true">${m.short}</span>
              <span class="lp__method-name">${m.name}</span>
            </button>`).join('')}
        </div>
        <div class="lp__pane" data-lp-pane hidden>
          <ol class="lp__steps">
            <li>
              <span class="lp__step-title" data-lp-paytitle></span>
              <div class="lp__upi">
                <div class="lp__qr" data-lp-qr></div>
                <div class="lp__upi-side">
                  <p data-lp-how></p>
                  <a class="btn btn--sm lp__app" data-lp-app href="#"></a>
                  <button class="lp__copy" type="button" data-lp-copy title="Copy UPI ID"><span>${esc(UPI_ID)}</span><small>Copy</small></button>
                </div>
              </div>
            </li>
            <li>
              <label class="lp__step-title" for="lpRef">Type the 12-digit UPI reference number</label>
              <p class="lp__small">You will find it in your UPI app under the payment details (UTR / UPI Ref. No.).</p>
              <div class="lp__ref">
                <input id="lpRef" type="text" inputmode="numeric" autocomplete="off" maxlength="14" placeholder="e.g. 412345678901" data-lp-ref>
                <button class="btn btn--sm" type="button" data-lp-confirm>Unlock logo</button>
              </div>
              <p class="lp__error" data-lp-error role="alert"></p>
            </li>
          </ol>
        </div>
        ${helpLine}`;
    }
    if (mode() === 'loading') return '<p class="lp__small">Connecting to the payment server …</p>';
    if (mode() === 'offline') {
      return `
      <p class="lp__notready">The payment server is not reachable right now, so the logo cannot be changed yet.</p>
      <p class="lp__small">${esc(offlineMsg)}</p>
      <button class="btn btn--sm lp__pay" type="button" data-lp-retry>Try again</button>
      ${help ? `<p class="lp__help">${help}</p>` : ''}`;
    }
    return `
      <p class="lp__notready">Online payment is not switched on yet. Please contact us to change the logo.</p>
      ${help ? `<p class="lp__help">${help}</p>` : ''}`;
  }

  function build() {
    box = document.createElement('div');
    box.className = 'lp';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-labelledby', 'lpTitle');
    document.body.appendChild(box);

    box.addEventListener('click', (e) => {
      if (e.target.closest('[data-lp-close]')) { finish(false); return; }
      if (e.target.closest('[data-lp-confirm]')) { confirmUPI(); return; }
      const method = e.target.closest('[data-lp-method]');
      if (method) { pick(method.dataset.lpMethod); return; }
      if (e.target.closest('[data-lp-razorpay]')) { payRazorpay(); return; }
      if (e.target.closest('[data-lp-retry]')) { const info = current; SETTINGS.mode = 'loading'; open(info); loadConfig().then(() => { if (current === info) open(info); }); return; }
      const copy = e.target.closest('[data-lp-copy]');
      if (copy) {
        const say = () => { copy.querySelector('small').textContent = 'Copied ✓'; };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(UPI_ID).then(say, () => {});
      }
    });
    box.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') { finish(false); return; }
      if (e.key === 'Enter' && e.target.matches('[data-lp-ref]')) { e.preventDefault(); confirmUPI(); return; }
      if (e.key === 'Tab') {
        const f = Array.from(box.querySelectorAll('button, input, a[href]')).filter((n) => n.getClientRects().length);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  let current = null, pickedApp = '';
  function open(info) {
    if (!box) build();
    current = info;
    pickedApp = '';
    const replace = info.action === 'replace';
    const title = replace ? 'Use your own logo' : info.action === 'remove' ? `Remove the ${esc(SETTINGS.brand)} logo` : 'Change the logo';
    const what = replace ? 'Your logo will replace ours on' : info.action === 'remove' ? 'The logo will be taken off' : 'Remove the logo or use your own on';
    box.innerHTML = `
      <div class="lp__backdrop" data-lp-close></div>
      <div class="lp__card">
        <button class="lp__x" type="button" data-lp-close aria-label="Close">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
        <div class="lp__head">
          ${replace && info.preview ? `<span class="lp__thumb"><img src="${esc(info.preview)}" alt="Your logo"></span>` : ''}
          <div>
            <span class="lp__price">${PRICE} · one logo change</span>
            <h2 id="lpTitle">${title}</h2>
            <p>${what} <strong>${esc(info.poster || 'this poster')}</strong>. Everything else stays free.</p>
          </div>
        </div>
        ${bodyHTML()}
        <button class="lp__cancel" type="button" data-lp-close>Keep the ${esc(SETTINGS.brand)} logo (free)</button>
      </div>`;
    lastFocus = document.activeElement;
    box.classList.add('is-open');
    const first = box.querySelector('[data-lp-razorpay], [data-lp-method], [data-lp-close]');
    setTimeout(() => first && first.focus({ preventScroll: true }), 60);
  }

  /** A UPI method was chosen: show how to pay with it. */
  function pick(id) {
    const m = METHODS.find((x) => x.id === id);
    if (!m || !box) return;
    pickedApp = id;
    box.querySelectorAll('[data-lp-method]').forEach((b) => {
      const on = b.dataset.lpMethod === id;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-checked', String(on));
    });
    const note = 'Logo change - ' + ((current && current.poster) || 'poster');
    const isQR = m.scheme === null, app = isQR ? 'any UPI app' : m.id === 'other' ? 'your UPI app' : m.name;
    const pane = box.querySelector('[data-lp-pane]');
    pane.hidden = false;
    box.querySelector('[data-lp-paytitle]').textContent = `Pay ${PRICE} with ${app}`;
    box.querySelector('[data-lp-how]').textContent = isQR || !PHONE
      ? `Open ${app} on your phone and scan this QR code.`
      : `Tap the button to open ${app}, or scan the QR code from another phone.`;
    const link = box.querySelector('[data-lp-app]');
    link.hidden = isQR;
    link.href = upiLink(note, m.scheme || '');
    link.textContent = `Open ${m.id === 'other' ? 'UPI app' : m.name} · ${PRICE}`;
    drawQR(box.querySelector('[data-lp-qr]'), upiLink(note));
    pane.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function finish(paid) {
    if (!box) return;
    box.classList.remove('is-open');
    box.innerHTML = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    const d = done; done = null; current = null;
    if (d) d(!!paid);
  }

  let sending = false;
  async function confirmUPI() {
    if (sending) return;
    const input = box.querySelector('[data-lp-ref]'), err = box.querySelector('[data-lp-error]');
    const btn = box.querySelector('[data-lp-confirm]');
    const ref = input.value.replace(/\D/g, '');
    const fail = (m) => { err.textContent = m; input.focus(); };
    if (ref.length !== 12) return fail('Please type the 12-digit reference number from your UPI app.');
    if (/^(\d)\1+$/.test(ref) || ref === '123456789012') return fail('That does not look like a real reference number. Please check it in your UPI app.');
    err.textContent = '';
    sending = true;
    btn.classList.add('is-busy'); btn.disabled = true;
    try {
      const info = current || {};
      const res = await API.post('/api/payments/upi', { reference: ref, app: pickedApp, poster: info.poster, action: info.action });
      toast(res.test ? 'Test mode — logo unlocked ✓' : 'Payment noted — logo unlocked ✓');
      finish(true);
    } catch (e) {
      if (box && box.contains(btn)) { btn.classList.remove('is-busy'); btn.disabled = false; }
      fail(e.message);
    } finally {
      sending = false;
    }
  }

  async function payRazorpay() {
    const btn = box.querySelector('[data-lp-razorpay]');
    const idle = () => { if (box) { const b = box.querySelector('[data-lp-razorpay]'); if (b) b.classList.remove('is-busy'); } };
    btn.classList.add('is-busy');
    const info = current || {};
    let order;
    try {
      if (!window.Razorpay) await loadScript('https://checkout.razorpay.com/v1/checkout.js');
      order = await API.post('/api/payments/razorpay/order', { poster: info.poster, action: info.action });
    } catch (e) {
      idle();
      toast(e.message && !/Could not load/.test(e.message) ? e.message : 'Could not open the payment page. Please check your internet connection.', 5000);
      return;
    }
    const rzp = new window.Razorpay({
      key: order.key,
      order_id: order.orderId,
      amount: order.amount,                      // in paise, decided by the server
      currency: order.currency || 'INR',
      name: SETTINGS.brand,
      description: 'Logo change — ' + (info.poster || 'poster'),
      theme: { color: '#7c5ce6' },
      handler: async (res) => {
        try {
          await API.post('/api/payments/razorpay/verify', Object.assign({ poster: info.poster, action: info.action }, res));
          toast('Payment received — logo unlocked ✓');
          finish(true);
        } catch (e) {
          idle();
          toast('Payment could not be confirmed: ' + e.message, 6000);
        }
      },
      modal: { ondismiss: idle }
    });
    rzp.on('payment.failed', () => toast('Payment did not go through. Please try again.'));
    rzp.open();
  }

  function request(info) {
    if (done) finish(false);
    info = info || {};
    return new Promise((resolve) => {
      done = resolve;
      if (mode() === 'loading' || mode() === 'offline') {
        SETTINGS.mode = 'loading';
        open(info);                                        // shows "Connecting …"
        loadConfig().then(() => { if (current === info) open(info); });
      } else {
        open(info);
      }
    });
  }

  window.LogoPay = {
    request, price: SETTINGS.price, priceLabel: PRICE, brand: SETTINGS.brand, test: false,
    ready: () => mode() === 'upi' || mode() === 'razorpay'
  };
  loadConfig();
})();
