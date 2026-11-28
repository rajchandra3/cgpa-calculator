export const AD_CLIENT = 'ca-pub-8598751574376549';
export const PRODUCTION_HOST = 'cgpa-calculator.rajchandra.me';
export const ADSENSE_SCRIPT_SRC =
  `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT}`;
export const GPT_SCRIPT_SRC = 'https://securepubads.g.doubleclick.net/tag/js/gpt.js';
export const AD_PREF_STORAGE_KEY = 'cgpa_ad_optin';
export const AD_HIDE_UNTIL_STORAGE_KEY = 'cgpa_ad_hide_until';
export const AD_FREE_TTL_MS = 24 * 60 * 60 * 1000;
export const REWARDED_AD_UNIT_PATH = '';

const mountedSlots = new WeakSet();
const lazyObservers = new WeakMap();

export function getViewportBucket(viewportWidth) {
  if (viewportWidth >= 1120) return 'desktop';
  if (viewportWidth >= 768) return 'tablet';
  return 'mobile';
}

export function isPreviewMode(search = '') {
  if (typeof search !== 'string' || !search) return false;
  return new URLSearchParams(search).get('ads') === 'preview';
}

export function isStagingHost(hostname = '') {
  return hostname !== PRODUCTION_HOST;
}

export function getAdFreeRemainingMs(win = window, now = Date.now()) {
  try {
    const raw = win?.localStorage?.getItem(AD_HIDE_UNTIL_STORAGE_KEY);
    if (!raw) return 0;
    const until = Number(raw);
    if (!Number.isFinite(until) || until <= now) {
      win.localStorage.removeItem?.(AD_HIDE_UNTIL_STORAGE_KEY);
      return 0;
    }
    return until - now;
  } catch {
    return 0;
  }
}

export function formatAdFreeRemaining(remainingMs) {
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return '';
  const hours = Math.ceil(remainingMs / 3600000);
  return hours <= 1 ? '< 1h left' : `${hours}h left`;
}

export function getAdPreference(win = window, now = Date.now()) {
  if (getAdFreeRemainingMs(win, now) > 0) {
    return false;
  }
  try {
    return win?.localStorage?.getItem(AD_PREF_STORAGE_KEY) !== '0';
  } catch {
    return true;
  }
}

export function setAdPreference(
  win = window,
  enabled,
  { ttlMs = AD_FREE_TTL_MS, now = Date.now() } = {}
) {
  try {
    const storage = win?.localStorage;
    if (!storage) return;
    if (enabled) {
      storage.removeItem?.(AD_HIDE_UNTIL_STORAGE_KEY);
      storage.setItem(AD_PREF_STORAGE_KEY, '1');
    } else {
      const duration = Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : AD_FREE_TTL_MS;
      storage.setItem(AD_HIDE_UNTIL_STORAGE_KEY, String(now + duration));
      storage.removeItem?.(AD_PREF_STORAGE_KEY);
    }
  } catch {
    // Ignore blocked storage
  }
}

export function grantAdFreePass({
  win = window,
  ttlMs = AD_FREE_TTL_MS,
  now = Date.now(),
  source = 'user_toggle',
} = {}) {
  const duration = Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : AD_FREE_TTL_MS;
  setAdPreference(win, false, { ttlMs: duration, now });
  const until = now + duration;
  trackAdEvent(win, 'ad_free_pass_granted', {
    ttl_hours: Math.max(1, Math.round(duration / 3600000)),
    source,
  });
  return { until, ttlMs: duration };
}

export function isRewardedAdsConfigured(unitPath = REWARDED_AD_UNIT_PATH) {
  return typeof unitPath === 'string' && /^\/\d+\/.+/.test(unitPath.trim());
}

