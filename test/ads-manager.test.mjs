import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AD_CLIENT,
  AD_PREF_STORAGE_KEY,
  ADSENSE_SCRIPT_SRC,
  PRODUCTION_HOST,
  activateAnnouncementAd,
  activateOptInAd,
  getAdPreference,
  getViewportBucket,
  hideOptInAd,
  isPreviewMode,
  isStagingHost,
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

function createFakeElement(tagName, { id = '', dataset = {}, classList = [], hidden = false } = {}) {
  const attrs = new Map();
  const listeners = new Map();
  return {
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
}

function createOptInSlot({
  id = 'ad-slot-optin',
  location = 'optin-quality',
  desktopSlot = '7637288848',
  mobileSlot = '6993669367',
  legacySlot = '',
  withFrame = true,
  hidden = true,
  classList = ['is-inactive'],
} = {}) {
  const dataset = {
    adLocation: location,
    adFormat: 'auto',
  };
  if (desktopSlot) dataset.adSlotDesktop = desktopSlot;
  if (mobileSlot) dataset.adSlotMobile = mobileSlot;
  if (legacySlot) dataset.adSlot = legacySlot;

  const slotEl = createFakeElement('section', { id, dataset, hidden, classList });
  let frame = null;
  if (withFrame) {
    frame = createFakeElement('div');
    frame.className = 'ad-frame';
    slotEl.appendChild(frame);
  }
  return { slotEl, frame };
}

function createEnvironment({
  slot = null,
  statusEl = null,
  width = 1440,
  hostname = 'cgpa-staging.rajchandra.me',
  search = '',
  useReplaceChildren = true,
  withObservers = true,
  withGetElementById = true,
  existingScript = false,
  throwOnPush = false,
  throwOnTrack = false,
  storageThrows = false,
} = {}) {
  const headChildren = [];
  if (existingScript) {
    headChildren.push({ src: ADSENSE_SCRIPT_SRC });
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
    querySelector(sel) {
      if (sel === '.ad-slot[data-ad-location="optin-quality"]') {
        return slot ? slot.slotEl : null;
      }
      if (sel.includes('adsbygoogle.js')) {
        return headChildren.find((c) => String(c.src || '').includes('adsbygoogle.js')) || null;
      }
      return null;
    },
  };

  if (withGetElementById) {
    doc.getElementById = (id) => {
      if (id === 'ad-slot-optin') return slot ? slot.slotEl : null;
      if (id === 'ad-optin-status') return statusEl;
      return null;
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
        intersectionObservers.push(this);
      }
      observe(target) {
        this.target = target;
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

test('pure helpers cover viewport buckets, preview flag, host checks, slot resolution, and storage preference', () => {
  assert.equal(AD_PREF_STORAGE_KEY, 'cgpa_ad_optin');
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

  const env = createEnvironment();
  assert.equal(getAdPreference(env.win), true);
  setAdPreference(env.win, false);
  assert.equal(env.storageMap.get(AD_PREF_STORAGE_KEY), '0');
  assert.equal(getAdPreference(env.win), false);
  setAdPreference(env.win, true);
  assert.equal(env.storageMap.get(AD_PREF_STORAGE_KEY), '1');
  assert.equal(getAdPreference(env.win), true);

  const blockedEnv = createEnvironment({ storageThrows: true });
  assert.equal(getAdPreference(blockedEnv.win), true);
  assert.doesNotThrow(() => setAdPreference(blockedEnv.win, true));
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

test('Desktop opt-in mounts 1 rail slot once with staging data-adtest, status sync, viewability, and hide/re-show guard', () => {
  const slot = createOptInSlot();
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

  assert.equal(env.headChildren.length, 1);
  assert.equal(env.headChildren[0].src, ADSENSE_SCRIPT_SRC);
  assert.equal(env.headChildren[0].async, true);
  assert.equal(env.headChildren[0].crossOrigin, 'anonymous');
  assert.equal(env.headChildren[0].fetchPriority, 'low');

  assert.equal(slot.frame.children.length, 1);
  const ins = slot.frame.children[0];
  assert.equal(ins.getAttribute('data-ad-client'), AD_CLIENT);
  assert.equal(ins.getAttribute('data-ad-slot'), '7637288848');
  assert.equal(ins.getAttribute('data-full-width-responsive'), 'true');
  assert.equal(ins.getAttribute('data-adtest'), 'on');
  assert.equal(env.win.adsbygoogle.length, 1);

  assert.equal(env.trackEvents.length, 1);
  assert.deepEqual(env.trackEvents[0], {
    name: 'ad_slot_requested',
    props: {
      location: 'optin-quality',
      slot: '7637288848',
      university: 'vit',
      viewport_bucket: 'desktop',
      trigger: 'user_click',
    },
  });

  // Hide preserves mounted DOM; re-activating reveals without pushing or loading script again
  assert.equal(hideOptInAd({ doc: env.doc }), true);
  assert.equal(slot.slotEl.hidden, true);
  assert.equal(slot.frame.children.length, 1);

  const reused = activateOptInAd({
    university: 'vit',
    trigger: 'user_click',
    doc: env.doc,
    win: env.win,
  });
  assert.deepEqual(reused, { preview: false, activated: true, reused: true, slot: '7637288848' });
  assert.equal(slot.slotEl.hidden, false);
  assert.equal(env.headChildren.length, 1);
  assert.equal(env.win.adsbygoogle.length, 1);

  // MutationObserver: pending -> filled -> unfilled status sync
  ins.setAttribute('data-ad-status', 'pending');
  env.mutationObservers[0].trigger();
  ins.setAttribute('data-ad-status', 'filled');
  env.mutationObservers[0].trigger();
  assert.equal(slot.slotEl.classList.contains('is-unfilled'), false);
  assert.equal(statusEl.textContent, 'Ad slot active');
  assert.equal(env.trackEvents.some((e) => e.name === 'ad_slot_filled' && e.props.slot === '7637288848'), true);

  // IntersectionObserver dwell cancellation followed by >=1000ms viewable confirmation
  env.intersectionObservers[0].trigger([{ isIntersecting: true, intersectionRatio: 0.6 }]);
  assert.equal(env.scheduledTimeouts.size, 1);
  env.intersectionObservers[0].trigger([{ isIntersecting: false, intersectionRatio: 0 }]);
  assert.equal(env.scheduledTimeouts.size, 0);

  env.intersectionObservers[0].trigger([{ isIntersecting: true, intersectionRatio: 0.8 }]);
  env.intersectionObservers[0].trigger([{ isIntersecting: true, intersectionRatio: 0.9 }]);
  assert.equal(env.scheduledTimeouts.size, 1);
  const [{ fn }] = Array.from(env.scheduledTimeouts.values());
  fn();
  assert.equal(env.trackEvents.some((e) => e.name === 'ad_slot_viewable' && e.props.slot === '7637288848'), true);

  // Unfilled state on fresh slot sets .is-unfilled and updates #ad-optin-status
  const unfilledSlot = createOptInSlot({ id: 'ad-slot-optin' });
  const unfilledStatus = createFakeElement('p', { id: 'ad-optin-status' });
  const unfilledEnv = createEnvironment({ slot: unfilledSlot, statusEl: unfilledStatus, width: 375 });
  const mobRes = activateOptInAd({ university: 'anna', doc: unfilledEnv.doc, win: unfilledEnv.win });
  assert.deepEqual(mobRes, { preview: false, activated: true, slot: '6993669367' });
  const mobIns = unfilledSlot.frame.children[0];
  mobIns.setAttribute('data-ad-status', 'unfilled');
  unfilledEnv.mutationObservers[0].trigger();
  assert.equal(unfilledSlot.slotEl.classList.contains('is-unfilled'), true);
  assert.equal(unfilledStatus.textContent, 'No ad available right now');
  assert.equal(unfilledEnv.trackEvents.some((e) => e.name === 'ad_slot_unfilled' && e.props.slot === '6993669367'), true);
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
  assert.equal(bodyEnv.trackEvents[0].props.location, 'optin-quality');
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

test('?ads=preview renders Quality Ad Preview box for desktop and mobile without injecting adsbygoogle.js', () => {
  const desktopSlot = createOptInSlot();
  const desktopEnv = createEnvironment({
    slot: desktopSlot,
    width: 1440,
    search: '?ads=preview',
  });
  const outDesktop = activateOptInAd({ doc: desktopEnv.doc, win: desktopEnv.win });
  assert.deepEqual(outDesktop, { preview: true, activated: true, slot: '7637288848' });
  assert.equal(desktopEnv.headChildren.length, 0);
  assert.equal(desktopSlot.slotEl.hidden, false);
  assert.equal(desktopSlot.frame.children[0].className, 'ad-preview-box');
  assert.equal(desktopSlot.frame.children[0].children[0].textContent, 'Quality Ad Preview · desktop (7637288848)');

  const mobileSlot = createOptInSlot();
  const mobileEnv = createEnvironment({
    slot: mobileSlot,
    width: 375,
    search: '?ads=preview',
    useReplaceChildren: false,
  });
  const outMobile = activateOptInAd({ doc: mobileEnv.doc, win: mobileEnv.win });
  assert.deepEqual(outMobile, { preview: true, activated: true, slot: '6993669367' });
  assert.equal(mobileEnv.headChildren.length, 0);
  assert.equal(mobileSlot.frame.children[0].children[0].textContent, 'Quality Ad Preview · mobile (6993669367)');
});

test('activateAnnouncementAd mounts single fallback banner ad, supports preview, reuse, and never touches opt-in status', () => {
  // Missing slot or empty data-ad-slot returns inactive
  const emptyEnv = createEnvironment({ slot: null });
  assert.deepEqual(activateAnnouncementAd({ doc: emptyEnv.doc, win: emptyEnv.win }), {
    preview: false,
    activated: false,
    slot: '',
  });

  const bannerEl = createFakeElement('section', {
    id: 'announcement-banner',
    dataset: { adLocation: 'announcement-banner', adSlot: '6993669367', adFormat: 'auto' },
    classList: ['is-inactive', 'is-custom-announcement'],
  });
  bannerEl.hidden = true;
  const frame = createFakeElement('div');
  frame.className = 'ad-frame';
  bannerEl.appendChild(frame);

  const statusEl = createFakeElement('p', { id: 'ad-optin-status' });
  statusEl.textContent = 'Ads off · Zero ad scripts loaded';

  const env = createEnvironment({ slot: null, statusEl, width: 1440 });
  env.doc.getElementById = (id) => {
    if (id === 'announcement-banner') return bannerEl;
    if (id === 'ad-optin-status') return statusEl;
    return null;
  };

  const first = activateAnnouncementAd({ university: 'vit', doc: env.doc, win: env.win });
  assert.deepEqual(first, { preview: false, activated: true, slot: '6993669367' });
  assert.equal(bannerEl.hidden, false);
  assert.equal(bannerEl.classList.contains('is-custom-announcement'), false);
  assert.equal(frame.children.length, 1);
  assert.equal(frame.children[0].getAttribute('data-ad-slot'), '6993669367');
  assert.equal(frame.children[0].getAttribute('data-adtest'), 'on');
  assert.equal(env.win.adsbygoogle.length, 1);

  // Second call reuses mounted slot without re-pushing
  const reused = activateAnnouncementAd({ university: 'vit', doc: env.doc, win: env.win });
  assert.deepEqual(reused, { preview: false, activated: true, reused: true, slot: '6993669367' });
  assert.equal(env.win.adsbygoogle.length, 1);

  // Filled/unfilled/error do NOT touch #ad-optin-status
  frame.children[0].setAttribute('data-ad-status', 'filled');
  env.mutationObservers[0].trigger();
  assert.equal(statusEl.textContent, 'Ads off · Zero ad scripts loaded');

  env.headChildren[0].dispatchEvent('error');
  assert.equal(bannerEl.hidden, true);
  assert.equal(statusEl.textContent, 'Ads off · Zero ad scripts loaded');

  // Preview mode & production host / querySelector fallback / throwOnPush
  const previewBanner = createFakeElement('section', {
    id: 'announcement-banner',
    dataset: { adLocation: 'announcement-banner', adSlot: '6993669367' },
  });
  const previewFrame = createFakeElement('div');
  previewFrame.className = 'ad-frame';
  previewBanner.appendChild(previewFrame);
  const previewEnv = createEnvironment({ slot: null, width: 1440, search: '?ads=preview' });
  previewEnv.doc.getElementById = () => previewBanner;
  const previewOut = activateAnnouncementAd({ doc: previewEnv.doc, win: previewEnv.win });
  assert.deepEqual(previewOut, { preview: true, activated: true, slot: '6993669367' });
  assert.equal(previewEnv.headChildren.length, 0);
  assert.match(previewFrame.children[0].children[0].textContent, /Announcement Banner Ad Preview/);

  const prodBanner = createFakeElement('section', {
    id: 'announcement-banner',
    dataset: { adSlot: '6993669367' },
  });
  const prodEnv = createEnvironment({
    slot: null,
    width: 0,
    hostname: PRODUCTION_HOST,
    throwOnPush: true,
    withGetElementById: false,
  });
  prodEnv.doc.querySelector = (sel) => {
    if (sel.includes('announcement-banner')) return prodBanner;
    return null;
  };
  prodEnv.win.innerWidth = 0;
  prodEnv.win.location = {};
  delete prodEnv.win.adsbygoogle;
  const prodOut = activateAnnouncementAd({ doc: prodEnv.doc, win: prodEnv.win });
  assert.deepEqual(prodOut, { preview: false, activated: true, slot: '6993669367' });
  assert.equal(prodBanner.children[0].getAttribute('data-adtest'), null);
  prodBanner.children[0].setAttribute('data-ad-status', 'unfilled');
  prodEnv.mutationObservers[0].trigger();
  assert.equal(prodBanner.classList.contains('is-unfilled'), true);
});
