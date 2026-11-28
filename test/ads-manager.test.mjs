import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AD_CLIENT,
  AD_FREE_TTL_MS,
  AD_HIDE_UNTIL_STORAGE_KEY,
  AD_PREF_STORAGE_KEY,
  ADSENSE_SCRIPT_SRC,
  GPT_SCRIPT_SRC,
  PRODUCTION_HOST,
  REWARDED_AD_UNIT_PATH,
  activateAnnouncementAd,
  activateOptInAd,
  formatAdFreeRemaining,
  getAdFreeRemainingMs,
  getAdPreference,
  getViewportBucket,
  grantAdFreePass,
  hideAllManagedAds,
  hideOptInAd,
  initManagedAds,
  isPreviewMode,
  isRewardedAdsConfigured,
  isStagingHost,
  mountManagedSlot,
  requestRewardedAdFree,
  resolveAdFormat,
  resolveQualitySlotId,
  setAdPreference,
} from '../src/js/ads-manager.js';

function createClassList(initial = []) {
  const set = new Set(initial);
  return {
    add(...names) {
      for (const n of names) set.add(n);
    },
    remove(...names) {
      for (const n of names) set.delete(n);
    },
    contains(name) {
      return set.has(name);
    },
  };
}

function createFakeElement(
  tagName,
  { id = '', dataset = {}, classList = [], hidden = false, offsetWidth, clientWidth } = {}
) {
  const attrs = new Map();
  const listeners = new Map();
  const el = {
    tagName: tagName.toUpperCase(),
    id,
    dataset: { ...dataset },
    style: {},
    className: '',
    textContent: '',
    hidden,
    children: [],
    classList: createClassList(classList),
    setAttribute(name, value) {
      attrs.set(name, String(value));
    },
    getAttribute(name) {
      return attrs.get(name) ?? null;
    },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    dispatchEvent(type) {
      for (const fn of listeners.get(type) || []) fn({});
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    append(...nodes) {
      this.children.push(...nodes);
    },
    replaceChildren(...nodes) {
      this.children = [...nodes];
    },
    querySelector(sel) {
      if (sel === '.ad-frame') {
        return this.children.find((c) => c.className === 'ad-frame') || null;
      }
      return null;
    },
  };
  if (offsetWidth !== undefined) el.offsetWidth = offsetWidth;
  if (clientWidth !== undefined) el.clientWidth = clientWidth;
  return el;
}

function createOptInSlot({
  id = 'ad-slot-optin',
  location = 'left-rail-primary',
  desktopSlot = '7637288848',
  mobileSlot = '6993669367',
  legacySlot = '',
  adLoad = 'eager',
  adMinWidth = '',
  adFormat = 'auto',
  adFormatDesktop = '',
  adFormatMobile = '',
  managed = true,
  withFrame = true,
  frameClientWidth,
  offsetWidth,
  hidden = true,
  classList = ['is-inactive'],
} = {}) {
  const dataset = {
    adLocation: location,
    adFormat,
  };
  if (desktopSlot) dataset.adSlotDesktop = desktopSlot;
  if (mobileSlot) dataset.adSlotMobile = mobileSlot;
  if (legacySlot) dataset.adSlot = legacySlot;
  if (adLoad) dataset.adLoad = adLoad;
  if (adMinWidth) dataset.adMinWidth = adMinWidth;
  if (adFormatDesktop) dataset.adFormatDesktop = adFormatDesktop;
  if (adFormatMobile) dataset.adFormatMobile = adFormatMobile;
  if (managed) dataset.adManaged = 'true';

  const slotEl = createFakeElement('section', { id, dataset, hidden, classList, offsetWidth });
  let frame = null;
  if (withFrame) {
    frame = createFakeElement('div', { clientWidth: frameClientWidth });
    frame.className = 'ad-frame';
    slotEl.appendChild(frame);
  }
  return { slotEl, frame };
}

function createEnvironment({
  slot = null,
  managedSlots = null,
  statusEl = null,
  width = 1440,
  hostname = 'cgpa-staging.rajchandra.me',
  search = '',
  useReplaceChildren = true,
  withObservers = true,
  withGetElementById = true,
  existingScript = false,
  existingGptScript = false,
  throwOnPush = false,
  throwOnTrack = false,
  storageThrows = false,
} = {}) {
  const headChildren = [];
  if (existingScript) {
    headChildren.push({ src: ADSENSE_SCRIPT_SRC });
  }
  if (existingGptScript) {
    headChildren.push({ src: GPT_SCRIPT_SRC });
  }
  const trackEvents = [];
  const mutationObservers = [];
  const intersectionObservers = [];
  const scheduledTimeouts = new Map();
  const storageMap = new Map();
  let nextTimerId = 1;

  if (slot?.frame && !useReplaceChildren) {
    delete slot.frame.replaceChildren;
  }

  const allSlots = managedSlots || (slot ? [slot.slotEl] : []);

  const doc = {
    documentElement: { clientWidth: width },
    head: {
      appendChild(node) {
        headChildren.push(node);
        return node;
      },
    },
    createElement(tag) {
      return createFakeElement(tag);
    },
    querySelectorAll(sel) {
      if (sel === '.ad-slot[data-ad-managed="true"]') {
        return allSlots;
      }
      return [];
    },
    querySelector(sel) {
      if (
        sel === '.ad-slot[data-ad-location="optin-quality"]' ||
        sel === '.ad-slot[data-ad-location="left-rail-primary"]'
      ) {
        return slot ? slot.slotEl : null;
      }
      if (sel.includes('adsbygoogle.js')) {
        return headChildren.find((c) => String(c.src || '').includes('adsbygoogle.js')) || null;
      }
      if (sel.includes('gpt.js')) {
        return headChildren.find((c) => String(c.src || '').includes('gpt.js')) || null;
      }
      return null;
    },
  };

  if (withGetElementById) {
    doc.getElementById = (id) => {
      if (id === 'ad-slot-optin') return slot ? slot.slotEl : null;
      if (id === 'ad-optin-status') return statusEl;
      return allSlots.find((s) => s.id === id) || null;
    };
  }

  const win = {
    innerWidth: width,
    location: { hostname, search },
    localStorage: {
      getItem(k) {
        if (storageThrows) throw new Error('blocked');
        return storageMap.has(k) ? storageMap.get(k) : null;
      },
      setItem(k, v) {
        if (storageThrows) throw new Error('blocked');
        storageMap.set(k, String(v));
      },
      removeItem(k) {
        if (storageThrows) throw new Error('blocked');
        storageMap.delete(k);
      },
    },
    adsbygoogle: throwOnPush
      ? {
          push() {
            throw new Error('push failed');
          },
        }
      : [],
    track(name, props) {
      if (throwOnTrack) throw new Error('track failed');
      trackEvents.push({ name, props });
    },
    setTimeout(fn, delay) {
      const id = nextTimerId++;
      scheduledTimeouts.set(id, { fn, delay });
      return id;
    },
    clearTimeout(id) {
      scheduledTimeouts.delete(id);
    },
  };

  if (withObservers) {
    win.MutationObserver = class {
      constructor(cb) {
        this.cb = cb;
        this.disconnected = false;
        mutationObservers.push(this);
      }
      observe(target) {
        this.target = target;
      }
      trigger() {
        if (!this.disconnected) this.cb([]);
      }
      disconnect() {
        this.disconnected = true;
      }
    };

    win.IntersectionObserver = class {
      constructor(cb, opts) {
        this.cb = cb;
        this.opts = opts;
        this.disconnected = false;
        this.observed = [];
        intersectionObservers.push(this);
      }
      observe(target) {
        this.target = target;
        this.observed.push(target);
      }
      unobserve(target) {
        this.observed = this.observed.filter((t) => t !== target);
      }
      trigger(entries) {
        if (!this.disconnected) this.cb(entries);
      }
      disconnect() {
        this.disconnected = true;
      }
    };
  }

  return {
    doc,
    win,
    headChildren,
    trackEvents,
    mutationObservers,
    intersectionObservers,
    scheduledTimeouts,
    storageMap,
  };
}

test('pure helpers cover viewport buckets, preview flag, host checks, slot/format resolution, and 24h TTL storage preference', () => {
  assert.equal(AD_PREF_STORAGE_KEY, 'cgpa_ad_optin');
  assert.equal(AD_HIDE_UNTIL_STORAGE_KEY, 'cgpa_ad_hide_until');
  assert.equal(AD_FREE_TTL_MS, 24 * 60 * 60 * 1000);
  assert.equal(REWARDED_AD_UNIT_PATH, '');

  assert.equal(getViewportBucket(1440), 'desktop');
  assert.equal(getViewportBucket(1120), 'desktop');
  assert.equal(getViewportBucket(1024), 'tablet');
  assert.equal(getViewportBucket(768), 'tablet');
  assert.equal(getViewportBucket(375), 'mobile');

  assert.equal(isPreviewMode('?ads=preview'), true);
  assert.equal(isPreviewMode('?tab=sc&ads=preview'), true);
  assert.equal(isPreviewMode('?tab=sc'), false);
  assert.equal(isPreviewMode(''), false);
  assert.equal(isPreviewMode(null), false);

  assert.equal(isStagingHost('cgpa-staging.rajchandra.me'), true);
  assert.equal(isStagingHost(PRODUCTION_HOST), false);
  assert.equal(isStagingHost(), true);

  const dualSlot = { dataset: { adSlotDesktop: '7637288848', adSlotMobile: '6993669367' } };
  assert.equal(resolveQualitySlotId(dualSlot, 1440), '7637288848');
  assert.equal(resolveQualitySlotId(dualSlot, 1120), '7637288848');
  assert.equal(resolveQualitySlotId(dualSlot, 1119), '6993669367');
  assert.equal(resolveQualitySlotId(dualSlot, 375), '6993669367');
  assert.equal(resolveQualitySlotId({ dataset: { adSlot: 'fallback' } }, 1440), 'fallback');
  assert.equal(resolveQualitySlotId({ dataset: { adSlot: 'fallback' } }, 375), 'fallback');
  assert.equal(resolveQualitySlotId({ dataset: {} }, 375), '');
  assert.equal(resolveQualitySlotId(null, 1440), '');

  // adMinWidth and desktop-only gating
  const desktopOnly = createFakeElement('section', {
    dataset: { adSlotDesktop: '7637288848' },
    classList: ['ad-slot--desktop-only'],
  });
  assert.equal(resolveQualitySlotId(desktopOnly, 1440), '7637288848');
  assert.equal(resolveQualitySlotId(desktopOnly, 768), '');

  const minWidthSlot = createFakeElement('section', {
    dataset: { adSlot: '4654433674', adMinWidth: '1280' },
  });
  assert.equal(resolveQualitySlotId(minWidthSlot, 1280), '4654433674');
  assert.equal(resolveQualitySlotId(minWidthSlot, 1279), '');

  // Format resolution
  assert.equal(resolveAdFormat(null, 1440), 'auto');
  assert.equal(
    resolveAdFormat({ dataset: { adFormatDesktop: 'vertical', adFormatMobile: 'auto' } }, 1440),
    'vertical'
  );
  assert.equal(
    resolveAdFormat({ dataset: { adFormatDesktop: 'horizontal', adFormatMobile: 'auto' } }, 375),
    'auto'
  );
  assert.equal(resolveAdFormat({ dataset: { adFormat: 'rectangle' } }, 1200), 'rectangle');
  assert.equal(resolveAdFormat({ dataset: {} }, 375), 'auto');

  // Remaining time formatting
  assert.equal(formatAdFreeRemaining(0), '');
  assert.equal(formatAdFreeRemaining(Number.NaN), '');
  assert.equal(formatAdFreeRemaining(30 * 60 * 1000), '< 1h left');
  assert.equal(formatAdFreeRemaining(12 * 3600 * 1000), '12h left');

  // 24h TTL + legacy preference handling
  const env = createEnvironment();
  const baseNow = 1_700_000_000_000;
  assert.equal(getAdPreference(env.win, baseNow), true);
  assert.equal(getAdFreeRemainingMs(env.win, baseNow), 0);

  // Legacy '0' still disables ads
  env.storageMap.set(AD_PREF_STORAGE_KEY, '0');
  assert.equal(getAdPreference(env.win, baseNow), false);

  // setAdPreference(false) stores 24h expiry and removes permanent '0'
  setAdPreference(env.win, false, { ttlMs: AD_FREE_TTL_MS, now: baseNow });
  assert.equal(env.storageMap.get(AD_HIDE_UNTIL_STORAGE_KEY), String(baseNow + AD_FREE_TTL_MS));
  assert.equal(env.storageMap.has(AD_PREF_STORAGE_KEY), false);
  assert.equal(getAdFreeRemainingMs(env.win, baseNow + 1000), AD_FREE_TTL_MS - 1000);
  assert.equal(getAdPreference(env.win, baseNow + 1000), false);

  // After 24h TTL expires, ads re-enable and cleanup storage key
  assert.equal(getAdFreeRemainingMs(env.win, baseNow + AD_FREE_TTL_MS + 1), 0);
  assert.equal(env.storageMap.has(AD_HIDE_UNTIL_STORAGE_KEY), false);
  assert.equal(getAdPreference(env.win, baseNow + AD_FREE_TTL_MS + 1), true);

  // grantAdFreePass with invalid ttl fallback logs telemetry
  const pass = grantAdFreePass({ win: env.win, ttlMs: -5, now: baseNow, source: 'gpt_rewarded' });
  assert.equal(pass.ttlMs, AD_FREE_TTL_MS);
  assert.equal(pass.until, baseNow + AD_FREE_TTL_MS);
  assert.equal(env.trackEvents.at(-1).name, 'ad_free_pass_granted');
  assert.equal(env.trackEvents.at(-1).props.ttl_hours, 24);
  assert.equal(env.trackEvents.at(-1).props.source, 'gpt_rewarded');

  // setAdPreference(true) clears TTL
  setAdPreference(env.win, true);
  assert.equal(env.storageMap.get(AD_PREF_STORAGE_KEY), '1');
  assert.equal(env.storageMap.has(AD_HIDE_UNTIL_STORAGE_KEY), false);
  assert.equal(getAdPreference(env.win, baseNow), true);

  // Missing storage & storage throws
  setAdPreference({ }, true);
  setAdPreference(env.win, false, { ttlMs: -1, now: baseNow });
  const blockedEnv = createEnvironment({ storageThrows: true });
  assert.equal(getAdFreeRemainingMs(blockedEnv.win, baseNow), 0);
  assert.equal(getAdPreference(blockedEnv.win, baseNow), true);
  assert.doesNotThrow(() => setAdPreference(blockedEnv.win, true));
});

test('GPT Rewarded Ad hook handles unconfigured default, ready/granted/closed, unsupported, and blocked script', async () => {
  assert.equal(isRewardedAdsConfigured(''), false);
  assert.equal(isRewardedAdsConfigured('/12345678/cgpa_rewarded_24h'), true);

  const unconfigured = await requestRewardedAdFree();
  assert.deepEqual(unconfigured, { supported: false, granted: false, reason: 'not_configured' });

  // Script blocked resolves gracefully
  const errEnv = createEnvironment();
  const blockedPromise = requestRewardedAdFree({
    unitPath: '/12345678/cgpa_rewarded_24h',
    doc: errEnv.doc,
    win: errEnv.win,
  });
  errEnv.headChildren[0].dispatchEvent('error');
  assert.deepEqual(await blockedPromise, { supported: true, granted: false, reason: 'script_blocked' });

  // Unsupported slot (defineOutOfPageSlot returns null)
  const unsupEnv = createEnvironment({ existingGptScript: true });
  unsupEnv.win.googletag = {
    cmd: {
      push(fn) {
        fn();
      },
    },
    enums: { OutOfPageFormat: { REWARDED: 'REWARDED' } },
    defineOutOfPageSlot: () => null,
  };
  assert.deepEqual(
    await requestRewardedAdFree({
      unitPath: '/12345678/cgpa_rewarded_24h',
      doc: unsupEnv.doc,
      win: unsupEnv.win,
    }),
    { supported: true, granted: false, reason: 'unsupported' }
  );

  // Granted flow
  const grantEnv = createEnvironment();
  const listeners = new Map();
  let visibleCalled = false;
  let destroyedSlots = null;
  const fakeSlot = { addService() {} };
  const pubadsObj = {
    addEventListener(name, fn) {
      listeners.set(name, fn);
    },
  };
  const grantPromise = requestRewardedAdFree({
    unitPath: '/12345678/cgpa_rewarded_24h',
    doc: grantEnv.doc,
    win: grantEnv.win,
    now: 5000,
  });
  grantEnv.win.googletag = {
    enums: { OutOfPageFormat: { REWARDED: 'REWARDED' } },
    defineOutOfPageSlot: () => fakeSlot,
    pubads: () => pubadsObj,
    enableServices() {},
    display() {
      listeners.get('rewardedSlotReady')({ makeRewardedVisible: () => (visibleCalled = true) });
      listeners.get('rewardedSlotGranted')();
      listeners.get('rewardedSlotClosed')();
    },
    destroySlots(slots) {
      destroyedSlots = slots;
    },
  };
  for (const fn of []) fn();
  // Drain queued cmd when googletag loaded
  assert.equal(Array.isArray(grantEnv.win.googletag.cmd), false);
  // Queue directly via existing googletag mock
  const grantEnv2 = createEnvironment({ existingGptScript: true });
  const l2 = new Map();
  grantEnv2.win.googletag = {
    cmd: {
      push(fn) {
        fn();
      },
    },
    enums: { OutOfPageFormat: { REWARDED: 'REWARDED' } },
    defineOutOfPageSlot: () => fakeSlot,
    pubads: () => ({
      addEventListener(name, fn) {
        l2.set(name, fn);
      },
    }),
    enableServices() {},
    display() {
      l2.get('rewardedSlotReady')({ makeRewardedVisible: () => (visibleCalled = true) });
      l2.get('rewardedSlotGranted')();
      l2.get('rewardedSlotClosed')();
    },
    destroySlots(slots) {
      destroyedSlots = slots;
    },
  };
  const grantedRes = await requestRewardedAdFree({
    unitPath: '/12345678/cgpa_rewarded_24h',
    doc: grantEnv2.doc,
    win: grantEnv2.win,
    now: 5000,
  });
  assert.equal(visibleCalled, true);
  assert.deepEqual(destroyedSlots, [fakeSlot]);
  assert.deepEqual(grantedRes, { supported: true, granted: true, until: 5000 + AD_FREE_TTL_MS });
  assert.equal(grantEnv2.storageMap.get(AD_HIDE_UNTIL_STORAGE_KEY), String(5000 + AD_FREE_TTL_MS));
  // Triggering error afterwards hits settled guard safely
  assert.doesNotThrow(() => grantEnv.headChildren[0].dispatchEvent('error'));
  // Avoid unused warning on grantPromise by fulfilling cleanly
  assert.ok(grantPromise);

  // Closed without grant
  const closeEnv = createEnvironment({ existingGptScript: true });
  const l3 = new Map();
  closeEnv.win.googletag = {
    cmd: {
      push(fn) {
        fn();
      },
    },
    enums: { OutOfPageFormat: { REWARDED: 'REWARDED' } },
    defineOutOfPageSlot: () => fakeSlot,
    pubads: () => ({
      addEventListener(name, fn) {
        l3.set(name, fn);
      },
    }),
    enableServices() {},
    display() {
      l3.get('rewardedSlotClosed')();
    },
    destroySlots() {},
  };
  assert.deepEqual(
    await requestRewardedAdFree({
      unitPath: '/12345678/cgpa_rewarded_24h',
      doc: closeEnv.doc,
      win: closeEnv.win,
    }),
    { supported: true, granted: false, reason: 'closed' }
  );
});

test('activateOptInAd and hideOptInAd return safely when slot or slot ID is missing', () => {
  const emptyEnv = createEnvironment({ slot: null });
  assert.deepEqual(activateOptInAd({ doc: emptyEnv.doc, win: emptyEnv.win }), {
    preview: false,
    activated: false,
    slot: '',
  });
  assert.equal(hideOptInAd({ doc: emptyEnv.doc }), false);

  const unconfigured = createOptInSlot({ desktopSlot: '', mobileSlot: '', legacySlot: '' });
  const unconfEnv = createEnvironment({ slot: unconfigured });
  assert.deepEqual(activateOptInAd({ doc: unconfEnv.doc, win: unconfEnv.win }), {
    preview: false,
    activated: false,
    slot: '',
  });
});

test('Desktop opt-in mounts rail slot once with staging data-adtest, status sync, viewability, offsetWidth guard, and hide/re-show', () => {
  // offsetWidth <= 0 hides slot and aborts push
  const hiddenSlot = createOptInSlot({ offsetWidth: 0 });
  const hiddenEnv = createEnvironment({ slot: hiddenSlot, width: 1440 });
  assert.deepEqual(activateOptInAd({ doc: hiddenEnv.doc, win: hiddenEnv.win }), {
    preview: false,
    activated: false,
    slot: '',
  });
  assert.equal(hiddenSlot.slotEl.hidden, true);
  assert.equal(hiddenEnv.win.adsbygoogle.length, 0);

  const slot = createOptInSlot({ adFormatDesktop: 'vertical', offsetWidth: 304 });
  const statusEl = createFakeElement('p', { id: 'ad-optin-status' });
  const env = createEnvironment({ slot, statusEl, width: 1440 });

  const first = activateOptInAd({
    university: 'vit',
    trigger: 'user_click',
    doc: env.doc,
    win: env.win,
  });
  assert.deepEqual(first, { preview: false, activated: true, slot: '7637288848' });
  assert.equal(slot.slotEl.hidden, false);
  assert.equal(slot.slotEl.classList.contains('is-inactive'), false);
  assert.equal(slot.slotEl.classList.contains('is-loading'), true);

  assert.equal(env.headChildren.length, 1);
  assert.equal(env.headChildren[0].src, ADSENSE_SCRIPT_SRC);
  assert.equal(env.headChildren[0].async, true);
  assert.equal(env.headChildren[0].crossOrigin, 'anonymous');
  assert.equal(env.headChildren[0].fetchPriority, 'low');

  const ins = slot.frame.children[0];
  assert.equal(ins.getAttribute('data-ad-client'), AD_CLIENT);
  assert.equal(ins.getAttribute('data-ad-slot'), '7637288848');
  assert.equal(ins.getAttribute('data-ad-format'), 'vertical');
  assert.equal(ins.getAttribute('data-full-width-responsive'), 'true');
  assert.equal(ins.getAttribute('data-adtest'), 'on');
  assert.equal(env.win.adsbygoogle.length, 1);

  assert.equal(env.trackEvents[0].name, 'ad_slot_requested');
  assert.equal(env.trackEvents[0].props.location, 'left-rail-primary');

  // Hide preserves mounted DOM; re-activating reveals without pushing or loading script again
  assert.equal(hideOptInAd({ doc: env.doc }), true);
  assert.equal(slot.slotEl.hidden, true);
  const reused = activateOptInAd({
    university: 'vit',
    trigger: 'user_click',
    doc: env.doc,
    win: env.win,
  });
  assert.deepEqual(reused, { preview: false, activated: true, reused: true, slot: '7637288848' });
  assert.equal(slot.slotEl.hidden, false);
  assert.equal(env.win.adsbygoogle.length, 1);

  // MutationObserver: pending -> filled removes is-loading
  ins.setAttribute('data-ad-status', 'pending');
  env.mutationObservers[0].trigger();
  ins.setAttribute('data-ad-status', 'filled');
  env.mutationObservers[0].trigger();
  assert.equal(slot.slotEl.classList.contains('is-loading'), false);
  assert.equal(slot.slotEl.classList.contains('is-unfilled'), false);
  assert.equal(statusEl.textContent, 'Ad slot active');

  // IntersectionObserver viewability dwell cancellation + confirmation
  env.intersectionObservers[0].trigger([{ isIntersecting: true, intersectionRatio: 0.6 }]);
  env.intersectionObservers[0].trigger([{ isIntersecting: false, intersectionRatio: 0 }]);
  assert.equal(env.scheduledTimeouts.size, 0);
  env.intersectionObservers[0].trigger([{ isIntersecting: true, intersectionRatio: 0.8 }]);
  env.intersectionObservers[0].trigger([{ isIntersecting: true, intersectionRatio: 0.9 }]);
  const [{ fn }] = Array.from(env.scheduledTimeouts.values());
  fn();
  assert.equal(env.trackEvents.some((e) => e.name === 'ad_slot_viewable'), true);

  // Unfilled state on fresh slot sets .is-unfilled and clears .is-loading
  const unfilledSlot = createOptInSlot({ id: 'ad-slot-optin' });
  const unfilledStatus = createFakeElement('p', { id: 'ad-optin-status' });
  const unfilledEnv = createEnvironment({ slot: unfilledSlot, statusEl: unfilledStatus, width: 375 });
  activateOptInAd({ university: 'anna', doc: unfilledEnv.doc, win: unfilledEnv.win });
  unfilledSlot.frame.children[0].setAttribute('data-ad-status', 'unfilled');
  unfilledEnv.mutationObservers[0].trigger();
  assert.equal(unfilledSlot.slotEl.classList.contains('is-unfilled'), true);
  assert.equal(unfilledSlot.slotEl.classList.contains('is-loading'), false);
  assert.equal(unfilledStatus.textContent, 'No ad available right now');
});

test('initManagedAds and hideAllManagedAds orchestrate eager vs scroll-lazy slots across desktop and mobile cleanly', () => {
  const topLeaderboard = createOptInSlot({
    id: 'announcement-banner',
    location: 'announcement-banner',
    legacySlot: '4654433674',
    desktopSlot: '',
    mobileSlot: '',
    adMinWidth: '1280',
    adFormat: 'horizontal',
    adLoad: 'eager',
  });
  const leftPrimary = createOptInSlot({
    id: 'ad-slot-optin',
    location: 'left-rail-primary',
    desktopSlot: '7637288848',
    mobileSlot: '',
    adFormatDesktop: 'vertical',
    adLoad: 'eager',
    classList: ['ad-slot--desktop-only', 'is-inactive'],
  });
  const leftSecondary = createOptInSlot({
    id: 'ad-slot-left-secondary',
    location: 'left-rail-secondary',
    desktopSlot: '7637288848',
    mobileSlot: '',
    adFormatDesktop: 'rectangle',
    adLoad: 'lazy',
    classList: ['ad-slot--desktop-only', 'is-inactive'],
  });
  const postCalc = createOptInSlot({
    id: 'ad-slot-post-calc',
    location: 'post-calc',
    desktopSlot: '4654433674',
    mobileSlot: '6993669367',
    adFormatDesktop: 'horizontal',
    adFormatMobile: 'auto',
    adLoad: 'lazy',
  });
  const footerAd = createOptInSlot({
    id: 'ad-slot-footer',
    location: 'below-faq',
    desktopSlot: '4654433674',
    mobileSlot: '6993669367',
    adFormatDesktop: 'horizontal',
    adFormatMobile: 'auto',
    adLoad: 'lazy',
    offsetWidth: 0, // tests skipped hidden lazy element edge
  });

  // Desktop 1440px: 2 eager slots mount at boot, 2 visible lazy slots observed (footerAd skipped due to offsetWidth=0)
  const deskEnv = createEnvironment({
    slot: leftPrimary,
    managedSlots: [topLeaderboard.slotEl, leftPrimary.slotEl, leftSecondary.slotEl, postCalc.slotEl, footerAd.slotEl],
    width: 1440,
  });
  const deskRes = initManagedAds({ university: 'vit', doc: deskEnv.doc, win: deskEnv.win });
  assert.deepEqual(deskRes, {
    preview: false,
    mountedCount: 2,
    lazyCount: 2,
    slots: ['4654433674', '7637288848'],
  });
  assert.equal(deskEnv.win.adsbygoogle.length, 2);
  assert.equal(footerAd.slotEl.hidden, true);
  assert.equal(leftSecondary.slotEl.classList.contains('is-loading'), true);

  // Scroll IntersectionObserver fires -> mounts leftSecondary and postCalc
  const lazyObs = deskEnv.intersectionObservers.at(-1);
  assert.equal(lazyObs.opts.rootMargin, '200px 0px');
  lazyObs.trigger([
    { isIntersecting: false, target: leftSecondary.slotEl },
    { isIntersecting: true, target: leftSecondary.slotEl },
    { isIntersecting: true, target: postCalc.slotEl },
  ]);
  assert.equal(deskEnv.win.adsbygoogle.length, 4);

  // Re-calling initManagedAds disconnects prior observer cleanly; hideAllManagedAds preserves custom announcements
  initManagedAds({ university: 'vit', doc: deskEnv.doc, win: deskEnv.win });
  topLeaderboard.slotEl.classList.add('is-custom-announcement');
  const hiddenCount = hideAllManagedAds({ doc: deskEnv.doc });
  assert.equal(hiddenCount, 4);
  assert.equal(topLeaderboard.slotEl.hidden, false);
  assert.equal(leftPrimary.slotEl.hidden, true);

  // Mobile 375px without IntersectionObserver: desktop-only & >=1280px slots skipped (0 desktop requests), mobile slots mount directly
  const mobPostCalc = createOptInSlot({
    id: 'ad-slot-post-calc',
    location: 'post-calc',
    desktopSlot: '4654433674',
    mobileSlot: '6993669367',
    adLoad: 'lazy',
  });
  const mobHiddenTop = createOptInSlot({
    id: 'announcement-banner',
    location: 'announcement-banner',
    legacySlot: '4654433674',
    desktopSlot: '',
    mobileSlot: '',
    adMinWidth: '1280',
    adLoad: 'eager',
  });
  const mobDesktopOnly = createOptInSlot({
    id: 'ad-slot-optin',
    location: 'left-rail-primary',
    desktopSlot: '7637288848',
    mobileSlot: '',
    classList: ['ad-slot--desktop-only'],
  });
  const mobEnv = createEnvironment({
    slot: mobDesktopOnly,
    managedSlots: [mobHiddenTop.slotEl, mobDesktopOnly.slotEl, mobPostCalc.slotEl],
    width: 375,
    withObservers: false,
  });
  const mobRes = initManagedAds({ university: 'vit', doc: mobEnv.doc, win: mobEnv.win });
  assert.deepEqual(mobRes, {
    preview: false,
    mountedCount: 1,
    lazyCount: 0,
    slots: ['6993669367'],
  });
  assert.equal(mobHiddenTop.slotEl.hidden, true);
  assert.equal(mobDesktopOnly.slotEl.hidden, true);

  // Fallback when querySelectorAll returns empty -> falls back to findOptInSlot; hideAllManagedAds adds findOptInSlot if missing
  const fallbackOnly = createOptInSlot({ id: 'ad-slot-optin', desktopSlot: '7637288848', adLoad: 'eager' });
  const fbEnv = createEnvironment({ slot: fallbackOnly, managedSlots: [], width: 1440 });
  const fbRes = initManagedAds({ university: 'vit', doc: fbEnv.doc, win: fbEnv.win });
  assert.equal(fbRes.mountedCount, 1);
  assert.equal(hideAllManagedAds({ doc: fbEnv.doc }), 1);
});

test('Production omits data-adtest, supports querySelector/appendChild fallbacks, existing script, and script block handling', () => {
  const slot = createOptInSlot({ withFrame: false });
  const statusEl = createFakeElement('p', { id: 'ad-optin-status' });
  const env = createEnvironment({
    slot,
    statusEl,
    width: 1024,
    hostname: PRODUCTION_HOST,
    withObservers: false,
    throwOnPush: true,
    throwOnTrack: true,
  });

  const res = activateOptInAd({ university: 'ktu', doc: env.doc, win: env.win });
  assert.deepEqual(res, { preview: false, activated: true, slot: '6993669367' });
  assert.equal(slot.slotEl.children[0].getAttribute('data-adtest'), null);

  // Script blocked collapses slot, updates status, and fires ad_slot_unfilled with script_blocked
  env.headChildren[0].dispatchEvent('error');
  assert.equal(slot.slotEl.classList.contains('is-unfilled'), true);
  assert.equal(slot.slotEl.classList.contains('is-loading'), false);
  assert.equal(slot.slotEl.hidden, true);
  assert.equal(statusEl.textContent, 'Ad script blocked by browser or extension');

  // querySelector fallback (without getElementById), existing script, and appendChild without replaceChildren
  const fallbackSlot = createOptInSlot();
  const fallbackEnv = createEnvironment({
    slot: fallbackSlot,
    width: 768,
    useReplaceChildren: false,
    withGetElementById: false,
    existingScript: true,
  });
  assert.deepEqual(activateOptInAd({ doc: fallbackEnv.doc, win: fallbackEnv.win }), {
    preview: false,
    activated: true,
    slot: '6993669367',
  });
  assert.equal(fallbackEnv.headChildren.length, 1);
  assert.equal(fallbackSlot.frame.children.length, 1);

  // Fallbacks for missing win.innerWidth, missing hostname/id/adLocation/adFormat, undefined adsbygoogle, and doc.body/doc.documentElement
  const bodyChildren = [];
  const minimalSlotA = createOptInSlot({ id: '', location: '', mobileSlot: '6993669367' });
  delete minimalSlotA.slotEl.dataset.adLocation;
  delete minimalSlotA.slotEl.dataset.adFormat;
  const bodyEnv = createEnvironment({ slot: minimalSlotA, width: 768 });
  delete bodyEnv.doc.head;
  bodyEnv.doc.body = {
    appendChild(node) {
      bodyChildren.push(node);
      return node;
    },
  };
  bodyEnv.win.innerWidth = 0;
  bodyEnv.win.location = {};
  delete bodyEnv.win.adsbygoogle;
  const bodyRes = activateOptInAd({ doc: bodyEnv.doc, win: bodyEnv.win });
  assert.deepEqual(bodyRes, { preview: false, activated: true, slot: '6993669367' });
  assert.equal(bodyChildren.length, 1);
  assert.equal(bodyEnv.trackEvents[0].props.location, 'managed-slot');
  assert.equal(minimalSlotA.frame.children[0].getAttribute('data-ad-format'), 'auto');
  assert.equal(minimalSlotA.frame.children[0].getAttribute('data-adtest'), null);

  const docElChildren = [];
  const minimalSlotB = createOptInSlot({ id: 'custom-slot', location: '', mobileSlot: '6993669367' });
  delete minimalSlotB.slotEl.dataset.adLocation;
  const docElEnv = createEnvironment({ slot: minimalSlotB, width: 0 });
  delete docElEnv.doc.head;
  docElEnv.doc.documentElement.appendChild = (node) => {
    docElChildren.push(node);
    return node;
  };
  const docElRes = activateOptInAd({ doc: docElEnv.doc, win: docElEnv.win });
  assert.deepEqual(docElRes, { preview: false, activated: true, slot: '6993669367' });
  assert.equal(docElChildren.length, 1);
  assert.equal(docElEnv.trackEvents[0].props.location, 'custom-slot');
  assert.equal(docElEnv.trackEvents[0].props.viewport_bucket, 'mobile');
});

test('?ads=preview renders Preview wireframes for desktop, mobile, and lazy initManagedAds without loading adsbygoogle.js', () => {
  const desktopSlot = createOptInSlot({
    frameClientWidth: 304,
    adFormatDesktop: 'vertical',
  });
  const lazyDesktopSlot = createOptInSlot({
    id: 'ad-slot-post-calc',
    location: 'post-calc',
    desktopSlot: '4654433674',
    mobileSlot: '6993669367',
    adFormatDesktop: 'horizontal',
    adLoad: 'lazy',
  });
  const desktopEnv = createEnvironment({
    slot: desktopSlot,
    managedSlots: [desktopSlot.slotEl, lazyDesktopSlot.slotEl],
    width: 1440,
    search: '?ads=preview',
  });
  const res = initManagedAds({ doc: desktopEnv.doc, win: desktopEnv.win });
  assert.deepEqual(res, {
    preview: true,
    mountedCount: 2,
    lazyCount: 0,
    slots: ['7637288848', '4654433674'],
  });
  assert.equal(desktopEnv.headChildren.length, 0);
  assert.match(
    desktopSlot.frame.children[0].children[0].textContent,
    /Ad Preview · left-rail-primary · desktop \(7637288848\)/
  );
  assert.match(desktopSlot.frame.children[0].children[1].textContent, /304px wide/);

  const mobileSlot = createOptInSlot({ adLoad: '' });
  delete mobileSlot.slotEl.dataset.adLocation;
  const mobileEnv = createEnvironment({
    slot: mobileSlot,
    width: 375,
    search: '?ads=preview',
    useReplaceChildren: false,
  });
  const outMobile = activateOptInAd({ doc: mobileEnv.doc, win: mobileEnv.win });
  assert.deepEqual(outMobile, { preview: true, activated: true, slot: '6993669367' });
  assert.equal(mobileEnv.headChildren.length, 0);
  assert.match(
    mobileSlot.frame.children[0].children[0].textContent,
    /Ad Preview · ad-slot-optin · mobile \(6993669367\)/
  );
});

test('activateAnnouncementAd mounts announcement banner above 1280px, enforces adMinWidth below 1280px, and supports reuse', () => {
  const emptyEnv = createEnvironment({ slot: null });
  assert.deepEqual(activateAnnouncementAd({ doc: emptyEnv.doc, win: emptyEnv.win }), {
    preview: false,
    activated: false,
    slot: '',
  });

  const bannerEl = createFakeElement('section', {
    id: 'announcement-banner',
    dataset: {
      adLocation: 'announcement-banner',
      adSlot: '4654433674',
      adFormat: 'horizontal',
      adMinWidth: '1280',
    },
    classList: ['is-inactive', 'is-custom-announcement'],
  });
  bannerEl.hidden = true;
  const frame = createFakeElement('div');
  frame.className = 'ad-frame';
  bannerEl.appendChild(frame);

  // Below 1280px -> ineligible
  const tabletEnv = createEnvironment({ slot: null, managedSlots: [bannerEl], width: 1024 });
  assert.deepEqual(activateAnnouncementAd({ doc: tabletEnv.doc, win: tabletEnv.win }), {
    preview: false,
    activated: false,
    slot: '',
  });

  // >= 1280px -> mounts once
  const env = createEnvironment({ slot: null, managedSlots: [bannerEl], width: 1440 });
  const first = activateAnnouncementAd({ university: 'vit', doc: env.doc, win: env.win });
  assert.deepEqual(first, { preview: false, activated: true, slot: '4654433674' });
  assert.equal(bannerEl.hidden, false);
  assert.equal(bannerEl.classList.contains('is-custom-announcement'), false);
  assert.equal(frame.children[0].getAttribute('data-ad-slot'), '4654433674');
  assert.equal(frame.children[0].getAttribute('data-ad-format'), 'horizontal');

  const reused = activateAnnouncementAd({ university: 'vit', doc: env.doc, win: env.win });
  assert.deepEqual(reused, { preview: false, activated: true, reused: true, slot: '4654433674' });
  assert.equal(env.win.adsbygoogle.length, 1);

  // querySelector fallback when getElementById missing
  const noIdEnv = createEnvironment({
    slot: null,
    width: 1440,
    hostname: PRODUCTION_HOST,
    withGetElementById: false,
  });
  noIdEnv.doc.querySelector = (sel) => (sel.includes('announcement-banner') ? bannerEl : null);
  assert.equal(activateAnnouncementAd({ doc: noIdEnv.doc, win: noIdEnv.win }).reused, true);
});