export async function requestRewardedAdFree({
  unitPath = REWARDED_AD_UNIT_PATH,
  doc = typeof document !== 'undefined' ? document : null,
  win = typeof window !== 'undefined' ? window : null,
  ttlMs = AD_FREE_TTL_MS,
  now = Date.now(),
} = {}) {
  if (!isRewardedAdsConfigured(unitPath)) {
    return { supported: false, granted: false, reason: 'not_configured' };
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (payload) => {
      if (settled) return;
      settled = true;
      resolve(payload);
    };

    const existingGpt = doc.querySelector?.(
      'script[src*="securepubads.g.doubleclick.net/tag/js/gpt.js"]'
    );
    if (!existingGpt) {
      const gptScript = doc.createElement('script');
      gptScript.src = GPT_SCRIPT_SRC;
      gptScript.async = true;
      gptScript.fetchPriority = 'low';
      gptScript.addEventListener?.('error', () => {
        finish({ supported: true, granted: false, reason: 'script_blocked' });
      });
      (doc.head || doc.body || doc.documentElement).appendChild(gptScript);
    }

    win.googletag = win.googletag || { cmd: [] };
    win.googletag.cmd = win.googletag.cmd || [];
    win.googletag.cmd.push(() => {
      const gpt = win.googletag;
      const rewardedFormat = gpt?.enums?.OutOfPageFormat?.REWARDED;
      const slot = gpt?.defineOutOfPageSlot?.(unitPath.trim(), rewardedFormat);
      if (!slot) {
        finish({ supported: true, granted: false, reason: 'unsupported' });
        return;
      }

      let granted = false;
      const pubads = gpt.pubads();
      slot.addService(pubads);

      pubads.addEventListener('rewardedSlotReady', (evt) => {
        evt?.makeRewardedVisible?.();
      });

      pubads.addEventListener('rewardedSlotGranted', () => {
        granted = true;
        grantAdFreePass({ win, ttlMs, now, source: 'gpt_rewarded' });
      });

      pubads.addEventListener('rewardedSlotClosed', () => {
        gpt.destroySlots?.([slot]);
        if (granted) {
          finish({ supported: true, granted: true, until: now + ttlMs });
        } else {
          finish({ supported: true, granted: false, reason: 'closed' });
        }
      });

      gpt.enableServices?.();
      gpt.display?.(slot);
    });
  });
}

function isSlotEligibleForViewport(slotEl, viewportWidth) {
  const ds = slotEl?.dataset;
  if (!ds) return false;
  if (ds.adMinWidth && viewportWidth > 0 && viewportWidth < Number(ds.adMinWidth)) {
    return false;
  }
  if (slotEl.classList?.contains('ad-slot--desktop-only') && viewportWidth > 0 && viewportWidth < 1120) {
    return false;
  }
  return true;
}

export function resolveQualitySlotId(slotEl, viewportWidth) {
  const ds = slotEl?.dataset;
  if (!ds) return '';
  if (!isSlotEligibleForViewport(slotEl, viewportWidth)) return '';
  if (viewportWidth >= 1120) {
    return ds.adSlotDesktop || ds.adSlot || '';
  }
  return ds.adSlotMobile || ds.adSlot || '';
}

export function resolveAdFormat(slotEl, viewportWidth) {
  const ds = slotEl?.dataset;
  if (!ds) return 'auto';
  if (viewportWidth >= 1120) {
    return ds.adFormatDesktop || ds.adFormat || 'auto';
  }
  return ds.adFormatMobile || ds.adFormat || 'auto';
}

function findOptInSlot(doc) {
  return (
    doc?.getElementById?.('ad-slot-optin') ||
    doc?.querySelector?.('.ad-slot[data-ad-location="left-rail-primary"]') ||
    doc?.querySelector?.('.ad-slot[data-ad-location="optin-quality"]') ||
    null
  );
}

function setOptInStatus(doc, message) {
  const statusEl = doc?.getElementById?.('ad-optin-status');
  if (statusEl) {
    statusEl.textContent = message;
  }
}

function trackAdEvent(win, name, props) {
  try {
    if (typeof win?.track === 'function') {
      win.track(name, props);
    }
  } catch {
    // Ignore telemetry failures
  }
}

