import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

import { resolveTabId, resolveGiscusTheme, getScoreBand } from '../src/js/app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function readRepoFile(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function repoFileExists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

test('PWA manifests are valid JSON, reference existing icons, and use canonical URLs', () => {
  const expectations = [
    {
      file: 'manifest/vit.json',
      startUrl: '/?utm_source=launch&utm_medium=pwa',
      shortcutPrefix: '/?',
      requireTrustCopy: true,
    },
    {
      file: 'manifest/anna.json',
      startUrl: '/college/anna-university.html?utm_source=launch&utm_medium=pwa',
      shortcutPrefix: '/college/anna-university.html?',
      requireTrustCopy: true,
    },
    {
      file: 'manifest/ktu.json',
      startUrl: '/college/ktu.html?utm_source=launch&utm_medium=pwa',
      shortcutPrefix: '/college/ktu.html?',
      requireTrustCopy: true,
    },
    {
      file: 'manifest/srm.json',
      startUrl: '/college/srm.html?utm_source=launch&utm_medium=pwa',
      shortcutPrefix: '/college/srm.html?',
      requireTrustCopy: true,
    },
  ];

  for (const spec of expectations) {
    const raw = readRepoFile(spec.file);
    const manifest = JSON.parse(raw);

    assert.equal(manifest.start_url, spec.startUrl, `${spec.file} start_url mismatch`);
    assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0, `${spec.file} needs icons`);
    assert.ok(Array.isArray(manifest.shortcuts) && manifest.shortcuts.length >= 2, `${spec.file} needs shortcuts`);

    if (spec.requireTrustCopy) {
      assert.match(manifest.description, /1M\+/);
      assert.match(manifest.description, /2017/);
      assert.match(manifest.description, /9\+/);
    }

    assert.equal(
      manifest.shortcuts[0].url,
      `${spec.shortcutPrefix}tab=sc&utm_source=homescreen`,
      `${spec.file} GPA shortcut URL`
    );
    assert.equal(
      manifest.shortcuts[1].url,
      `${spec.shortcutPrefix}tab=gc&utm_source=homescreen`,
      `${spec.file} Quick CGPA shortcut URL`
    );

    for (const icon of manifest.icons) {
      const diskPath = icon.src.replace(/^\//, '');
      assert.equal(repoFileExists(diskPath), true, `Missing icon referenced in ${spec.file}: ${icon.src}`);
    }

    for (const shortcut of manifest.shortcuts) {
      assert.doesNotMatch(shortcut.url, /tab=(qcc|ascc)/);
      for (const icon of shortcut.icons || []) {
        const diskPath = icon.src.replace(/^\//, '');
        assert.equal(
          repoFileExists(diskPath),
          true,
          `Missing shortcut icon referenced in ${spec.file}: ${icon.src}`
        );
      }
    }
  }
});

test('serviceWorker.js uses cgpa-calculator-v12, precaches 21 existing assets including icon-96x96.png, pico.min.css, ads-manager.js, and promos.js, and uses SWR + network-first', () => {
  assert.equal(repoFileExists('src/css/vendor/pico.min.css'), true, 'Missing src/css/vendor/pico.min.css on disk');
  assert.equal(repoFileExists('src/js/ads-manager.js'), true, 'Missing src/js/ads-manager.js on disk');
  assert.equal(repoFileExists('src/js/promos.js'), true, 'Missing src/js/promos.js on disk');
  assert.equal(repoFileExists('src/images/icons/icon-96x96.png'), true, 'Missing src/images/icons/icon-96x96.png on disk');

  const swSource = readRepoFile('serviceWorker.js');
  assert.match(swSource, /const CACHE_NAME = 'cgpa-calculator-v12'/);
  assert.match(swSource, /caches\.delete/);
  assert.match(swSource, /event\.request\.method !== 'GET'/);
  assert.match(swSource, /requestUrl\.pathname\.startsWith\('\/src\/'\)/);
  assert.match(swSource, /requestUrl\.pathname\.startsWith\('\/manifest\/'\)/);
  assert.match(swSource, /ignoreSearch:\s*true/);

  const arrayMatch = swSource.match(/const PRECACHE_URLS = \[([\s\S]*?)\];/);
  assert.ok(arrayMatch, 'PRECACHE_URLS array must exist in serviceWorker.js');

  const urls = Array.from(arrayMatch[1].matchAll(/'([^']+)'/g), (m) => m[1]);
  assert.equal(urls.length, 21);
  assert.equal(urls.includes('/src/css/vendor/pico.min.css'), true);
  assert.equal(urls.includes('/src/js/ads-manager.js'), true);
  assert.equal(urls.includes('/src/js/promos.js'), true);
  assert.equal(urls.includes('/src/images/icons/icon-96x96.png'), true);

  for (const urlPath of urls) {
    const diskRel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\//, '');
    assert.equal(repoFileExists(diskRel), true, `serviceWorker precache path missing on disk: ${urlPath}`);
  }
});

test('serviceWorker.js routes static assets stale-while-revalidate and documents network-first with ignoreSearch fallback', async () => {
  const swSource = readRepoFile('serviceWorker.js');
  const listeners = new Map();
  const cacheStore = new Map([
    ['https://cgpa-calculator.rajchandra.me/src/css/app.css', { ok: true, type: 'basic', tag: 'cached-css' }],
    ['https://cgpa-calculator.rajchandra.me/', { ok: true, type: 'basic', tag: 'cached-home' }],
  ]);
  const waitUntilPromises = [];
  const putCalls = [];

  const mockCache = {
    async match(req) {
      const key = typeof req === 'string' ? req : req.url;
      return cacheStore.get(key) || undefined;
    },
    async put(req, res) {
      const key = typeof req === 'string' ? req : req.url;
      putCalls.push(key);
      cacheStore.set(key, res);
    },
    async addAll() {},
  };

  const mockCaches = {
    async open() {
      return mockCache;
    },
    async match(req, opts = {}) {
      const rawUrl = typeof req === 'string' ? req : req.url;
      if (cacheStore.has(rawUrl)) return cacheStore.get(rawUrl);
      if (opts.ignoreSearch) {
        const stripped = rawUrl.split('?')[0];
        return cacheStore.get(stripped);
      }
      return undefined;
    },
    async keys() {
      return ['cgpa-calculator-v2', 'cgpa-calculator-v3'];
    },
    async delete() {
      return true;
    },
  };

  let fetchBehavior = async (req) => ({
    ok: true,
    type: 'basic',
    tag: `network:${req.url}`,
    clone() {
      return { ok: true, type: 'basic', tag: `cloned:${req.url}` };
    },
  });

  const selfObj = {
    location: { origin: 'https://cgpa-calculator.rajchandra.me' },
    addEventListener(type, fn) {
      listeners.set(type, fn);
    },
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  };

  vm.runInNewContext(swSource, {
    self: selfObj,
    caches: mockCaches,
    fetch: (req) => fetchBehavior(req),
    URL,
    Promise,
  });

  const onFetch = listeners.get('fetch');
  assert.equal(typeof onFetch, 'function');

  // Non-GET and cross-origin requests are ignored
  let responded = false;
  onFetch({
    request: { method: 'POST', url: 'https://cgpa-calculator.rajchandra.me/' },
    respondWith() {
      responded = true;
    },
  });
  assert.equal(responded, false);

  onFetch({
    request: { method: 'GET', url: 'https://giscus.app/client.js' },
    respondWith() {
      responded = true;
    },
  });
  assert.equal(responded, false);

  // Static /src/* asset returns cached immediately (SWR) and updates cache in background
  let swrPromise;
  onFetch({
    request: { method: 'GET', url: 'https://cgpa-calculator.rajchandra.me/src/css/app.css' },
    waitUntil(p) {
      waitUntilPromises.push(p);
    },
    respondWith(p) {
      swrPromise = p;
    },
  });
  const swrRes = await swrPromise;
  assert.equal(swrRes.tag, 'cached-css');
  await Promise.all(waitUntilPromises);
  assert.equal(putCalls.includes('https://cgpa-calculator.rajchandra.me/src/css/app.css'), true);

  // HTML document offline fallback uses ignoreSearch: true
  fetchBehavior = async () => {
    throw new Error('offline');
  };
  let docPromise;
  onFetch({
    request: { method: 'GET', url: 'https://cgpa-calculator.rajchandra.me/?tab=gc' },
    waitUntil() {},
    respondWith(p) {
      docPromise = p;
    },
  });
  const docRes = await docPromise;
  assert.equal(docRes.tag, 'cached-home');
});

test('obsolete JS files are deleted and active JS/HTML files meet security and hygiene rules', () => {
  const obsoleteFiles = [
    'src/js/ads.js',
    'src/js/calculator.js',
    'src/js/ui.js',
    'src/js/installPWA.js',
    'src/js/mixpanel.js',
    'src/js/requests.js',
    'src/js/jsfile.js',
    'src/js/jquery.min.js',
  ];
  for (const file of obsoleteFiles) {
    assert.equal(repoFileExists(file), false, `Obsolete JS file still exists: ${file}`);
  }

  const allJsFiles = [
    'src/js/universities.js',
    'src/js/math.js',
    'src/js/analytics.js',
    'src/js/promos.js',
    'src/js/app.js',
    'src/js/ads-manager.js',
  ];
  const nonAdJsFiles = [
    'src/js/universities.js',
    'src/js/math.js',
    'src/js/analytics.js',
    'src/js/promos.js',
    'src/js/app.js',
  ];

  const forbiddenSinkPattern =
    /innerHTML|outerHTML|document\.write|insertAdjacentHTML|\beval\(|alert\(|confirm\(|prompt\(/;
  const forbiddenTrackerPattern =
    /enable_page_level_ads|AW-16729760450|smartlook|UA-99147431|fb-comments|connect\.facebook|files\.rajchandra\.me|data-full-width-responsive="false"/;
  const forbiddenDirectAdSensePattern = /adsbygoogle|pagead2/;
  const forbiddenAdGuiltPattern =
    /watch this ad|support us by|click the ad|click on ad|disable your ad ?blocker|turn off adblock/i;

  for (const file of allJsFiles) {
    assert.equal(repoFileExists(file), true, `Missing active JS file: ${file}`);
    const content = readRepoFile(file);
    assert.equal(
      forbiddenSinkPattern.test(content),
      false,
      `Forbidden DOM/dialog pattern detected in ${file}`
    );
    assert.equal(
      forbiddenTrackerPattern.test(content),
      false,
      `Forbidden legacy tracker/ad config detected in ${file}`
    );
    assert.equal(
      forbiddenAdGuiltPattern.test(content),
      false,
      `AdSense policy guilt phrasing detected in ${file}`
    );
  }

  for (const file of nonAdJsFiles) {
    const content = readRepoFile(file);
    assert.equal(
      forbiddenDirectAdSensePattern.test(content),
      false,
      `Direct AdSense logic belongs only in ads-manager.js, not ${file}`
    );
  }

  const appSource = readRepoFile('src/js/app.js');
  assert.match(appSource, /trackEvent\('App Installed'/);
  assert.match(appSource, /import\('\.\/ads-manager\.js'\)/);
  assert.match(appSource, /from '\.\/promos\.js'/);
  assert.doesNotMatch(appSource, /scheduleAdsManager/);
  assert.match(appSource, /contribute_clicked/);
  assert.match(appSource, /ad_optin_enabled/);
  assert.match(appSource, /ad_optin_disabled/);
  assert.match(appSource, /promo_shown/);
  assert.match(appSource, /promo_clicked/);
  assert.match(appSource, /promo_dismissed/);
  assert.match(appSource, /calculation_completed/);
  assert.match(appSource, /calculator_reset/);
  assert.match(appSource, /row_added/);
  assert.match(appSource, /row_removed/);
  assert.match(appSource, /faq_opened/);
  assert.match(appSource, /discussions_clicked/);
  assert.match(appSource, /setUserProperties/);

  const htmlFiles = [
    'index.html',
    'college/anna-university.html',
    'college/ktu.html',
    'college/srm.html',
    'sitemap.html',
  ];
  for (const file of htmlFiles) {
    const content = readRepoFile(file);
    assert.equal(
      forbiddenTrackerPattern.test(content),
      false,
      `Forbidden legacy tracker/ad pattern detected in ${file}`
    );
    assert.equal(
      forbiddenDirectAdSensePattern.test(content),
      false,
      `AdSense scripts/ins tags must not be hardcoded in HTML: ${file}`
    );
    assert.equal(
      forbiddenAdGuiltPattern.test(content),
      false,
      `AdSense policy guilt phrasing detected in ${file}`
    );
  }
});

test('analytics.js queues Mixpanel events from boot, defers remote script until load + idle, and injects once with fetchPriority low', () => {
  const analyticsSource = readRepoFile('src/js/analytics.js');
  const injectedScripts = [];
  const loadListeners = [];
  const idleCallbacks = [];
  const timeouts = [];
  const gtagCalls = [];
  const firstScript = {
    parentNode: {
      insertBefore(node) {
        injectedScripts.push(node);
      },
    },
  };

  const mockDoc = {
    title: 'CGPA Calculator',
    readyState: 'interactive',
    createElement(tag) {
      return { tagName: tag.toUpperCase() };
    },
    getElementsByTagName() {
      return [firstScript];
    },
    head: {
      appendChild(node) {
        injectedScripts.push(node);
      },
    },
  };

  const mockWindow = {
    location: { hash: '', pathname: '/', search: '' },
    document: mockDoc,
    gtag(...args) {
      gtagCalls.push(JSON.parse(JSON.stringify(args)));
    },
    addEventListener(type, fn) {
      if (type === 'load') loadListeners.push(fn);
    },
    requestIdleCallback(fn) {
      idleCallbacks.push(fn);
    },
    setTimeout(fn) {
      timeouts.push(fn);
      return timeouts.length;
    },
    clearTimeout() {},
  };

  vm.runInNewContext(analyticsSource, {
    window: mockWindow,
    document: mockDoc,
    history: { replaceState() {} },
    RegExp,
    Array,
    JSON,
    decodeURIComponent,
  });

  // Queue ready immediately, script NOT injected before load
  assert.equal(injectedScripts.length, 0);
  assert.equal(typeof mockWindow.track, 'function');
  assert.equal(typeof mockWindow.mixpanel?.track, 'function');

  mockWindow.track('computed_gpa', { gpa: 9.57 });
  assert.equal(gtagCalls.length, 1);
  assert.deepEqual(gtagCalls[0], ['event', 'computed_gpa', { gpa: 9.57 }]);
  assert.equal(
    mockWindow.mixpanel.some((entry) => Array.isArray(entry) && entry[0] === 'track' && entry[1] === 'computed_gpa'),
    true
  );

  // GA4 normalization: spaces -> snake_case, camelCase params -> snake_case, beacon on outbound clicks, no duplicate page_view
  mockWindow.track('App Launched', { mode: 'browser tab', university: 'vit' });
  assert.deepEqual(gtagCalls[1], ['event', 'app_launched', { mode: 'browser tab', university: 'vit' }]);
  assert.equal(
    mockWindow.mixpanel.some((entry) => Array.isArray(entry) && entry[0] === 'track' && entry[1] === 'App Launched'),
    true
  );

  mockWindow.track('page_view', { university: 'vit', calculator: 'sc', referrer: 'https://reddit.com' });
  assert.deepEqual(gtagCalls[2], ['event', 'calculator_view', { university: 'vit', calculator: 'sc' }]);

  mockWindow.track('computed_qcc', {
    university: 'vit',
    cgpa: 9.12,
    totalCredits: 120,
    ignoredObj: { nested: true },
    ignoredNaN: Number.NaN,
    longText: 'x'.repeat(130),
  });
  assert.deepEqual(gtagCalls[3], [
    'event',
    'computed_qcc',
    { university: 'vit', cgpa: 9.12, total_credits: 120, long_text: 'x'.repeat(100) },
  ]);

  mockWindow.track('promo_clicked', { promo_id: 'personal-day20', tab: 'sc', university: 'vit' });
  assert.deepEqual(gtagCalls[4], [
    'event',
    'promo_clicked',
    { promo_id: 'personal-day20', tab: 'sc', university: 'vit', transport_type: 'beacon' },
  ]);

  mockWindow.track('ui_version_switched', { from: 'v2', to: 'legacy', university: 'vit' });
  assert.deepEqual(gtagCalls[5], [
    'event',
    'ui_version_switched',
    { from: 'v2', to: 'legacy', university: 'vit', transport_type: 'beacon' },
  ]);

  mockWindow.track('123_custom', { ok: true });
  assert.deepEqual(gtagCalls[6], ['event', 'e_123_custom', { ok: true }]);

  assert.equal(typeof mockWindow.setAnalyticsUserProperties, 'function');
  mockWindow.setAnalyticsUserProperties({ university: 'vit', launchMode: 'standalone' });
  assert.deepEqual(gtagCalls[7], [
    'set',
    'user_properties',
    { university: 'vit', launch_mode: 'standalone' },
  ]);
  assert.equal(
    mockWindow.mixpanel.some((entry) => Array.isArray(entry) && entry[0] === 'register'),
    true
  );

  // Trigger window.load -> schedules idle callback + fallback timer, still not injected until idle
  assert.equal(loadListeners.length, 1);
  loadListeners[0]();
  assert.equal(injectedScripts.length, 0);
  assert.equal(idleCallbacks.length, 1);
  assert.equal(timeouts.length, 1);

  // Run idle callback -> injects script once with fetchPriority = 'low'
  idleCallbacks[0]();
  assert.equal(injectedScripts.length, 1);
  assert.equal(injectedScripts[0].src, 'https://cdn4.mxpnl.com/libs/mixpanel-2-latest.min.js');
  assert.equal(injectedScripts[0].async, true);
  assert.equal(injectedScripts[0].fetchPriority, 'low');

  // Running fallback timer afterwards must NOT inject a second script
  timeouts[0]();
  assert.equal(injectedScripts.length, 1);

  // Without requestIdleCallback, script injects immediately on load (once)
  const noRicScripts = [];
  const noRicLoadListeners = [];
  const noRicDoc = {
    title: 'CGPA Calculator',
    readyState: 'interactive',
    createElement(tag) {
      return { tagName: tag.toUpperCase() };
    },
    getElementsByTagName() {
      return [];
    },
    head: {
      appendChild(node) {
        noRicScripts.push(node);
      },
    },
  };
  const noRicWin = {
    location: { hash: '', pathname: '/', search: '' },
    document: noRicDoc,
    addEventListener(type, fn) {
      if (type === 'load') noRicLoadListeners.push(fn);
    },
    clearTimeout() {},
  };
  vm.runInNewContext(analyticsSource, {
    window: noRicWin,
    document: noRicDoc,
    history: { replaceState() {} },
    RegExp,
    Array,
    JSON,
    decodeURIComponent,
  });
  assert.equal(noRicScripts.length, 0);
  noRicLoadListeners[0]();
  assert.equal(noRicScripts.length, 1);
  assert.equal(noRicScripts[0].fetchPriority, 'low');
  noRicLoadListeners[0]();
  assert.equal(noRicScripts.length, 1);
});

test('resolveTabId handles legacy ?tab=qcc/ascc/emc and university-specific tabs', () => {
  const vitTabs = ['sc', 'gc', 'ec', 'fc'];
  const collegeTabs = ['sc', 'gc', 'fc'];

  assert.equal(resolveTabId('sc', vitTabs), 'sc');
  assert.equal(resolveTabId('gc', vitTabs), 'gc');
  assert.equal(resolveTabId('ec', vitTabs), 'ec');
  assert.equal(resolveTabId('fc', vitTabs), 'fc');
  assert.equal(resolveTabId('qcc', vitTabs), 'gc');
  assert.equal(resolveTabId('ascc', vitTabs), 'fc');
  assert.equal(resolveTabId('emc', vitTabs), 'ec');

  assert.equal(resolveTabId('ec', collegeTabs), 'sc');
  assert.equal(resolveTabId('qcc', collegeTabs), 'gc');
  assert.equal(resolveTabId('ascc', collegeTabs), 'fc');
  assert.equal(resolveTabId('invalid', collegeTabs), 'sc');
  assert.equal(resolveTabId(null, collegeTabs), 'sc');
  assert.equal(resolveTabId('gc', ['gc']), 'gc');
  assert.equal(resolveTabId('gc', []), null);
});

test('resolveGiscusTheme maps light, dark, and system theme modes', () => {
  assert.equal(resolveGiscusTheme('light'), 'light');
  assert.equal(resolveGiscusTheme('dark'), 'dark');
  assert.equal(resolveGiscusTheme('system'), 'preferred_color_scheme');
  assert.equal(resolveGiscusTheme('other'), 'preferred_color_scheme');
  assert.equal(resolveGiscusTheme(null), 'preferred_color_scheme');
});

test('getScoreBand buckets 10-point GPA/CGPA and 100-point marks cleanly', () => {
  assert.equal(getScoreBand('sc', 9.5), '9_plus');
  assert.equal(getScoreBand('gc', 9.0), '9_plus');
  assert.equal(getScoreBand('fc', 8.4), '8_to_9');
  assert.equal(getScoreBand('sc', 7.0), '7_to_8');
  assert.equal(getScoreBand('sc', 6.8), 'below_7');
  assert.equal(getScoreBand('ec', 92), '90_plus');
  assert.equal(getScoreBand('ec', 84), '80_to_90');
  assert.equal(getScoreBand('ec', 71), '70_to_80');
  assert.equal(getScoreBand('ec', 60), 'below_70');
  assert.equal(getScoreBand('sc', Number.NaN), 'unknown');
  assert.equal(getScoreBand('ec', 'not-a-number'), 'unknown');
});

test('all 4 HTML pages match DOM contract IDs, header logo/title, independent college pages, per-college Discussions, Contribute above Discussion, Left Ad pane, Announcement Banner, Pico CSS, fonts, AdSense meta, and analytics', () => {
  const pages = [
    { file: 'index.html', uni: 'vit', hasEc: true, headerTitle: 'VIT CGPA Calculator', discussionTerm: '5' },
    { file: 'college/anna-university.html', uni: 'anna', hasEc: false, headerTitle: 'Anna University CGPA Calculator', discussionTerm: '6' },
    { file: 'college/ktu.html', uni: 'ktu', hasEc: false, headerTitle: 'KTU CGPA Calculator', discussionTerm: '7' },
    { file: 'college/srm.html', uni: 'srm', hasEc: false, headerTitle: 'SRM CGPA Calculator', discussionTerm: '8' },
  ];

  const requiredIds = [
    'theme-selector',
    'install-app-btn',
    'share-app-btn',
    'thisYear',
    'announcement-banner',
    'gpa-form',
    'gpa-rows',
    'add-course-btn',
    'reset-gpa-btn',
    'gbtn',
    'gpa-form-error',
    'gpa-result',
    'grades',
    'gpa-meta',
    'quick-cgpa-form',
    'tc',
    'cgpa',
    'c',
    'gpa',
    'reset-qcc-btn',
    'submit',
    'quick-cgpa-error',
    'cgpa-result',
    'cgpa-msg',
    'cgpa-meta',
    'all-sem-form',
    'sem-rows',
    'add-sem-btn',
    'reset-fc-btn',
    'sem-cgpa-btn',
    'all-sem-error',
    'fcgpa-result',
    'fcgpa',
    'fcgpa-meta',
    'personal-promo-slot',
    'contribute-section',
    'contribute-repo-link',
    'contribute-issue-link',
    'ad-control-card',
    'ad-optin-btn',
    'ad-optin-status',
    'ad-slot-optin',
    'comments-section',
    'giscus-container',
  ];

  for (const page of pages) {
    const html = readRepoFile(page.file);
    assert.match(html, new RegExp(`data-university="${page.uni}"`));
    assert.match(html, /<meta name="google-adsense-account" content="ca-pub-8598751574376549">/);
    assert.match(html, /G-8SGELQM6QV/);
    assert.match(html, /Google\+Sans/);
    assert.match(html, /Space\+Grotesk/);
    assert.match(html, /\/src\/css\/vendor\/pico\.min\.css/);
    assert.match(html, /<link rel="modulepreload" href="\/src\/js\/promos\.js">/);
    assert.match(html, /<script src="\/src\/js\/analytics\.js" defer fetchpriority="low"><\/script>/);
    assert.match(html, /<script type="module" src="\/src\/js\/app\.js" fetchpriority="high"><\/script>/);

    // Header uses original logo image + college H1 title; no cross-college uni-nav or page-hero
    assert.match(html, /<img class="brand-logo" src="\/src\/images\/icons\/icon-96x96\.png"/);
    assert.match(html, new RegExp(`<h1 class="brand-title">${page.headerTitle}<\\/h1>`));
    assert.doesNotMatch(html, /class="uni-nav"/);
    assert.doesNotMatch(html, /class="page-hero"/);
    assert.doesNotMatch(html, /class="footer-links"/);

    // Center starts directly with mode chips; Left pane is Ad-only; Right pane has Contribute ABOVE Discussions
    assert.match(html, /<div class="workspace-center">\s*<div class="mode-tabs"/);
    const leftMatch = html.match(/<aside class="workspace-left"[\s\S]*?<\/aside>/);
    assert.ok(leftMatch, `${page.file} missing .workspace-left`);
    assert.match(leftMatch[0], /id="ad-control-card"/);
    assert.doesNotMatch(leftMatch[0], /id="contribute-section"/);

    const rightMatch = html.match(/<aside class="workspace-right"[\s\S]*?<\/aside>/);
    assert.ok(rightMatch, `${page.file} missing .workspace-right`);
    const contributeIdx = rightMatch[0].indexOf('id="contribute-section"');
    const commentsIdx = rightMatch[0].indexOf('id="comments-section"');
    assert.ok(contributeIdx !== -1 && commentsIdx !== -1 && contributeIdx < commentsIdx, `${page.file} must place #contribute-section above #comments-section in .workspace-right`);

    assert.match(html, new RegExp(`https:\\/\\/github\\.com\\/rajchandra3\\/cgpa-calculator\\/discussions\\/${page.discussionTerm}`));
    assert.match(html, /id="giscus-container"/);
    assert.match(html, /data-repo="rajchandra3\/cgpa-calculator"/);
    assert.match(html, /data-repo-id="R_kgDOGqICXQ"/);
    assert.match(html, /data-category="General"/);
    assert.match(html, /data-category-id="DIC_kwDOGqICXc4DL4Gy"/);
    assert.match(html, /data-mapping="number"/);
    assert.match(html, new RegExp(`data-term="${page.discussionTerm}"`));

    // Grade Scale card and legacy ad slots removed; Announcement banner + 1 hidden opt-in left-pane ad slot
    assert.doesNotMatch(html, /grade-scale-card/);
    assert.doesNotMatch(html, /ad-slot-post-calc/);
    assert.doesNotMatch(html, /ad-slot-left-rail/);
    assert.match(
      html,
      /<section id="announcement-banner" class="announcement-banner ad-slot ad-slot--announcement"[^>]*data-ad-location="announcement-banner"[^>]*data-ad-slot="6993669367"[^>]*hidden>/
    );
    assert.match(
      html,
      /<section id="personal-promo-slot" class="personal-promo"[^>]*hidden><\/section>/
    );
    assert.match(
      html,
      /id="contribute-repo-link"[^>]*data-contribute-action="repo"[^>]*href="https:\/\/github\.com\/rajchandra3\/cgpa-calculator"/
    );
    assert.match(
      html,
      /id="contribute-issue-link"[^>]*data-contribute-action="issue"[^>]*href="https:\/\/github\.com\/rajchandra3\/cgpa-calculator\/issues\/new"/
    );
    assert.match(
      html,
      /id="ad-optin-btn"[^>]*aria-pressed="true"[^>]*aria-controls="ad-slot-optin"[^>]*>Hide Ad<\/button>/
    );
    assert.match(html, /<span id="thisYear"><\/span>/);
    assert.doesNotMatch(html, /<span id="thisYear">\d+<\/span>/);

    const adSlotMatches = html.match(/class="[^"]*\bad-slot\b/g) || [];
    assert.equal(adSlotMatches.length, 2, `${page.file} must have strictly 2 .ad-slot containers (announcement + opt-in)`);
    assert.match(
      html,
      /<section id="ad-slot-optin" class="ad-slot ad-slot--optin"[^>]*data-ad-location="optin-quality"[^>]*data-ad-slot-desktop="7637288848"[^>]*data-ad-slot-mobile="6993669367"[^>]*hidden>/
    );
    assert.doesNotMatch(html, /360px/);

    const calcShellMatch = html.match(/<article class="calculator-shell"[\s\S]*?<\/article>/);
    assert.ok(calcShellMatch, `${page.file} missing .calculator-shell`);
    assert.doesNotMatch(calcShellMatch[0], /ad-slot/);
    assert.doesNotMatch(calcShellMatch[0], /personal-promo-slot/);

    const commentsMatch = html.match(/<section id="comments-section"[\s\S]*?<\/section>/);
    assert.ok(commentsMatch, `${page.file} missing #comments-section`);
    assert.doesNotMatch(commentsMatch[0], /ad-slot/);

    const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(ldMatch, `${page.file} missing JSON-LD`);
    const ldGraph = JSON.parse(ldMatch[1])['@graph'];
    const faqSchema = ldGraph.find((node) => node['@type'] === 'FAQPage');
    assert.ok(faqSchema && Array.isArray(faqSchema.mainEntity), `${page.file} missing FAQPage JSON-LD`);
    const visibleFaqAnswers = Array.from(
      html.matchAll(/<details class="faq-item">\s*<summary>[\s\S]*?<\/summary>\s*<p>([\s\S]*?)<\/p>\s*<\/details>/g),
      (m) => m[1].replace(/&amp;/g, '&').trim()
    );
    assert.deepEqual(
      visibleFaqAnswers,
      faqSchema.mainEntity.map((q) => q.acceptedAnswer.text),
      `${page.file} visible FAQ answers must match JSON-LD 1:1`
    );

    for (const id of requiredIds) {
      assert.match(html, new RegExp(`id="${id}"`), `${page.file} missing #${id}`);
    }

    if (page.hasEc) {
      assert.match(html, /id="expected-marks-form"/);
      assert.match(html, /id="legacy-ui-link"[^>]*href="\/legacy\/"/);
      assert.match(html, /cgpa_ui_version/);
      for (const ecId of ['cat1', 'cat2', 'da', 'al', 'lab', 'j-comp', 'fat', 'ec-submit']) {
        assert.match(html, new RegExp(`id="${ecId}"`), `${page.file} missing #${ecId}`);
      }
    } else {
      assert.doesNotMatch(html, /id="expected-marks-form"/);
      assert.doesNotMatch(html, /id="legacy-ui-link"/);
    }
  }
});

test('VIT /legacy/ Classic UI snapshot exists, is ad-free/noindex, and has safe JS + 2.0 switch toggle', () => {
  const legacyFiles = [
    'legacy/index.html',
    'legacy/js/legacy.js',
    'legacy/css/style.css',
    'legacy/css/mobile.css',
    'legacy/css/themes/light.css',
    'legacy/css/themes/dark.css',
  ];
  for (const file of legacyFiles) {
    assert.equal(repoFileExists(file), true, `Missing legacy file: ${file}`);
  }

  const legacyHtml = readRepoFile('legacy/index.html');
  assert.match(legacyHtml, /<meta name="robots" content="noindex, follow">/);
  assert.match(legacyHtml, /<link rel="canonical" href="https:\/\/cgpa-calculator\.rajchandra\.me\/">/);
  assert.match(legacyHtml, /G-8SGELQM6QV/);
  assert.match(legacyHtml, /\/src\/js\/analytics\.js/);
  assert.match(legacyHtml, /id="switch-to-v2-btn"/);
  assert.match(legacyHtml, /id="banner-switch-v2"/);
  assert.match(legacyHtml, /id="gbtn"/);
  assert.match(legacyHtml, /id="submit"/);
  assert.match(legacyHtml, /id="ec-submit"/);
  assert.match(legacyHtml, /id="sem-cgpa-btn"/);
  assert.match(legacyHtml, /<span id="thisYear"><\/span>/);
  assert.doesNotMatch(legacyHtml, /adsbygoogle|pagead2|fb-comments|connect\.facebook|AW-16729760450|files\.rajchandra\.me/);

  const legacyJs = readRepoFile('legacy/js/legacy.js');
  assert.doesNotMatch(legacyJs, /innerHTML|outerHTML|document\.write|insertAdjacentHTML|\beval\(|alert\(/);
  assert.match(legacyJs, /ui_version_switched/);
  assert.match(legacyJs, /calculation_completed/);
});

test('src/css/app.css keeps .row-list single-column at all viewports and cleans up obsolete rules', () => {
  const css = readRepoFile('src/css/app.css');
  assert.doesNotMatch(css, /\.row-list\s*\{[^}]*grid-template-columns\s*:/);
  assert.doesNotMatch(css, /@container[\s\S]*?\.row-list[\s\S]*?repeat\(2/);
  assert.doesNotMatch(css, /\.grade-scale-card/);
  assert.doesNotMatch(css, /\.ad-slot--banner/);
  assert.doesNotMatch(css, /\.ad-slot--rail/);
  assert.match(css, /\.table-wrap/);
  assert.match(css, /\.grade-table/);
  assert.match(css, /\.side-card/);
  assert.match(css, /\.ad-slot--optin/);
  assert.match(css, /\.personal-promo-card/);
});
