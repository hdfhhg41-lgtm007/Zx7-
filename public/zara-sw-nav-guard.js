/* Zara Production Service Worker Navigation, Cold-Start Wakeup & Offline Shield (v10)
 * 1. Prevents Chromium navigate-mode RequestInit TypeError permanently.
 * 2. Eliminates static asset cache poisoning (strict MIME validation; never caches text/html as .js/.css).
 * 3. Works seamlessly both ONLINE and OFFLINE ("نیٹ آن ہو یا آف، ایپ پراپرلی کام کرے"):
 *    - Instant 0ms cached shell + verified static assets when offline.
 *    - Fresh deployment-matched shell + assets when online, with non-blocking fallback.
 */

const ZARA_SHELL_CACHE = 'zara-app-shell-v12';
const ZARA_STATIC_CACHE = 'zara-static-assets-v12';
const ZARA_SHELL_KEY = '/__zara_verified_shell_v12__';
const LEGACY_PAGE_CACHES = [
  'zara-4d-direct-package-v2',
  'zara-pages-cache-v3',
  'zara-pages-cache-v4',
  'zara-pages-cache-v5',
  'zara-app-shell-v6',
  'zara-app-shell-v7',
  'zara-app-shell-v8',
  'zara-static-assets-v8',
  'zara-app-shell-v9',
  'zara-static-assets-v9',
  'zara-app-shell-v10',
  'zara-static-assets-v10',
  'zara-app-shell-v11',
  'zara-static-assets-v11',
];

function shouldDeleteLegacyCacheKey(key) {
  if (!key) return false;
  if (LEGACY_PAGE_CACHES.includes(key)) return true;
  if (key.startsWith('zara-app-shell-v') && key !== ZARA_SHELL_CACHE) return true;
  if (key.startsWith('zara-static-assets-v') && key !== ZARA_STATIC_CACHE) return true;
  return false;
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter(shouldDeleteLegacyCacheKey)
            .map((k) => caches.delete(k).catch(() => false))
        );
      } catch (_e) {}
    })()
  );
});

self.addEventListener('message', (event) => {
  const data = event && event.data;
  if (!data || typeof data !== 'object') return;
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (data.type === 'ZARA_PURGE_CACHES') {
    event.waitUntil(
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k).catch(() => false))))
        .catch(() => {})
    );
  }
});

