import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AD_CLIENT,
  ADSENSE_SCRIPT_SRC,
  PRODUCTION_HOST,
  getViewportBucket,
  initAdsManager,
  isPreviewMode,
  isStagingHost,
  shouldActivateSlot,
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
    toArray() {
      return Array.from(set);
    },
  };
}

function createFakeElement(tagName, { id = '', dataset = {}, classList = [] } = {}) {
  const attrs = new Map();
  const listeners = new Map();
  const el = {
    tagName: tagName.toUpperCase(),
    id,
    dataset: { ...dataset },
    style: {},
    className: '',
    textContent: '',
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
  return el;
}

function createEnvironment({
  slots = [],
  width = 1440,
  hostname = 'cgpa-staging.rajchandra.me',
  search = '',
  useReplaceChildren = true,
  withObservers = true,
  throwOnPush = false,
  throwOnTrack = false,
} = {}) {
  const headChildren = [];
  const trackEvents = [];
  const mutationObservers = [];
  const intersectionObservers = [];
  const scheduledTimeouts = new Map();
  let nextTimerId = 1;

  for (const s of slots) {
    if (!useReplaceChildren && s.frame) {
      delete s.frame.replaceChildren;
    }
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
    querySelectorAll(sel) {
      if (sel === '.ad-slot[data-ad-slot]') return slots.map((s) => s.slotEl);
      return [];
    },
    querySelector(sel) {
      if (sel.includes('adsbygoogle.js')) {
        return headChildren.find((c) => String(c.src || '').includes('adsbygoogle.js')) || null;
      }
      return null;
    },
  };

  const win = {
    innerWidth: width,
    location: { hostname, search },
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
  };
}

function buildSlot(id, location, slotId, minWidth, { withFrame = true } = {}) {
  const slotEl = createFakeElement('section', {
    id,
    dataset: {
      adLocation: location,
      adSlot: slotId,
      adFormat: 'auto',
      adMinWidth: String(minWidth),
    },
  });
  let frame = null;
  if (withFrame) {
    frame = createFakeElement('div');
    frame.className = 'ad-frame';
    slotEl.appendChild(frame);
  }
  return { slotEl, frame };
}

test('pure helper checks handle viewport gates, preview query, host, and buckets', () => {
  assert.equal(shouldActivateSlot({ dataset: { adMinWidth: '1120' } }, 320), false);
  assert.equal(shouldActivateSlot({ dataset: { adMinWidth: '1120' } }, 768), false);
  assert.equal(shouldActivateSlot({ dataset: { adMinWidth: '1120' } }, 1024), false);
  assert.equal(shouldActivateSlot({ dataset: { adMinWidth: '1120' } }, 1119), false);
  assert.equal(shouldActivateSlot({ dataset: { adMinWidth: '1120' } }, 1120), true);
  assert.equal(shouldActivateSlot({ dataset: { adMinWidth: '1120' } }, 1440), true);
  assert.equal(shouldActivateSlot({ dataset: { adMinWidth: 'abc' } }, 375), true);
  assert.equal(shouldActivateSlot(null, 375), true);

  assert.equal(isPreviewMode('?ads=preview'), true);
  assert.equal(isPreviewMode('?tab=sc&ads=preview'), true);
  assert.equal(isPreviewMode('?tab=sc'), false);
  assert.equal(isPreviewMode(''), false);
  assert.equal(isPreviewMode(null), false);

  assert.equal(isStagingHost('cgpa-staging.rajchandra.me'), true);
  assert.equal(isStagingHost(PRODUCTION_HOST), false);
  assert.equal(isStagingHost(), true);

  assert.equal(getViewportBucket(1440), 'desktop');
  assert.equal(getViewportBucket(1120), 'desktop');
  assert.equal(getViewportBucket(1024), 'tablet');
  assert.equal(getViewportBucket(768), 'tablet');
  assert.equal(getViewportBucket(375), 'mobile');
});

test('initAdsManager returns early when no slots or no eligible slots exist', () => {
  const emptyEnv = createEnvironment({ slots: [] });
  assert.deepEqual(initAdsManager({ doc: emptyEnv.doc, win: emptyEnv.win }), {
    preview: false,
    activated: [],
  });

  const desktopOnly = buildSlot('ad-slot-left-rail', 'left-rail', '7637288848', 1120);
  const mobileEnv = createEnvironment({ slots: [desktopOnly], width: 375 });
  assert.deepEqual(initAdsManager({ doc: mobileEnv.doc, win: mobileEnv.win }), {
    preview: false,
    activated: [],
  });
  assert.equal(desktopOnly.slotEl.classList.contains('is-inactive'), true);
  assert.equal(mobileEnv.headChildren.length, 0);
});

test('Desktop mounts 2 responsive slots once with staging data-adtest="on", telemetry, fill, and viewability', () => {
  const postCalc = buildSlot('ad-slot-post-calc', 'post-calc', '6993669367', 0);
  const leftRail = buildSlot('ad-slot-left-rail', 'left-rail', '7637288848', 1120);
  const env = createEnvironment({ slots: [postCalc, leftRail], width: 1440 });

  const first = initAdsManager({ university: 'vit', doc: env.doc, win: env.win });
  assert.deepEqual(first, { preview: false, activated: ['6993669367', '7637288848'] });
  assert.equal(env.headChildren.length, 1);
  assert.equal(env.headChildren[0].src, ADSENSE_SCRIPT_SRC);
  assert.equal(env.headChildren[0].async, true);
  assert.equal(env.headChildren[0].crossOrigin, 'anonymous');
  assert.equal(env.headChildren[0].fetchPriority, 'low');
  assert.equal(env.win.adsbygoogle.length, 2);

  for (const s of [postCalc, leftRail]) {
    assert.equal(s.frame.children.length, 1);
    const ins = s.frame.children[0];
    assert.equal(ins.getAttribute('data-ad-client'), AD_CLIENT);
    assert.equal(ins.getAttribute('data-full-width-responsive'), 'true');
    assert.equal(ins.getAttribute('data-adtest'), 'on');
  }

  assert.equal(env.trackEvents.length, 2);
  assert.equal(env.trackEvents[0].name, 'ad_slot_requested');
  assert.equal(env.trackEvents[0].props.viewport_bucket, 'desktop');

  // Re-running must never double-push or duplicate script
  const second = initAdsManager({ university: 'vit', doc: env.doc, win: env.win });
  assert.deepEqual(second, { preview: false, activated: [] });
  assert.equal(env.headChildren.length, 1);
  assert.equal(env.win.adsbygoogle.length, 2);

  // MutationObserver: status filled -> ignored status -> status unfilled
  const ins0 = postCalc.frame.children[0];
  ins0.setAttribute('data-ad-status', 'pending');
  env.mutationObservers[0].trigger();
  ins0.setAttribute('data-ad-status', 'filled');
  env.mutationObservers[0].trigger();
  assert.equal(postCalc.slotEl.classList.contains('is-unfilled'), false);
  assert.equal(env.trackEvents.some((e) => e.name === 'ad_slot_filled' && e.props.slot === '6993669367'), true);

  const ins1 = leftRail.frame.children[0];
  ins1.setAttribute('data-ad-status', 'unfilled');
  env.mutationObservers[1].trigger();
  assert.equal(leftRail.slotEl.classList.contains('is-unfilled'), true);
  assert.equal(env.trackEvents.some((e) => e.name === 'ad_slot_unfilled' && e.props.slot === '7637288848'), true);

  // IntersectionObserver dwell cancellation followed by >=1000ms viewable confirmation
  env.intersectionObservers[0].trigger([{ isIntersecting: true, intersectionRatio: 0.6 }]);
  assert.equal(env.scheduledTimeouts.size, 1);
  env.intersectionObservers[0].trigger([{ isIntersecting: false, intersectionRatio: 0 }]);
  assert.equal(env.scheduledTimeouts.size, 0);

  env.intersectionObservers[0].trigger([{ isIntersecting: true, intersectionRatio: 0.8 }]);
  // Duplicate intersecting check keeps existing timer
  env.intersectionObservers[0].trigger([{ isIntersecting: true, intersectionRatio: 0.9 }]);
  assert.equal(env.scheduledTimeouts.size, 1);
  const [{ fn }] = Array.from(env.scheduledTimeouts.values());
  fn();
  assert.equal(env.trackEvents.some((e) => e.name === 'ad_slot_viewable' && e.props.slot === '6993669367'), true);
});

test('Mobile/Tablet skips left-rail and Production omits data-adtest while script block collapses slots', () => {
  const postCalc = buildSlot('ad-slot-post-calc', 'post-calc', '6993669367', 0, { withFrame: false });
  const leftRail = buildSlot('ad-slot-left-rail', 'left-rail', '7637288848', 1120);
  const env = createEnvironment({
    slots: [postCalc, leftRail],
    width: 1024,
    hostname: PRODUCTION_HOST,
    withObservers: false,
    throwOnPush: true,
    throwOnTrack: true,
  });

  const res = initAdsManager({ university: 'ktu', doc: env.doc, win: env.win });
  assert.deepEqual(res, { preview: false, activated: ['6993669367'] });
  assert.equal(leftRail.slotEl.classList.contains('is-inactive'), true);
  assert.equal(postCalc.slotEl.children[0].getAttribute('data-adtest'), null);

  // Use appendChild path in normal mode too when replaceChildren is absent
  const slotWithFrame = buildSlot('slot-no-rc', 'post-calc', '6993669367', 0);
  const envNoRc = createEnvironment({ slots: [slotWithFrame], width: 768, useReplaceChildren: false });
  assert.deepEqual(initAdsManager({ doc: envNoRc.doc, win: envNoRc.win }), {
    preview: false,
    activated: ['6993669367'],
  });
  assert.equal(slotWithFrame.frame.children.length, 1);

  // Simulate ad-blocker blocking script load
  env.headChildren[0].dispatchEvent('error');
  assert.equal(postCalc.slotEl.classList.contains('is-unfilled'), true);
});

test('?ads=preview renders wireframe boxes cleanly without loading adsbygoogle.js', () => {
  const postCalc = buildSlot('ad-slot-post-calc', 'post-calc', '6993669367', 0);
  const leftRail = buildSlot('ad-slot-left-rail', 'left-rail', '7637288848', 1120);
  const desktopPreview = createEnvironment({
    slots: [postCalc, leftRail],
    width: 1440,
    search: '?ads=preview',
  });

  const outDesktop = initAdsManager({ doc: desktopPreview.doc, win: desktopPreview.win });
  assert.deepEqual(outDesktop, { preview: true, activated: ['6993669367', '7637288848'] });
  assert.equal(desktopPreview.headChildren.length, 0);
  assert.equal(postCalc.frame.children[0].className, 'ad-preview-box');
  assert.equal(leftRail.frame.children[0].className, 'ad-preview-box');

  const mobilePostCalc = buildSlot('ad-slot-post-calc', 'post-calc', '6993669367', 0);
  const mobileLeftRail = buildSlot('ad-slot-left-rail', 'left-rail', '7637288848', 1120);
  const mobilePreview = createEnvironment({
    slots: [mobilePostCalc, mobileLeftRail],
    width: 375,
    search: '?ads=preview',
    useReplaceChildren: false,
  });

  const outMobile = initAdsManager({ doc: mobilePreview.doc, win: mobilePreview.win });
  assert.deepEqual(outMobile, { preview: true, activated: ['6993669367'] });
  assert.equal(mobileLeftRail.slotEl.classList.contains('is-inactive'), true);
});