function observeAdStatus(insEl, slotEl, meta, doc, win, { updateOptInStatus = false } = {}) {
  if (typeof win?.MutationObserver !== 'function') return;

  const observer = new win.MutationObserver(() => {
    const status = insEl.getAttribute('data-ad-status');
    if (status === 'filled') {
      slotEl.classList.remove('is-loading', 'is-unfilled');
      if (updateOptInStatus) setOptInStatus(doc, 'Ad slot active');
      trackAdEvent(win, 'ad_slot_filled', meta);
      observer.disconnect();
    } else if (status === 'unfilled') {
      slotEl.classList.remove('is-loading');
      slotEl.classList.add('is-unfilled');
      if (updateOptInStatus) setOptInStatus(doc, 'No ad available right now');
      trackAdEvent(win, 'ad_slot_unfilled', meta);
      observer.disconnect();
    }
  });

  observer.observe(insEl, { attributes: true, attributeFilter: ['data-ad-status'] });
}

function observeAdViewability(slotEl, meta, win) {
  if (typeof win?.IntersectionObserver !== 'function') return;

  let dwellTimer = null;
  const clearDwell = () => {
    if (dwellTimer !== null) {
      win.clearTimeout(dwellTimer);
      dwellTimer = null;
    }
  };

  const observer = new win.IntersectionObserver(
    (entries) => {
      const visible = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5);
      if (visible) {
        if (dwellTimer === null) {
          dwellTimer = win.setTimeout(() => {
            dwellTimer = null;
            observer.disconnect();
            trackAdEvent(win, 'ad_slot_viewable', meta);
          }, 1000);
        }
      } else {
        clearDwell();
      }
    },
    { threshold: 0.5 }
  );

  observer.observe(slotEl);
}

function mountIntoFrame(slotEl, node) {
  const frame = slotEl.querySelector?.('.ad-frame') || slotEl;
  if (typeof frame.replaceChildren === 'function') {
    frame.replaceChildren(node);
  } else {
    frame.textContent = '';
    frame.appendChild(node);
  }
}

function renderPreviewSlot(slotEl, doc, slotId, viewportWidth) {
  const bucket = getViewportBucket(viewportWidth);
  const format = resolveAdFormat(slotEl, viewportWidth);
  const loadMode = slotEl.dataset?.adLoad || 'eager';
  const loc = slotEl.dataset?.adLocation || slotEl.id || 'slot';
  const frame = slotEl.querySelector?.('.ad-frame') || slotEl;
  const measuredW =
    typeof frame.clientWidth === 'number' && frame.clientWidth > 0
      ? ` · ${frame.clientWidth}px wide`
      : '';

  const box = doc.createElement('div');
  box.className = 'ad-preview-box';

  const title = doc.createElement('strong');
  title.textContent = `Ad Preview · ${loc} · ${bucket} (${slotId})`;

  const dims = doc.createElement('span');
  dims.className = 'num';
  dims.textContent = `format: ${format} · load: ${loadMode}${measuredW}`;

  box.append(title, dims);
  mountIntoFrame(slotEl, box);
}

function ensureAdSenseScript(doc, win, slotEl, meta, { updateOptInStatus = false } = {}) {
  const attachErrorHandler = (scriptEl) => {
    scriptEl.addEventListener?.('error', () => {
      slotEl.classList.remove('is-loading');
      slotEl.classList.add('is-unfilled');
      slotEl.hidden = true;
      if (updateOptInStatus) setOptInStatus(doc, 'Ad script blocked by browser or extension');
      trackAdEvent(win, 'ad_slot_unfilled', {
        ...meta,
        reason: 'script_blocked',
      });
    });
  };

  const existing = doc.querySelector?.(
    'script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]'
  );
  if (existing) {
    attachErrorHandler(existing);
    return existing;
  }

  const script = doc.createElement('script');
  script.src = ADSENSE_SCRIPT_SRC;
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.fetchPriority = 'low';
  attachErrorHandler(script);
  (doc.head || doc.body || doc.documentElement).appendChild(script);
  return script;
}