function buildAutoWakeupHtml() {
  return `<!doctype html>
<html lang="ur">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#050711" />
  <title>Zara AI — Connecting Automatically...</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: radial-gradient(circle at top, #0f172a 0%, #050711 70%);
      color: #f8fafc;
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      text-align: center;
    }
    .card {
      width: 100%;
      max-width: 360px;
      padding: 28px 22px;
      border-radius: 24px;
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid rgba(56, 189, 248, 0.4);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.65);
    }
    .orb {
      width: 68px;
      height: 68px;
      margin: 0 auto 16px;
      border-radius: 9999px;
      background: rgba(56, 189, 248, 0.16);
      border: 2px solid rgba(56, 189, 248, 0.75);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 17px;
      letter-spacing: 0.06em;
      color: #bae6fd;
      animation: pulse 1.6s ease-in-out infinite;
    }
    h1 {
      font-size: 17px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 8px;
    }
    p {
      font-size: 13px;
      line-height: 1.6;
      color: #cbd5e1;
      margin-bottom: 14px;
    }
    .status {
      font-size: 12px;
      color: #7dd3fc;
      min-height: 20px;
      margin-bottom: 16px;
    }
    button {
      width: 100%;
      min-height: 44px;
      padding: 10px 18px;
      border-radius: 14px;
      border: 1px solid rgba(16, 185, 129, 0.65);
      background: #10b981;
      color: #050711;
      font-size: 13px;
      font-weight: 800;
      cursor: pointer;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.45); }
      50% { transform: scale(1.05); box-shadow: 0 0 24px 4px rgba(56, 189, 248, 0.28); }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="orb">ZARA</div>
    <h1>زارا لائیو اسٹوڈیو خودکار طور پر کنیکٹ ہو رہا ہے...</h1>
    <p>نیٹ آن ہو یا آف، زارا ہمیشہ تیار رہتی ہے — آپ کا ڈیٹا محفوظ ہے۔</p>
    <div id="st" class="status">کنکشن قائم ہو رہا ہے...</div>
    <button type="button" onclick="directOpenNow()">سیدھا اوپن کریں (Open Directly)</button>
  </div>
  <script>
    var busy = false;
    var tries = 0;
    var stEl = document.getElementById('st');

    function navigateBypassSw() {
      try {
        var now = Date.now();
        var lastNav = parseInt(sessionStorage.getItem('zara_wake_nav_ts') || '0', 10);
        if (lastNav && now - lastNav < 3500) {
          if (stEl) stEl.textContent = 'کنکشن تیار ہے — براہِ کرم نیچے بٹن دبائیں';
          busy = false;
          return;
        }
        sessionStorage.setItem('zara_wake_nav_ts', String(now));
        var u = new URL(window.location.href);
        u.searchParams.set('_zdirect', '1');
        u.searchParams.set('_zwake', String(now));
        window.location.replace(u.toString());
      } catch (e) {
        window.location.href = '/?_zdirect=1&_zwake=' + Date.now();
      }
    }

    function directOpenNow() {
      if (stEl) stEl.textContent = 'زارا براہِ راست کھل رہی ہے...';
      var done = false;
      var go = function () {
        if (done) return;
        done = true;
        navigateBypassSw();
      };
      setTimeout(go, 650);
      try {
        if ('serviceWorker' in navigator && navigator.serviceWorker) {
          navigator.serviceWorker
            .getRegistrations()
            .then(function (regs) {
              return Promise.all(
                regs.map(function (r) {
                  return r.unregister().catch(function () {});
                })
              );
            })
            .finally(go);
        } else {
          go();
        }
      } catch (e) {
        go();
      }
    }

    function checkNow() {
      if (navigator.onLine === false) {
        if (stEl) stEl.textContent = 'آف لائن موڈ — نیٹ آتے ہی خودکار لوڈ ہو جائے گا...';
        return;
      }
      if (busy) return;
      busy = true;
      tries++;
      if (stEl) {
        stEl.textContent = 'سرور چیک کیا جا رہا ہے... (' + tries + ')';
      }
      var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var tId = ctrl ? setTimeout(function () { ctrl.abort(); }, 3000) : null;
      fetch('/api/health?_zw=' + Date.now(), {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
        signal: ctrl ? ctrl.signal : undefined
      })
        .then(function (res) {
          if (tId) clearTimeout(tId);
          if (res.redirected) {
            navigateBypassSw();
            return;
          }
          if (res.status === 200) {
            if (res.headers.get('x-zara-app') === 'ready') {
              if (stEl) stEl.textContent = 'کنیکٹ ہو گیا — زارا کھل رہی ہے ✓';
              navigateBypassSw();
              return;
            }
            return res
              .json()
              .then(function (data) {
                if (data && (data.service === 'zara' || data.ok === true)) {
                  if (stEl) stEl.textContent = 'کنیکٹ ہو گیا — زارا کھل رہی ہے ✓';
                  navigateBypassSw();
                  return;
                }
                busy = false;
              })
              .catch(function () {
                busy = false;
              });
          }
          busy = false;
        })
        .catch(function () {
          if (tId) clearTimeout(tId);
          busy = false;
        });
    }

    setInterval(checkNow, 1500);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') checkNow();
    });
    window.addEventListener('online', checkNow);
    checkNow();
  </script>
</body>
</html>`;
}

// CRITICAL: Never pass a non-empty RequestInit to fetch(event.request) when event.request.mode === 'navigate',
// because Chromium throws a TypeError! Use Promise.race for navigate Request objects instead.
function fetchNavigationSafe(navRequest, timeoutMs) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('nav_timeout'));
      }
    }, timeoutMs);

    fetch(navRequest)
      .then((res) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(res);
        }
      })
      .catch((err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(err);
        }
      });
  });
}

async function fetchUrlWithTimeout(urlStr, timeoutMs, init) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(
      urlStr,
      Object.assign({}, init || {}, { signal: controller.signal })
    );
  } finally {
    clearTimeout(timer);
  }
}

function isProductionBuiltHtml(html) {
  if (!html || !html.includes('id="root"')) return false;
  if (html.includes('Please wait while your application starts')) return false;
  // NEVER cache Vite dev-mode HTML containing /src/main.tsx or /@vite/client
  if (html.includes('/src/main.tsx') || html.includes('/@vite/client')) return false;
  return /\/assets\/index-[a-zA-Z0-9_-]+\.js/.test(html);
}

