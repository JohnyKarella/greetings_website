/* ==========================================================================
   Sbl — api.js  ·  the link between this website and the backend (backend/app.py)

   ▸ Normally there is NOTHING to change here.
     When the site is opened from the backend (http://localhost:8000) the API
     is on the same address.  When it is opened any other way (VS Code Live
     Server, double-click on index.html …) it talks to BACKEND_URL below.

   ▸ When you put the site online on a different address from the backend,
     set BACKEND_URL to the backend's address, e.g. 'https://api.yoursite.com'.

   Used by:  js/paid.js (payments) · js/script.js (newsletter) · js/poster.js (download count)
   ========================================================================== */
(function () {
  'use strict';

  const BACKEND_URL = 'http://localhost:8000';    // ← backend address (see note above)

  const backendPort = new URL(BACKEND_URL).port || '';
  // Same server as the backend?  (http://localhost:8000, http://192.168.x.x:8000 from a phone,
  // or an online address with no port, where the backend serves the site itself.)
  const sameServer = location.protocol !== 'file:' && (location.port === backendPort || location.port === '');
  const BASE = sameServer ? '' : BACKEND_URL.replace(/\/$/, '');

  /** page name saved with each record, e.g. "events/birthday.html" */
  const PAGE = (location.pathname.split('/').slice(-2).join('/').replace(/^\//, '') || 'index.html').slice(0, 150);

  async function call(method, path, data, timeout) {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl && setTimeout(() => ctrl.abort(), timeout || 12000);
    let res;
    try {
      res = await fetch(BASE + path, {
        method,
        headers: data ? { 'Content-Type': 'application/json' } : {},
        body: data ? JSON.stringify(data) : undefined,
        signal: ctrl ? ctrl.signal : undefined
      });
    } catch (e) {
      const err = new Error('The server is not running. Start backend/app.py and open ' + BACKEND_URL);
      err.offline = true;
      throw err;
    } finally {
      if (timer) clearTimeout(timer);
    }
    let json = {};
    try { json = await res.json(); } catch (e) { /* not JSON */ }
    if (!res.ok || json.ok === false) {
      const err = new Error(json.error || ('Server error ' + res.status));
      err.status = res.status;
      throw err;
    }
    return json;
  }

  let configPromise = null;
  window.SblApi = {
    base: BASE || location.origin,
    backendUrl: BACKEND_URL,
    page: PAGE,
    get: (path) => call('GET', path),
    post: (path, data) => call('POST', path, Object.assign({ page: PAGE }, data || {})),
    /** Payment settings from backend/config.py (cached; retried after a failure). */
    config() {
      if (!configPromise) configPromise = call('GET', '/api/config', null, 6000).catch((e) => { configPromise = null; throw e; });
      return configPromise;
    },
    /** Fire-and-forget (statistics) — never bothers the visitor. */
    track(path, data) { call('POST', path, Object.assign({ page: PAGE }, data || {}), 5000).catch(() => {}); }
  };
})();

/* Opened by double-click (file://)?  Show a small reminder to use the server address. */
(function () {
  if (location.protocol !== 'file:') return;
  const show = () => {
    const url = window.SblApi.backendUrl;
    const bar = document.createElement('div');
    bar.setAttribute('role', 'note');
    bar.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;padding:12px 16px;border-radius:14px;' +
      'background:#1f1a2e;color:#fff;font:500 14px/1.45 "Plus Jakarta Sans",system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.25);' +
      'display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap';
    bar.innerHTML = '<span>For payments, newsletter and downloads, run <b>backend/app.py</b> and open the site at ' +
      '<a href="' + url + '" style="color:#ffd24d">' + url + '</a></span>' +
      '<button type="button" style="background:#fff;color:#1f1a2e;border:0;border-radius:999px;padding:6px 14px;font:inherit;cursor:pointer">OK</button>';
    bar.querySelector('button').onclick = () => bar.remove();
    document.body.appendChild(bar);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show); else show();
})();