export function mountManagedSlot(
  slotEl,
  { university = 'vit', trigger = 'default_on', doc = document, win = window, updateOptInStatus = false } = {}
) {
  const preview = isPreviewMode(win?.location?.search || '');
  const viewportWidth = Number(win?.innerWidth || doc?.documentElement?.clientWidth || 0);
  const slotId = resolveQualitySlotId(slotEl, viewportWidth);

  if (!slotEl || !slotId) {
    return { preview, activated: false, slot: '' };
  }

  slotEl.hidden = false;
  slotEl.classList?.remove('is-inactive', 'is-custom-announcement');

  if (typeof slotEl.offsetWidth === 'number' && slotEl.offsetWidth <= 0) {
    slotEl.hidden = true;
    return { preview, activated: false, slot: '' };
  }

  if (mountedSlots.has(slotEl)) {
    return { preview, activated: true, reused: true, slot: slotId };
  }

  mountedSlots.add(slotEl);

  if (preview) {
    renderPreviewSlot(slotEl, doc, slotId, viewportWidth);
    return { preview: true, activated: true, slot: slotId };
  }

  const bucket = getViewportBucket(viewportWidth);
  const format = resolveAdFormat(slotEl, viewportWidth);
  const staging = isStagingHost(win?.location?.hostname || PRODUCTION_HOST);
  const meta = {
    location: slotEl.dataset?.adLocation || slotEl.id || 'managed-slot',
    slot: slotId,
    university,
    viewport_bucket: bucket,
    trigger,
  };

  slotEl.classList?.add('is-loading');
  ensureAdSenseScript(doc, win, slotEl, meta, { updateOptInStatus });

  const ins = doc.createElement('ins');
  ins.className = 'adsbygoogle';
  ins.style.display = 'block';
  ins.setAttribute('data-ad-client', AD_CLIENT);
  ins.setAttribute('data-ad-slot', slotId);
  ins.setAttribute('data-ad-format', format);
  ins.setAttribute('data-full-width-responsive', 'true');
  if (staging) {
    ins.setAttribute('data-adtest', 'on');
  }

  mountIntoFrame(slotEl, ins);

  try {
    win.adsbygoogle = win.adsbygoogle || [];
    win.adsbygoogle.push({});
  } catch {
    // Ignore single-slot push errors
  }

  trackAdEvent(win, 'ad_slot_requested', meta);
  observeAdStatus(ins, slotEl, meta, doc, win, { updateOptInStatus });
  observeAdViewability(slotEl, meta, win);

  return { preview: false, activated: true, slot: slotId };
}

export function initManagedAds({
  university = 'vit',
  trigger = 'default_on',
  doc = document,
  win = window,
} = {}) {
  const preview = isPreviewMode(win?.location?.search || '');
  const viewportWidth = Number(win?.innerWidth || doc?.documentElement?.clientWidth || 0);

  const priorObserver = lazyObservers.get(doc);
  if (priorObserver) {
    priorObserver.disconnect();
    lazyObservers.delete(doc);
  }

  const queried = doc?.querySelectorAll?.('.ad-slot[data-ad-managed="true"]');
  let candidates = queried ? Array.from(queried) : [];
  if (candidates.length === 0) {
    const fallbackOptIn = findOptInSlot(doc);
    if (fallbackOptIn) candidates = [fallbackOptIn];
  }

  const mounted = [];
  const lazyQueue = [];
  let actionCount = 0;

  for (const slotEl of candidates) {
    const slotId = resolveQualitySlotId(slotEl, viewportWidth);
    if (!slotId) {
      slotEl.hidden = true;
      continue;
    }

    const loadMode = slotEl.dataset?.adLoad || 'eager';
    if (loadMode === 'action' && !preview) {
      slotEl.hidden = true;
      actionCount += 1;
      continue;
    }

    const isLazy = loadMode === 'lazy';
    if (!isLazy) {
      const res = mountManagedSlot(slotEl, {
        university,
        trigger,
        doc,
        win,
        updateOptInStatus: slotEl.id === 'ad-slot-optin',
      });
      if (res.activated) mounted.push(res.slot);
      continue;
    }

    slotEl.hidden = false;
    slotEl.classList?.remove('is-inactive');
    if (typeof slotEl.offsetWidth === 'number' && slotEl.offsetWidth <= 0) {
      slotEl.hidden = true;
      continue;
    }
    if (!mountedSlots.has(slotEl) && !preview) {
      slotEl.classList?.add('is-loading');
    }
    lazyQueue.push(slotEl);
  }

  let lazyCount = 0;
  if (lazyQueue.length > 0 && typeof win?.IntersectionObserver === 'function' && !preview) {
    const observer = new win.IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry?.isIntersecting) continue;
          const target = entry.target;
          observer.unobserve?.(target);
          mountManagedSlot(target, {
            university,
            trigger: 'scroll_lazy',
            doc,
            win,
          });
        }
      },
      { rootMargin: '200px 0px' }
    );
    lazyObservers.set(doc, observer);
    for (const slotEl of lazyQueue) {
      observer.observe(slotEl);
      lazyCount += 1;
    }
  } else {
    for (const slotEl of lazyQueue) {
      const res = mountManagedSlot(slotEl, {
        university,
        trigger: preview ? 'preview' : trigger,
        doc,
        win,
      });
      if (res.activated) mounted.push(res.slot);
    }
  }

  return {
    preview,
    mountedCount: mounted.length,
    lazyCount,
    actionCount,
    slots: mounted,
  };
}