async function isGenuineZaraNavigationResponse(res) {
  if (!res) return false;
  if (res.type === 'opaqueredirect' || res.redirected || (res.status >= 300 && res.status < 400)) {
    return true;
  }
  if (res.status !== 200) return false;

  const ct = (res.headers.get('content-type') || '').toLowerCase();
  if (!ct.includes('text/html')) return false;

  try {
    const html = await res.clone().text();
    if (
      html &&
      html.includes('id="root"') &&
      !html.includes('Please wait while your application starts')
    ) {
      return true;
    }
  } catch (_e) {}
  return false;
}

async function maybeSaveVerifiedShell(response) {
  try {
    const clone = response.clone();
    const html = await clone.text();
    if (isProductionBuiltHtml(html)) {
      const cache = await caches.open(ZARA_SHELL_CACHE);
      const headers = new Headers(response.headers);
      headers.set('Content-Type', 'text/html; charset=utf-8');
      headers.set('X-Zara-Cached-Shell', '1');
      await cache.put(
        ZARA_SHELL_KEY,
        new Response(html, {
          status: 200,
          statusText: 'OK',
          headers,
        })
      );
    }
  } catch (_e) {}
}

async function getCachedShell() {
  try {
    const cache = await caches.open(ZARA_SHELL_CACHE);
    const cached = await cache.match(ZARA_SHELL_KEY);
    if (!cached) return null;
    const html = await cached.clone().text();
    if (!isProductionBuiltHtml(html)) {
      await cache.delete(ZARA_SHELL_KEY).catch(() => {});
      return null;
    }
    const entryMatch = html.match(/\/assets\/index-[a-zA-Z0-9_-]+\.js/);
    if (entryMatch) {
      const staticHit = await caches.match(entryMatch[0], { ignoreSearch: true });
      if (!staticHit) {
        // Cached shell points to a purged/stale bundle; never serve broken shell offline
        return null;
      }
    }
    return cached;
  } catch (_e) {
    return null;
  }
}

async function pollBackendUntilAwake(maxChecks, delayMs) {
  if (self.navigator && self.navigator.onLine === false) {
    return 'offline';
  }
  for (let i = 0; i < maxChecks; i++) {
    try {
      const ping = await fetchUrlWithTimeout('/api/health?_sw_wake=' + Date.now(), 2200, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
      });
      if (
        ping.redirected ||
        ping.type === 'opaqueredirect' ||
        (ping.status >= 300 && ping.status < 400)
      ) {
        return 'auth_redirect';
      }
      if (ping.status === 200) {
        if (ping.headers.get('x-zara-app') === 'ready') {
          return 'ready';
        }
        try {
          const data = await ping.json();
          if (data && (data.service === 'zara' || data.ok === true)) {
            return 'ready';
          }
        } catch (_e) {}
      }
    } catch (_e) {}
    if (i + 1 < maxChecks) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return 'warming';
}

// Only cache production built static assets (/assets/* and root icons/fonts), NEVER Vite dev modules (/src/*, /node_modules/*, /@*)
function isCacheableProductionAsset(url, req) {
  if (url.origin !== self.location.origin || req.method !== 'GET') return false;
  const p = url.pathname;
  if (
    p.startsWith('/api/') ||
    p.startsWith('/src/') ||
    p.startsWith('/node_modules/') ||
    p.startsWith('/@') ||
    p.startsWith('/__') ||
    p.startsWith('/_aistudio') ||
    p === '/sw.js' ||
    p === '/dev-sw.js' ||
    p === '/registerSW.js' ||
    p === '/zara-sw-nav-guard.js' ||
    p.startsWith('/workbox-') ||
    url.searchParams.has('dev-sw')
  ) {
    return false;
  }
  return (
    p.startsWith('/assets/') ||
    /\.(png|jpg|jpeg|webp|svg|ico|woff|woff2)$/i.test(p)
  );
}

