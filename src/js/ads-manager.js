export const AD_CLIENT = 'ca-pub-8598751574376549';
export const PRODUCTION_HOST = 'cgpa-calculator.rajchandra.me';
export const ADSENSE_SCRIPT_SRC =
  `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT}`;
export const AD_PREF_STORAGE_KEY = 'cgpa_ad_optin';

const mountedSlots = new WeakSet();

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

export function getAdPreference(win = window) {
  try {
    return win?.localStorage?.getItem(AD_PREF_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setAdPreference(win = window, enabled) {
  try {
    if (enabled) {
      win?.localStorage?.setItem(AD_PREF_STORAGE_KEY, '1');
    } else {
      win?.localStorage?.removeItem(AD_PREF_STORAGE_KEY);
    }
  } catch {
    // Ignore blocked storage
  }
}

export function resolveQualitySlotId(slotEl, viewportWidth) {
  const ds = slotEl?.dataset;
  if (!ds) return '';
  if (viewportWidth >= 1120) {
    return ds.adSlotDesktop || ds.adSlot || '';
  }
  return ds.adSlotMobile || ds.adSlot || '';
}

function findOptInSlot(doc) {
  return (
    doc?.getElementById?.('ad-slot-optin') ||
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

function observeAdStatus(insEl, slotEl, meta, doc, win) {
  if (typeof win?.MutationObserver !== 'function') return;

  const observer = new win.MutationObserver(() => {
    const status = insEl.getAttribute('data-ad-status');
    if (status === 'filled') {
      slotEl.classList.remove('is-unfilled');
      setOptInStatus(doc, 'Ad slot active');
      trackAdEvent(win, 'ad_slot_filled', meta);
      observer.disconnect();
    } else if (status === 'unfilled') {
      slotEl.classList.add('is-unfilled');
      setOptInStatus(doc, 'No ad available right now');
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
  const box = doc.createElement('div');
  box.className = 'ad-preview-box';

  const title = doc.createElement('strong');
  title.textContent = `Quality Ad Preview · ${bucket} (${slotId})`;

  const dims = doc.createElement('span');
  dims.className = 'num';
  dims.textContent =
    bucket === 'desktop'
      ? 'Desktop Rail (>= 1120px) · min 250px'
      : 'Responsive Display (< 1120px) · min 100px';

  box.append(title, dims);
  mountIntoFrame(slotEl, box);
}

function ensureAdSenseScript(doc, win, slotEl, meta) {
  const existing = doc.querySelector?.(
    'script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]'
  );
  if (existing) return existing;

  const script = doc.createElement('script');
  script.src = ADSENSE_SCRIPT_SRC;
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.fetchPriority = 'low';
  script.addEventListener('error', () => {
    slotEl.classList.add('is-unfilled');
    slotEl.hidden = true;
    setOptInStatus(doc, 'Ad script blocked by browser or extension');
    trackAdEvent(win, 'ad_slot_unfilled', {
      ...meta,
      reason: 'script_blocked',
    });
  });
  (doc.head || doc.body || doc.documentElement).appendChild(script);
  return script;
}

export function activateOptInAd({
  university = 'vit',
  trigger = 'user_click',
  doc = document,
  win = window,
} = {}) {
  const preview = isPreviewMode(win?.location?.search || '');
  const slotEl = findOptInSlot(doc);
  const viewportWidth = Number(win?.innerWidth || doc?.documentElement?.clientWidth || 0);
  const slotId = resolveQualitySlotId(slotEl, viewportWidth);

  if (!slotEl || !slotId) {
    return { preview, activated: false, slot: '' };
  }

  slotEl.hidden = false;
  slotEl.classList?.remove('is-inactive');

  if (mountedSlots.has(slotEl)) {
    return { preview, activated: true, reused: true, slot: slotId };
  }

  mountedSlots.add(slotEl);

  if (preview) {
    renderPreviewSlot(slotEl, doc, slotId, viewportWidth);
    return { preview: true, activated: true, slot: slotId };
  }

  const bucket = getViewportBucket(viewportWidth);
  const staging = isStagingHost(win?.location?.hostname || PRODUCTION_HOST);
  const meta = {
    location: slotEl.dataset?.adLocation || slotEl.id || 'optin-quality',
    slot: slotId,
    university,
    viewport_bucket: bucket,
    trigger,
  };

  ensureAdSenseScript(doc, win, slotEl, meta);

  const ins = doc.createElement('ins');
  ins.className = 'adsbygoogle';
  ins.style.display = 'block';
  ins.setAttribute('data-ad-client', AD_CLIENT);
  ins.setAttribute('data-ad-slot', slotId);
  ins.setAttribute('data-ad-format', slotEl.dataset?.adFormat || 'auto');
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
  observeAdStatus(ins, slotEl, meta, doc, win);
  observeAdViewability(slotEl, meta, win);

  return { preview: false, activated: true, slot: slotId };
}

export function hideOptInAd({ doc = document } = {}) {
  const slotEl = findOptInSlot(doc);
  if (!slotEl) return false;
  slotEl.hidden = true;
  return true;
}
