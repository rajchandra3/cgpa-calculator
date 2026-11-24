export const AD_CLIENT = 'ca-pub-8598751574376549';
export const PRODUCTION_HOST = 'cgpa-calculator.rajchandra.me';
export const ADSENSE_SCRIPT_SRC =
  `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT}`;

const mountedSlots = new WeakSet();

export function shouldActivateSlot(slotEl, viewportWidth) {
  const minWidth = Number(slotEl?.dataset?.adMinWidth || 0);
  if (!Number.isFinite(minWidth)) return true;
  return viewportWidth >= minWidth;
}

export function isPreviewMode(search = '') {
  if (typeof search !== 'string' || !search) return false;
  return new URLSearchParams(search).get('ads') === 'preview';
}

export function isStagingHost(hostname = '') {
  return hostname !== PRODUCTION_HOST;
}

export function getViewportBucket(viewportWidth) {
  if (viewportWidth >= 1120) return 'desktop';
  if (viewportWidth >= 768) return 'tablet';
  return 'mobile';
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

function getSlotMeta(slotEl, university, viewportWidth) {
  return {
    location: slotEl.dataset.adLocation || slotEl.id || 'unknown',
    slot: slotEl.dataset.adSlot || '',
    university,
    viewport_bucket: getViewportBucket(viewportWidth),
  };
}

function observeAdStatus(insEl, slotEl, meta, win) {
  if (typeof win?.MutationObserver !== 'function') return;

  const observer = new win.MutationObserver(() => {
    const status = insEl.getAttribute('data-ad-status');
    if (status === 'filled') {
      slotEl.classList.remove('is-unfilled');
      trackAdEvent(win, 'ad_slot_filled', meta);
      observer.disconnect();
    } else if (status === 'unfilled') {
      slotEl.classList.add('is-unfilled');
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
  const frame = slotEl.querySelector('.ad-frame') || slotEl;
  if (typeof frame.replaceChildren === 'function') {
    frame.replaceChildren(node);
  } else {
    frame.appendChild(node);
  }
}

function renderPreviewSlot(slotEl, doc) {
  const box = doc.createElement('div');
  box.className = 'ad-preview-box';

  const title = doc.createElement('strong');
  const location = slotEl.dataset.adLocation || slotEl.id || 'slot';
  const slotId = slotEl.dataset.adSlot || 'unconfigured';
  title.textContent = `Ad Preview · ${location} (${slotId})`;

  const dims = doc.createElement('span');
  dims.className = 'num';
  dims.textContent =
    location === 'left-rail'
      ? 'Desktop Rail (>= 1120px) · min 250px'
      : 'Post-Calculator Banner · Responsive';

  box.append(title, dims);
  mountIntoFrame(slotEl, box);
}

function ensureAdSenseScript(doc, win, activeSlots, university, viewportWidth) {
  const existing = doc.querySelector(
    'script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]'
  );
  if (existing) return existing;

  const script = doc.createElement('script');
  script.src = ADSENSE_SCRIPT_SRC;
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.fetchPriority = 'low';
  script.addEventListener('error', () => {
    for (const slotEl of activeSlots) {
      slotEl.classList.add('is-unfilled');
      trackAdEvent(win, 'ad_slot_unfilled', {
        ...getSlotMeta(slotEl, university, viewportWidth),
        reason: 'script_blocked',
      });
    }
  });
  (doc.head || doc.body || doc.documentElement).appendChild(script);
  return script;
}

export function initAdsManager({ university = 'vit', doc = document, win = window } = {}) {
  const slots = Array.from(doc.querySelectorAll('.ad-slot[data-ad-slot]'));
  if (slots.length === 0) return { preview: false, activated: [] };

  const viewportWidth = Number(win.innerWidth || doc.documentElement?.clientWidth || 0);
  const preview = isPreviewMode(win.location?.search || '');
  const staging = isStagingHost(win.location?.hostname || PRODUCTION_HOST);
  const eligible = [];

  for (const slotEl of slots) {
    if (shouldActivateSlot(slotEl, viewportWidth)) {
      slotEl.classList.remove('is-inactive');
      if (!mountedSlots.has(slotEl)) {
        eligible.push(slotEl);
      }
    } else {
      slotEl.classList.add('is-inactive');
    }
  }

  if (eligible.length === 0) return { preview, activated: [] };

  if (preview) {
    for (const slotEl of eligible) {
      mountedSlots.add(slotEl);
      renderPreviewSlot(slotEl, doc);
    }
    return { preview: true, activated: eligible.map((el) => el.dataset.adSlot) };
  }

  ensureAdSenseScript(doc, win, eligible, university, viewportWidth);

  const activated = [];
  for (const slotEl of eligible) {
    mountedSlots.add(slotEl);
    const ins = doc.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', AD_CLIENT);
    ins.setAttribute('data-ad-slot', slotEl.dataset.adSlot);
    ins.setAttribute('data-ad-format', slotEl.dataset.adFormat || 'auto');
    ins.setAttribute('data-full-width-responsive', 'true');
    if (staging) {
      ins.setAttribute('data-adtest', 'on');
    }

    mountIntoFrame(slotEl, ins);

    const meta = getSlotMeta(slotEl, university, viewportWidth);
    try {
      win.adsbygoogle = win.adsbygoogle || [];
      win.adsbygoogle.push({});
    } catch {
      // Ignore single-slot push errors so sibling slots still mount
    }

    trackAdEvent(win, 'ad_slot_requested', meta);
    observeAdStatus(ins, slotEl, meta, win);
    observeAdViewability(slotEl, meta, win);
    activated.push(slotEl.dataset.adSlot);
  }

  return { preview: false, activated };
}