// Prevent MIME poisoning: NEVER treat text/html warmup pages as valid JS/CSS/image responses!
function isValidStaticAssetResponse(url, res) {
  if (!res || res.status !== 200) return false;
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  if (ct.includes('text/html')) return false;
  const p = url.pathname.toLowerCase();
  if (p.endsWith('.js') || p.endsWith('.mjs')) {
    return ct.includes('javascript') || ct.includes('ecmascript');
  }
  if (p.endsWith('.css')) {
    return ct.includes('text/css');
  }
  return true;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch (_e) {
    return;
  }

  // 1. Offline-resilient + MIME-verified runtime shield for production static bundles & portraits
  if (req.mode !== 'navigate' && isCacheableProductionAsset(url, req)) {
    event.respondWith(
      (async () => {
        const staticCache = await caches.open(ZARA_STATIC_CACHE);
        const cachedStatic = await staticCache.match(req);

        // Instant zero-wait offline asset return
        if (self.navigator && self.navigator.onLine === false) {
          if (cachedStatic && isValidStaticAssetResponse(url, cachedStatic)) {
            return cachedStatic;
          }
          const anyPrecached = await caches.match(req, { ignoreSearch: true });
          if (anyPrecached && isValidStaticAssetResponse(url, anyPrecached)) {
            return anyPrecached;
          }
        }

        // Hashed immutable /assets/* bundles: if already verified in cache, serve immediately!
        if (
          url.pathname.startsWith('/assets/') &&
          cachedStatic &&
          isValidStaticAssetResponse(url, cachedStatic)
        ) {
          return cachedStatic;
        }

        try {
          const freshRes = await fetch(req);
          if (isValidStaticAssetResponse(url, freshRes)) {
            event.waitUntil(staticCache.put(req, freshRes.clone()).catch(() => {}));
            return freshRes;
          }
          // Network returned 404 (stale deployment hash) or HTML warmup page — try verified cached copy first!
          if (cachedStatic && isValidStaticAssetResponse(url, cachedStatic)) {
            return cachedStatic;
          }
          const precached = await caches.match(req, { ignoreSearch: true });
          if (precached && isValidStaticAssetResponse(url, precached)) {
            return precached;
          }
          return freshRes;
        } catch (_err) {
          if (cachedStatic && isValidStaticAssetResponse(url, cachedStatic)) {
            return cachedStatic;
          }
          const precached = await caches.match(req, { ignoreSearch: true });
          if (precached && isValidStaticAssetResponse(url, precached)) {
            return precached;
          }
          throw _err;
        }
      })()
    );
    return;
  }

  if (req.mode !== 'navigate') return;

  // Never intercept AI Studio internal auth callbacks, build routes, or API paths
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/__') ||
    url.pathname.startsWith('/_aistudio') ||
    url.pathname.startsWith('/api/') ||
    url.searchParams.has('__aistudio_auth_token') ||
    url.searchParams.has('__session_index') ||
    url.searchParams.has('__storage_access_granted')
  ) {
    return;
  }

  event.respondWith(
    (async () => {
      const cachedShell = await getCachedShell();

      // Instant Offline Boot: if device internet is OFF, return cached shell immediately with zero timeout delay!
      if (self.navigator && self.navigator.onLine === false && cachedShell) {
        return cachedShell;
      }

      // If we already have a verified app shell cached, wait at most 1600ms for fresh HTML;
      // if network returns proxy warmup HTML ("Please wait while your application starts") or is slow,
      // serve cachedShell right away and wake backend silently in background!
      const liveWaitMs = cachedShell ? 1600 : 5200;
      try {
        const netRes = await fetchNavigationSafe(req, liveWaitMs);
        if (await isGenuineZaraNavigationResponse(netRes)) {
          if (netRes.status === 200) {
            event.waitUntil(maybeSaveVerifiedShell(netRes));
          }
          return netRes;
        }
      } catch (_netErr) {
        // Network timeout or cold-start warmup — fall back cleanly
      }

      if (cachedShell) {
        event.waitUntil(pollBackendUntilAwake(3, 1000).catch(() => {}));
        return cachedShell;
      }

      // Very first visit with no cached shell yet: poll briefly until backend responds
      if (!self.navigator || self.navigator.onLine !== false) {
        const wakeState = await pollBackendUntilAwake(3, 900);
        if (wakeState === 'ready' || wakeState === 'auth_redirect') {
          try {
            const retryRes = await fetchNavigationSafe(req, 5000);
            if (await isGenuineZaraNavigationResponse(retryRes)) {
              if (retryRes.status === 200) {
                event.waitUntil(maybeSaveVerifiedShell(retryRes));
              }
              return retryRes;
            }
          } catch (_e) {}
        }
      }

      return new Response(buildAutoWakeupHtml(), {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        },
      });
    })()
  );
});