export function unlockActionAds({
  university = 'vit',
  trigger = 'calculation_completed',
  doc = document,
  win = window,
} = {}) {
  const preview = isPreviewMode(win?.location?.search || '');
  if (!preview && !getAdPreference(win)) {
    return { preview: false, mountedCount: 0, slots: [] };
  }

  const queried = doc?.querySelectorAll?.('.ad-slot[data-ad-managed="true"][data-ad-load="action"]');
  const candidates = queried ? Array.from(queried) : [];
  const slots = [];

  for (const slotEl of candidates) {
    const res = mountManagedSlot(slotEl, {
      university,
      trigger: preview ? 'preview' : trigger,
      doc,
      win,
    });
    if (res.activated && !res.reused) {
      slots.push(res.slot);
    }
  }

  return {
    preview,
    mountedCount: slots.length,
    slots,
  };
}

export function hideAllManagedAds({ doc = document } = {}) {
  const observer = lazyObservers.get(doc);
  if (observer) {
    observer.disconnect();
    lazyObservers.delete(doc);
  }

  const seen = new Set();
  const queried = doc?.querySelectorAll?.('.ad-slot[data-ad-managed="true"]');
  if (queried) {
    for (const el of queried) {
      if (el.id === 'announcement-banner' && el.classList?.contains('is-custom-announcement')) {
        continue;
      }
      el.hidden = true;
      seen.add(el);
    }
  }

  const optInEl = findOptInSlot(doc);
  if (optInEl && !seen.has(optInEl)) {
    optInEl.hidden = true;
    seen.add(optInEl);
  }

  return seen.size;
}

export function activateOptInAd({
  university = 'vit',
  trigger = 'user_click',
  doc = document,
  win = window,
} = {}) {
  const slotEl = findOptInSlot(doc);
  return mountManagedSlot(slotEl, {
    university,
    trigger,
    doc,
    win,
    updateOptInStatus: true,
  });
}

export function hideOptInAd({ doc = document } = {}) {
  const slotEl = findOptInSlot(doc);
  if (!slotEl) return false;
  slotEl.hidden = true;
  return true;
}

export function activateAnnouncementAd({
  university = 'vit',
  trigger = 'announcement_fallback',
  doc = document,
  win = window,
} = {}) {
  const slotEl =
    doc?.getElementById?.('announcement-banner') ||
    doc?.querySelector?.('.ad-slot[data-ad-location="announcement-banner"]') ||
    null;
  return mountManagedSlot(slotEl, {
    university,
    trigger,
    doc,
    win,
    updateOptInStatus: false,
  });
}
