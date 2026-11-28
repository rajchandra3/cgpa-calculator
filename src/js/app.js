import { getUniversityConfig } from './universities.js';
import {
  calculateAllSemCgpa,
  calculateExpectedMarks,
  calculateGpa,
  calculateQuickCgpa,
  calculateTargetCgpa,
} from './math.js';
import {
  ANNOUNCEMENT_BANNER,
  pickNextPromo,
  renderAnnouncementBanner,
  renderPersonalPromo,
  resolveAnnouncementBanner,
} from './promos.js';

const THEME_STORAGE_KEY = 'color-scheme';
const UI_VERSION_STORAGE_KEY = 'cgpa_ui_version';
const SESSION_CALCS_KEY = 'cgpa_session_calcs';
const SESSION_DWELL_KEY = 'cgpa_session_dwell_sec';
const SESSION_MILESTONES_KEY = 'cgpa_session_milestones';
const LEGACY_THEME_KEYS = ['ui_theme', 'theme'];
const LEGACY_TAB_MAP = Object.freeze({
  qcc: 'gc',
  ascc: 'fc',
  emc: 'ec',
});

const GPA_INITIAL_ROWS = 6;
const GPA_MIN_ROWS = 1;
const GPA_MAX_ROWS = 20;

const SEM_INITIAL_ROWS = 8;
const SEM_MIN_ROWS = 1;
const SEM_MAX_ROWS = 12;

export function resolveTabId(rawTab, availableIds) {
  const list = Array.isArray(availableIds) ? availableIds : [];
  const key = typeof rawTab === 'string' ? rawTab.trim().toLowerCase() : '';
  const mapped = LEGACY_TAB_MAP[key] || key;
  if (mapped && list.includes(mapped)) return mapped;
  if (list.includes('sc')) return 'sc';
  return list[0] || null;
}

export function resolveGiscusTheme(mode) {
  if (mode === 'light') return 'light';
  if (mode === 'dark') return 'dark';
  return 'preferred_color_scheme';
}

export function getScoreBand(tab, score) {
  const num = Number(score);
  if (!Number.isFinite(num)) return 'unknown';
  if (tab === 'ec') {
    if (num >= 90) return '90_plus';
    if (num >= 80) return '80_to_90';
    if (num >= 70) return '70_to_80';
    return 'below_70';
  }
  if (num >= 9) return '9_plus';
  if (num >= 8) return '8_to_9';
  if (num >= 7) return '7_to_8';
  return 'below_7';
}

function safeStorageGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore blocked storage
  }
}

function safeStorageRemove(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore blocked storage
  }
}

function safeSessionGet(key) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionSet(key, value) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Ignore blocked sessionStorage
  }
}

function trackEvent(eventName, props = {}) {
  try {
    if (typeof window === 'undefined') return;
    if (typeof window.track === 'function') {
      window.track(eventName, props);
      return;
    }
    if (!window['ga-disable-G-65WDQ61WWG'] && typeof window.gtag === 'function') {
      const normalized = String(eventName || '')
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 40);
      if (normalized && normalized !== 'page_view') {
        window.gtag('event', normalized, props);
      }
    }
  } catch {
    // Ignore analytics errors
  }
}

function setUserProperties(props = {}) {
  try {
    if (typeof window === 'undefined') return;
    if (typeof window.setAnalyticsUserProperties === 'function') {
      window.setAnalyticsUserProperties(props);
    } else if (!window['ga-disable-G-65WDQ61WWG'] && typeof window.gtag === 'function') {
      window.gtag('set', 'user_properties', props);
    }
  } catch {
    // Ignore analytics errors
  }
}

function readNumberInput(input) {
  if (!input) return '';
  if (input.validity?.badInput) return '__BAD_INPUT__';
  return input.value;
}

function createEl(tag, attrs = {}, text = null) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== null && v !== undefined) {
      node.setAttribute(k, String(v));
    }
  }
  if (text !== null) {
    node.textContent = text;
  }
  return node;
}

function initApp() {
  const universityKey = document.body?.dataset?.university || 'vit';
  const config = getUniversityConfig(universityKey);

  // 1. Live Polite Announcer + Validation / ARIA Sync
  const announcer = document.createElement('div');
  announcer.setAttribute('aria-live', 'polite');
  announcer.classList.add('visually-hidden');
  document.body.append(announcer);

  let announceTimer = null;
  let announcedField = null;
  const flagged = new WeakSet();
  const announced = new WeakSet();
  const dirtyState = new WeakMap();

  let supportsUserInvalid = false;
  try {
    supportsUserInvalid =
      typeof CSS !== 'undefined' &&
      typeof CSS.supports === 'function' &&
      CSS.supports('selector(:user-invalid)');
  } catch {
    supportsUserInvalid = false;
  }

  function linkError(el, shown) {
    const errorId = el?.dataset?.error;
    if (!errorId) return;
    const ids = (el.getAttribute('aria-describedby') || '')
      .split(/\s+/)
      .filter((id) => id && id !== errorId);
    if (shown) ids.push(errorId);
    if (ids.length > 0) {
      el.setAttribute('aria-describedby', ids.join(' '));
    } else {
      el.removeAttribute('aria-describedby');
    }
  }

  function spokenText(node) {
    const copy = node.cloneNode(true);
    copy.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
    copy.querySelectorAll('[role="img"][aria-label]').forEach((n) => {
      n.replaceWith(`${n.getAttribute('aria-label')}: `);
    });
    return copy.textContent.replace(/\s+/g, ' ').trim();
  }

  function announceError(el) {
    const errorId = el?.dataset?.error;
    if (!errorId) return;
    const errorEl = document.getElementById(errorId);
    if (!errorEl) return;
    const labelText = el.labels?.[0] ? `${spokenText(el.labels[0])}: ` : '';
    const message = spokenText(errorEl);
    if (!message) return;
    clearTimeout(announceTimer);
    announcer.textContent = '';
    announcedField = el;
    announceTimer = setTimeout(() => {
      announcer.textContent = labelText + message;
    }, 500);
  }

  function clearErrorState(el) {
    if (!el?.matches?.('input, select, textarea')) return;
    el.classList.remove('user-invalid-fallback', 'user-valid-fallback');
    el.setAttribute('aria-invalid', 'false');
    linkError(el, false);
    flagged.delete(el);
    announced.delete(el);
    dirtyState.delete(el);
    if (announcedField === el) {
      clearTimeout(announceTimer);
      announcer.textContent = '';
    }
  }

  function setControlError(el, { showVisual = true, announce = false } = {}) {
    if (!el?.matches?.('input, select, textarea')) return;
    if (showVisual) {
      el.classList.add('user-invalid-fallback');
      el.classList.remove('user-valid-fallback');
    }
    if (announce && !announced.has(el)) {
      announceError(el);
      announced.add(el);
    }
    el.setAttribute('aria-invalid', 'true');
    linkError(el, showVisual);
    flagged.add(el);
  }

  function syncAria(el, announce = false) {
    if (!el?.matches?.('input, select, textarea')) return;
    let nativeInvalid = false;
    if (supportsUserInvalid) {
      try {
        nativeInvalid = el.matches(':user-invalid');
      } catch {
        nativeInvalid = false;
      }
    }

    const isInvalid = nativeInvalid || el.classList.contains('user-invalid-fallback');
    if (isInvalid) {
      if (announce && !announced.has(el)) {
        announceError(el);
        announced.add(el);
      }
      el.setAttribute('aria-invalid', 'true');
      linkError(el, true);
      flagged.add(el);
    } else if (flagged.has(el) || el.getAttribute('aria-invalid') !== 'true') {
      el.setAttribute('aria-invalid', 'false');
      linkError(el, false);
      flagged.delete(el);
      announced.delete(el);
      if (announcedField === el) {
        clearTimeout(announceTimer);
        announcer.textContent = '';
      }
    }
  }

  function handleValidationInteraction(el, phase) {
    if (!el?.matches?.('input, select, textarea')) return;
    if (el.validity?.valid) {
      el.classList.remove('user-invalid-fallback');
    }
    if (!supportsUserInvalid && el.checkValidity) {
      const state = dirtyState.get(el) || { hasInteracted: false, hasBlurred: false };
      if (phase === 'blur') state.hasBlurred = true;
      else state.hasInteracted = true;
      dirtyState.set(el, state);
      if (state.hasInteracted && state.hasBlurred) {
        const valid = el.validity.valid;
        el.classList.toggle('user-invalid-fallback', !valid);
        el.classList.toggle('user-valid-fallback', valid);
      }
    }
    if (phase === 'input') {
      if (el.hasAttribute('aria-invalid')) syncAria(el, false);
    } else {
      syncAria(el, true);
    }
  }

  document.querySelectorAll('input, select, textarea').forEach((el) => {
    if (!el.hasAttribute('aria-invalid')) {
      el.setAttribute('aria-invalid', 'false');
    }
  });

  document.addEventListener('blur', (e) => handleValidationInteraction(e.target, 'blur'), true);
  document.addEventListener('input', (e) => handleValidationInteraction(e.target, 'input'));
  document.addEventListener('change', (e) => handleValidationInteraction(e.target, 'change'), true);

  document.addEventListener(
    'invalid',
    (e) => {
      const el = e.target;
      if (!el?.matches?.('input, select, textarea')) return;
      announced.add(el);
      if (!supportsUserInvalid) {
        dirtyState.set(el, { hasInteracted: true, hasBlurred: true });
        el.classList.add('user-invalid-fallback');
        el.classList.remove('user-valid-fallback');
      }
      syncAria(el, false);
    },
    true
  );

  document.addEventListener(
    'reset',
    (e) => {
      const form = e.target;
      if (!(form instanceof HTMLFormElement)) return;
      delete form.dataset.submitted;
      setTimeout(() => {
        for (const control of form.elements) {
          if (control.setCustomValidity) control.setCustomValidity('');
          clearErrorState(control);
        }
      });
    },
    true
  );

  // 2. Theme Selector & Persistence
  const themeSelector = document.getElementById('theme-selector');
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const metaColorScheme = document.querySelector('meta[name="color-scheme"]');
  let currentThemeMode = 'system';

  function syncThemeToggleBtn(mode) {
    if (!themeToggleBtn) return;
    themeToggleBtn.dataset.themeMode = mode;
    const labels = {
      system: 'Theme: System (tap for Light)',
      light: 'Theme: Light (tap for Dark)',
      dark: 'Theme: Dark (tap for System)',
    };
    const label = labels[mode] || labels.system;
    themeToggleBtn.setAttribute('aria-label', label);
    themeToggleBtn.setAttribute('title', label);
    themeToggleBtn.querySelectorAll('[data-theme-icon]').forEach((svg) => {
      svg.hidden = svg.getAttribute('data-theme-icon') !== mode;
    });
  }

  function clearLegacyThemeKeys() {
    for (const key of LEGACY_THEME_KEYS) {
      safeStorageRemove(key);
    }
  }

  function syncGiscusTheme(mode) {
    const container = document.getElementById('giscus-container');
    if (!container) return;
    const theme = resolveGiscusTheme(mode);
    const script = container.querySelector('script[src="https://giscus.app/client.js"]');
    if (script) {
      script.setAttribute('data-theme', theme);
    }
    const iframe = container.querySelector('iframe.giscus-frame');
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(
        { giscus: { setConfig: { theme } } },
        'https://giscus.app'
      );
    }
  }

  function applyTheme(mode, { persist = true } = {}) {
    const normalized = mode === 'light' || mode === 'dark' ? mode : 'system';
    currentThemeMode = normalized;
    if (metaColorScheme) {
      metaColorScheme.setAttribute('content', normalized === 'system' ? 'light dark' : normalized);
    }
    if (normalized === 'light' || normalized === 'dark') {
      document.documentElement.dataset.theme = normalized;
    } else {
      delete document.documentElement.dataset.theme;
    }
    if (themeSelector) {
      themeSelector.value = normalized;
    }
    syncThemeToggleBtn(normalized);
    if (persist) {
      clearLegacyThemeKeys();
      if (normalized === 'system') {
        safeStorageRemove(THEME_STORAGE_KEY);
      } else {
        safeStorageSet(THEME_STORAGE_KEY, normalized);
      }
    }
    syncGiscusTheme(normalized);
  }

  function resolveInitialTheme() {
    const stored = safeStorageGet(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      clearLegacyThemeKeys();
      return stored;
    }
    for (const legacyKey of LEGACY_THEME_KEYS) {
      const legacyVal = safeStorageGet(legacyKey);
      if (legacyVal === 'light' || legacyVal === 'dark') {
        safeStorageSet(THEME_STORAGE_KEY, legacyVal);
        clearLegacyThemeKeys();
        return legacyVal;
      }
    }
    clearLegacyThemeKeys();
    return 'system';
  }

  applyTheme(resolveInitialTheme(), { persist: false });

  if (themeSelector) {
    themeSelector.addEventListener('change', (e) => {
      const next = e.target.value;
      applyTheme(next, { persist: true });
      trackEvent('theme_changed', { theme: next, university: config.id });
    });
  }

  if (themeToggleBtn) {
    const themeOrder = ['system', 'light', 'dark'];
    themeToggleBtn.addEventListener('click', () => {
      const idx = themeOrder.indexOf(currentThemeMode);
      const next = themeOrder[(idx + 1) % themeOrder.length];
      applyTheme(next, { persist: true });
      trackEvent('theme_changed', { theme: next, university: config.id });
    });
  }

  window.addEventListener('storage', (e) => {
    if (e.key === THEME_STORAGE_KEY || e.key === null) {
      const next = safeStorageGet(THEME_STORAGE_KEY);
      applyTheme(next === 'light' || next === 'dark' ? next : 'system', { persist: false });
    }
  });

  // Usage-Pattern Calculation Tracker (Submit + Debounced Live Auto-Calc)
  const liveCalcTimers = new Map();
  const lastTrackedCalcSig = new Map();
  let actionAdsUnlocked = false;

  function unlockPostCalcAds(trigger = 'calculation_completed') {
    if (actionAdsUnlocked) return;
    actionAdsUnlocked = true;
    import('./ads-manager.js?v=26')
      .then((mod) => mod.unlockActionAds({ university: config.id, trigger }))
      .catch(() => {
        actionAdsUnlocked = false;
      });
  }

  function cancelPendingLiveCalc(tab) {
    const timer = liveCalcTimers.get(tab);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      liveCalcTimers.delete(tab);
    }
  }

  function clearCalcTracking(tab) {
    if (!tab) {
      for (const timer of liveCalcTimers.values()) {
        window.clearTimeout(timer);
      }
      liveCalcTimers.clear();
      lastTrackedCalcSig.clear();
      return;
    }
    cancelPendingLiveCalc(tab);
    lastTrackedCalcSig.delete(tab);
  }

  function nextSessionCalcIndex() {
    const prev = Number(safeSessionGet(SESSION_CALCS_KEY) || 0);
    const next = Number.isFinite(prev) && prev >= 0 ? Math.floor(prev) + 1 : 1;
    safeSessionSet(SESSION_CALCS_KEY, String(next));
    return next;
  }

  function emitCalculationEvents(tab, eventName, payload, score, trigger) {
    const sessionCalcIndex = nextSessionCalcIndex();
    trackEvent(eventName, { ...payload, trigger });
    trackEvent('calculation_completed', {
      calculator: tab,
      university: config.id,
      trigger,
      score,
      score_band: getScoreBand(tab, score),
      entry_source: entrySource,
      session_calc_index: sessionCalcIndex,
    });
  }

  function recordCalculation(tab, eventName, payload, score, { isSubmit = false, signature = '' } = {}) {
    cancelPendingLiveCalc(tab);
    if (isSubmit) {
      lastTrackedCalcSig.set(tab, signature);
      emitCalculationEvents(tab, eventName, payload, score, 'submit');
      unlockPostCalcAds('submit_calc');
      return;
    }
    if (lastTrackedCalcSig.get(tab) === signature) {
      return;
    }
    const timer = window.setTimeout(() => {
      liveCalcTimers.delete(tab);
      if (lastTrackedCalcSig.get(tab) === signature) return;
      lastTrackedCalcSig.set(tab, signature);
      emitCalculationEvents(tab, eventName, payload, score, 'live');
      unlockPostCalcAds('live_calc');
    }, 800);
    liveCalcTimers.set(tab, timer);
  }

  // Wow-Moment Personal & Affiliate Promo Slot
  const promoSlot = document.getElementById('personal-promo-slot');
  const dismissedPromoIds = new Set();
  let promoDebounceTimer = null;
  let lastResultSignature = '';
  let lastShownPromoId = '';

  function clearPersonalPromo() {
    if (promoDebounceTimer !== null) {
      window.clearTimeout(promoDebounceTimer);
      promoDebounceTimer = null;
    }
    lastResultSignature = '';
    if (promoSlot) {
      renderPersonalPromo(promoSlot, null);
    }
  }

  function applyPersonalPromo({ tab, result, credits, forceShuffle = false }) {
    if (!promoSlot) return;
    const resultSignature = `${tab}:${result}:${credits ?? ''}`;
    if (!forceShuffle && !promoSlot.hidden && resultSignature === lastResultSignature) {
      return;
    }
    const promo = pickNextPromo(
      { tab, university: config.id, result, credits },
      { dismissedIds: dismissedPromoIds, lastPromoId: lastShownPromoId }
    );
    if (!promo) {
      clearPersonalPromo();
      return;
    }
    const rendered = renderPersonalPromo(promoSlot, promo, {
      onCtaClick: (clickedPromo) => {
        trackEvent('promo_clicked', {
          promo_id: clickedPromo.id,
          tab,
          university: config.id,
        });
      },
      onDismiss: (dismissedPromo) => {
        dismissedPromoIds.add(dismissedPromo.id);
        lastResultSignature = '';
        trackEvent('promo_dismissed', {
          promo_id: dismissedPromo.id,
          tab,
          university: config.id,
        });
      },
    });
    if (rendered) {
      lastResultSignature = resultSignature;
      lastShownPromoId = promo.id;
      trackEvent('promo_shown', {
        promo_id: promo.id,
        tab,
        university: config.id,
      });
    }
  }

  function schedulePersonalPromo(ctx, { immediate = false, forceShuffle = immediate } = {}) {
    if (!promoSlot) return;
    if (promoDebounceTimer !== null) {
      window.clearTimeout(promoDebounceTimer);
      promoDebounceTimer = null;
    }
    if (!ctx || !ctx.ok) {
      clearPersonalPromo();
      return;
    }
    if (immediate) {
      applyPersonalPromo({ ...ctx, forceShuffle });
      return;
    }
    promoDebounceTimer = window.setTimeout(() => {
      promoDebounceTimer = null;
      applyPersonalPromo({ ...ctx, forceShuffle });
    }, 350);
  }

  // 3. Tab Navigation & URL Sync
  const tablist = document.querySelector('[role="tablist"]');
  const tabButtons = Array.from(document.querySelectorAll('[role="tab"][data-tab]'));
  const tabMap = new Map();

  for (const btn of tabButtons) {
    const tabId = btn.dataset.tab;
    const panel = tabId ? document.getElementById(tabId) : null;
    if (tabId && panel) {
      tabMap.set(tabId, { button: btn, panel });
    }
  }

  const availableTabIds = Array.from(tabMap.keys());

  function activateTab(rawTabId, { updateHistory = false, scroll = false, trackChange = false } = {}) {
    const target = resolveTabId(rawTabId, availableTabIds);
    if (!target) return null;

    for (const [id, entry] of tabMap.entries()) {
      const selected = id === target;
      entry.button.setAttribute('aria-selected', selected ? 'true' : 'false');
      entry.button.setAttribute('tabindex', selected ? '0' : '-1');
      entry.button.classList.toggle('is-active', selected);
      entry.panel.hidden = !selected;
      entry.panel.classList.toggle('is-active', selected);
    }

    if (scroll) {
      tabMap.get(target)?.button.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    }

    if (updateHistory) {
      const url = new URL(window.location.href);
      if (url.searchParams.get('tab') !== target) {
        url.searchParams.set('tab', target);
        window.history.pushState({ tab: target }, '', url.toString());
      }
    }

    if (trackChange) {
      clearPersonalPromo();
      clearCalcTracking();
      trackEvent('tab_change', { calculator: target, university: config.id });
    }

    return target;
  }

  for (const [id, entry] of tabMap.entries()) {
    entry.button.addEventListener('click', () => {
      activateTab(id, { updateHistory: true, scroll: true, trackChange: true });
    });
  }

  if (tablist) {
    tablist.addEventListener('keydown', (e) => {
      const activeButtons = availableTabIds.map((id) => tabMap.get(id).button);
      const currentIdx = activeButtons.indexOf(document.activeElement);
      if (currentIdx === -1 || activeButtons.length === 0) return;

      let nextIdx = -1;
      if (e.key === 'ArrowRight') nextIdx = (currentIdx + 1) % activeButtons.length;
      else if (e.key === 'ArrowLeft') nextIdx = (currentIdx - 1 + activeButtons.length) % activeButtons.length;
      else if (e.key === 'Home') nextIdx = 0;
      else if (e.key === 'End') nextIdx = activeButtons.length - 1;

      if (nextIdx !== -1) {
        e.preventDefault();
        const nextBtn = activeButtons[nextIdx];
        nextBtn.focus();
        activateTab(nextBtn.dataset.tab, { updateHistory: true, scroll: true, trackChange: true });
      }
    });
  }

  window.addEventListener('popstate', () => {
    const param = new URLSearchParams(window.location.search).get('tab');
    activateTab(param, { updateHistory: false, scroll: true, trackChange: false });
  });

  const initialSearchParams = new URLSearchParams(window.location.search);
  const initialTabParam = initialSearchParams.get('tab');
  const activeTab = activateTab(initialTabParam, {
    updateHistory: false,
    scroll: false,
    trackChange: false,
  });

  const pageTab =
    activeTab ||
    document.querySelector('.mode-tab[aria-current="page"][data-tab]')?.dataset?.tab ||
    'sc';
  const hasCarryForwardParams =
    (pageTab === 'gc' && (initialSearchParams.has('gpa') || initialSearchParams.has('c'))) ||
    (pageTab === 'target' &&
      (initialSearchParams.has('cgpa') || initialSearchParams.has('credits')));
  const entrySource = hasCarryForwardParams ? 'carry_forward' : 'direct';

  trackEvent('page_view', {
    university: config.id,
    calculator: pageTab,
    entry_source: entrySource,
    referrer: document.referrer,
  });

  document.querySelectorAll('a.mode-tab[href][data-tab]').forEach((link) => {
    if (link.getAttribute('aria-current') === 'page') return;
    link.addEventListener('click', () => {
      trackEvent('tool_nav_clicked', {
        from_tab: pageTab,
        to_tab: link.dataset.tab || '',
        university: config.id,
      });
    });
  });

  // Shared UI & Dynamic Row Helpers
  function setBanner(el, message) {
    if (!el) return;
    el.textContent = message || '';
    el.hidden = !message;
  }

  function hideResult(container, valueEl, metaEl, nextActionsEl) {
    if (container) {
      container.hidden = true;
      container.classList.remove('is-warning');
    }
    if (valueEl) valueEl.textContent = '';
    if (metaEl) metaEl.textContent = '';
    if (nextActionsEl) {
      nextActionsEl.hidden = true;
      nextActionsEl.replaceChildren();
    }
  }

  function showResult(container, valueEl, metaEl, valueText, metaText, { scroll = false, warning = false } = {}) {
    if (valueEl) valueEl.textContent = valueText;
    if (metaEl) metaEl.textContent = metaText;
    if (container) {
      container.classList.toggle('is-warning', Boolean(warning));
      container.hidden = false;
    }
    if (scroll) revealElement(container, { smooth: true });
  }

  function renderNextActions(container, actions, fromTab) {
    if (!container) return;
    if (!Array.isArray(actions) || actions.length === 0) {
      container.hidden = true;
      container.replaceChildren();
      return;
    }
    const links = actions.map((item) => {
      const link = createEl(
        'a',
        { class: 'btn btn-subtle btn-next-step', href: item.href },
        item.label
      );
      link.addEventListener('click', () => {
        trackEvent('next_step_clicked', {
          from_tab: fromTab,
          target_action: item.actionName,
          university: config.id,
        });
      });
      return link;
    });
    container.replaceChildren(...links);
    container.hidden = false;
  }

  function revealElement(el, { smooth = false } = {}) {
    if (!el || el.hidden) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    el.scrollIntoView?.({
      behavior: smooth && !reduced ? 'smooth' : 'auto',
      block: 'nearest',
    });
  }

  function wireResetButton(btnId, form, onAfterReset) {
    const btn = document.getElementById(btnId);
    if (!btn || !form) return;
    if (btn.type !== 'reset') {
      btn.addEventListener('click', () => form.reset());
    }
    form.addEventListener('reset', () => {
      setTimeout(onAfterReset);
    });
  }

  function renumberRows({ container, addBtn, minRows, maxRows, labelPrefix, idPrefix, fieldSpecs }) {
    const rows = Array.from(container.querySelectorAll('.row-item'));
    rows.forEach((row, index) => {
      const num = index + 1;
      row.dataset.rowIndex = String(index);
      const indexBadge = row.querySelector('.row-index');
      if (indexBadge) {
        indexBadge.textContent = `#${num}`;
        indexBadge.setAttribute('aria-hidden', 'true');
      }

      for (const spec of fieldSpecs) {
        const control = row.querySelector(`[data-field="${spec.key}"]`);
        const label = row.querySelector(`label[data-field-label="${spec.key}"]`);
        const errorEl = row.querySelector(`p[data-field-error="${spec.key}"]`);
        const controlId = `${idPrefix}-${spec.key}-${num}`;
        const errId = `${idPrefix}-${spec.key}-error-${num}`;

        if (label) {
          label.setAttribute('for', controlId);
          label.textContent = `${labelPrefix} ${num} ${spec.labelSuffix}`;
        }
        if (errorEl) errorEl.id = errId;
        if (control) {
          control.id = controlId;
          control.dataset.error = errId;
          if (control.getAttribute('aria-invalid') === 'true') {
            control.setAttribute('aria-describedby', errId);
          }
        }
      }

      const removeBtn = row.querySelector('.btn-remove');
      if (removeBtn) {
        removeBtn.setAttribute('aria-label', `Remove ${labelPrefix} ${num}`);
        removeBtn.disabled = rows.length <= minRows;
      }
    });

    if (addBtn) {
      addBtn.disabled = rows.length >= maxRows;
    }
  }

  // 4. Semester GPA Calculator (#gpa-form)
  const gpaForm = document.getElementById('gpa-form');
  const gpaRowsContainer = document.getElementById('gpa-rows');
  const addCourseBtn = document.getElementById('add-course-btn');
  const gpaErrorBanner = document.getElementById('gpa-form-error');
  const gpaResultBox = document.getElementById('gpa-result');
  const gpaValueEl = document.getElementById('grades');
  const gpaMetaEl = document.getElementById('gpa-meta');
  const gpaNextActionsEl = document.getElementById('gpa-next-actions');

  const gpaFieldSpecs = [
    { key: 'grade', labelSuffix: 'grade' },
    { key: 'credits', labelSuffix: 'credits' },
  ];

  function renumberGpaRows() {
    if (!gpaRowsContainer) return;
    renumberRows({
      container: gpaRowsContainer,
      addBtn: addCourseBtn,
      minRows: GPA_MIN_ROWS,
      maxRows: GPA_MAX_ROWS,
      labelPrefix: 'Course',
      idPrefix: 'gpa',
      fieldSpecs: gpaFieldSpecs,
    });
  }

  function createCourseRow(index) {
    const num = index + 1;
    const row = createEl('div', { class: 'row-item', 'data-row-index': index });
    const rowIndex = createEl('span', { class: 'row-index', 'aria-hidden': 'true' }, `#${num}`);
    const rowFields = createEl('div', { class: 'row-fields' });

    const gradeField = createEl('div', { class: 'field' });
    const gradeLabel = createEl(
      'label',
      { class: 'visually-hidden', for: `gpa-grade-${num}`, 'data-field-label': 'grade' },
      `Course ${num} grade`
    );
    const gradeSelect = createEl('select', {
      id: `gpa-grade-${num}`,
      name: 'grade[]',
      'data-field': 'grade',
      'data-error': `gpa-grade-error-${num}`,
      'aria-invalid': 'false',
    });
    gradeSelect.appendChild(createEl('option', { value: '' }, 'Choose grade'));
    for (const g of config.grades) {
      gradeSelect.appendChild(createEl('option', { value: String(g.points) }, `${g.label} (${g.points})`));
    }
    const gradeError = createEl(
      'p',
      { id: `gpa-grade-error-${num}`, class: 'field-error', 'data-field-error': 'grade' },
      'Choose a grade.'
    );
    gradeField.append(gradeLabel, gradeSelect, gradeError);

    const creditsField = createEl('div', { class: 'field' });
    const creditsLabel = createEl(
      'label',
      { class: 'visually-hidden', for: `gpa-credits-${num}`, 'data-field-label': 'credits' },
      `Course ${num} credits`
    );
    const creditsSelect = createEl('select', {
      id: `gpa-credits-${num}`,
      name: 'credits[]',
      'data-field': 'credits',
      'data-error': `gpa-credits-error-${num}`,
      'aria-invalid': 'false',
    });
    creditsSelect.appendChild(createEl('option', { value: '' }, 'Credits'));
    for (const c of config.credits) {
      creditsSelect.appendChild(createEl('option', { value: String(c) }, String(c)));
    }
    const creditsError = createEl(
      'p',
      { id: `gpa-credits-error-${num}`, class: 'field-error', 'data-field-error': 'credits' },
      'Choose credits.'
    );
    creditsField.append(creditsLabel, creditsSelect, creditsError);

    const removeBtn = createEl(
      'button',
      { type: 'button', class: 'btn btn-subtle btn-icon btn-remove', 'aria-label': `Remove Course ${num}` },
      '×'
    );

    rowFields.append(gradeField, creditsField);
    row.append(rowIndex, rowFields, removeBtn);
    return row;
  }

  function readGpaRows() {
    if (!gpaRowsContainer) return [];
    return Array.from(gpaRowsContainer.querySelectorAll('.row-item')).map((row) => {
      const gradeSelect = row.querySelector('select[data-field="grade"]');
      const creditsSelect = row.querySelector('select[data-field="credits"]');
      return {
        gradeSelect,
        creditsSelect,
        grade: gradeSelect ? gradeSelect.value : '',
        credits: creditsSelect ? creditsSelect.value : '',
      };
    });
  }

  function evaluateGpa({ isSubmit = false } = {}) {
    const entries = readGpaRows();
    const res = calculateGpa(entries.map(({ grade, credits }) => ({ grade, credits })));

    if (res.ok) {
      entries.forEach(({ gradeSelect, creditsSelect }) => {
        clearErrorState(gradeSelect);
        clearErrorState(creditsSelect);
      });
      setBanner(gpaErrorBanner, '');
      const courseWord = res.courseCount === 1 ? 'course' : 'courses';
      showResult(
        gpaResultBox,
        gpaValueEl,
        gpaMetaEl,
        res.formatted,
        `${res.courseCount} ${courseWord} · ${res.totalCredits} credits · ~${res.percentage}%`,
        { scroll: isSubmit }
      );
      const gpaActions =
        config.id === 'vit'
          ? [
              {
                label: `Check updated CGPA with ${res.formatted} →`,
                href: `/quick-cgpa/?gpa=${encodeURIComponent(res.formatted)}&c=${encodeURIComponent(res.totalCredits)}`,
                actionName: 'carry_to_quick_cgpa',
              },
              {
                label: 'Can I hit my target CGPA? →',
                href: `/target-cgpa/?cgpa=${encodeURIComponent(res.formatted)}&credits=${encodeURIComponent(res.totalCredits)}&uni=vit`,
                actionName: 'plan_target_cgpa',
              },
            ]
          : [
              {
                label: 'Can I hit my target CGPA? →',
                href: `/target-cgpa/?cgpa=${encodeURIComponent(res.formatted)}&credits=${encodeURIComponent(res.totalCredits)}&uni=${encodeURIComponent(config.id)}`,
                actionName: 'plan_target_cgpa',
              },
            ];
      renderNextActions(gpaNextActionsEl, gpaActions, 'sc');
      schedulePersonalPromo(
        { ok: true, tab: 'sc', result: res.gpa, credits: res.totalCredits },
        { immediate: true, forceShuffle: isSubmit }
      );
      recordCalculation(
        'sc',
        'computed_gpa',
        {
          university: config.id,
          gpa: res.gpa,
          courses: res.courseCount,
          credits: res.totalCredits,
        },
        res.gpa,
        { isSubmit, signature: `${res.gpa}:${res.courseCount}:${res.totalCredits}` }
      );
      return res;
    }

    hideResult(gpaResultBox, gpaValueEl, gpaMetaEl, gpaNextActionsEl);
    clearPersonalPromo();
    clearCalcTracking('sc');

    if (!isSubmit) {
      entries.forEach(({ gradeSelect, creditsSelect, grade, credits }) => {
        if ((grade === '' && credits === '') || (grade !== '' && credits !== '')) {
          clearErrorState(gradeSelect);
          clearErrorState(creditsSelect);
        }
      });
      if (!res.invalidRows?.length || gpaForm?.dataset.submitted !== 'true') {
        setBanner(gpaErrorBanner, '');
      } else {
        setBanner(gpaErrorBanner, res.error);
      }
      return res;
    }

    setBanner(gpaErrorBanner, res.error);
    trackEvent('form_validation_error', {
      calculator: 'sc',
      university: config.id,
      error_count: res.invalidRows?.length || 1,
    });
    let firstInvalid = null;
    if (res.invalidRows?.length) {
      const invalidSet = new Set(res.invalidRows);
      entries.forEach(({ gradeSelect, creditsSelect, grade, credits }, idx) => {
        if (!invalidSet.has(idx)) {
          clearErrorState(gradeSelect);
          clearErrorState(creditsSelect);
          return;
        }
        if (grade === '' && gradeSelect) {
          setControlError(gradeSelect, { showVisual: true, announce: false });
          if (!firstInvalid) firstInvalid = gradeSelect;
        } else {
          clearErrorState(gradeSelect);
        }
        if (credits === '' && creditsSelect) {
          setControlError(creditsSelect, { showVisual: true, announce: false });
          if (!firstInvalid) firstInvalid = creditsSelect;
        } else {
          clearErrorState(creditsSelect);
        }
      });
    } else if (entries[0]?.gradeSelect) {
      firstInvalid = entries[0].gradeSelect;
    }

    if (firstInvalid) firstInvalid.focus();
    else revealElement(gpaErrorBanner);
    return res;
  }

  if (gpaRowsContainer && gpaForm) {
    const initialFragment = document.createDocumentFragment();
    for (let i = 0; i < GPA_INITIAL_ROWS; i += 1) {
      initialFragment.appendChild(createCourseRow(i));
    }
    gpaRowsContainer.replaceChildren(initialFragment);
    renumberGpaRows();

    gpaRowsContainer.addEventListener('change', (e) => {
      const row = e.target?.closest?.('.row-item');
      if (row) {
        const gradeSel = row.querySelector('select[data-field="grade"]');
        const creditsSel = row.querySelector('select[data-field="credits"]');
        if (
          gradeSel &&
          creditsSel &&
          ((gradeSel.value === '' && creditsSel.value === '') ||
            (gradeSel.value !== '' && creditsSel.value !== ''))
        ) {
          clearErrorState(gradeSel);
          clearErrorState(creditsSel);
        }
      }
      evaluateGpa({ isSubmit: false });
    });

    gpaRowsContainer.addEventListener('click', (e) => {
      const removeBtn = e.target?.closest?.('.btn-remove');
      if (!removeBtn) return;
      const rows = Array.from(gpaRowsContainer.querySelectorAll('.row-item'));
      if (rows.length <= GPA_MIN_ROWS) return;
      const targetRow = removeBtn.closest('.row-item');
      const idx = rows.indexOf(targetRow);
      targetRow.remove();
      renumberGpaRows();
      const updatedRows = gpaRowsContainer.querySelectorAll('.row-item');
      trackEvent('row_removed', {
        calculator: 'sc',
        row_count: updatedRows.length,
        university: config.id,
      });
      updatedRows[Math.min(idx, updatedRows.length - 1)]
        ?.querySelector('select[data-field="grade"]')
        ?.focus();
      evaluateGpa({ isSubmit: false });
    });

    if (addCourseBtn) {
      addCourseBtn.addEventListener('click', () => {
        const rows = gpaRowsContainer.querySelectorAll('.row-item');
        if (rows.length >= GPA_MAX_ROWS) return;
        const newRow = createCourseRow(rows.length);
        gpaRowsContainer.appendChild(newRow);
        renumberGpaRows();
        trackEvent('row_added', {
          calculator: 'sc',
          row_count: rows.length + 1,
          university: config.id,
        });
        newRow.querySelector('select[data-field="grade"]')?.focus();
      });
    }

    gpaForm.addEventListener('submit', (e) => {
      e.preventDefault();
      gpaForm.dataset.submitted = 'true';
      evaluateGpa({ isSubmit: true });
    });

    wireResetButton('reset-gpa-btn', gpaForm, () => {
      setBanner(gpaErrorBanner, '');
      hideResult(gpaResultBox, gpaValueEl, gpaMetaEl, gpaNextActionsEl);
      clearPersonalPromo();
      clearCalcTracking('sc');
      trackEvent('calculator_reset', { calculator: 'sc', university: config.id });
    });
  }

  // 5. Quick CGPA Calculator (#quick-cgpa-form)
  const quickForm = document.getElementById('quick-cgpa-form');
  const tcInput = document.getElementById('tc');
  const cgpaInput = document.getElementById('cgpa');
  const cInput = document.getElementById('c');
  const gpaInput = document.getElementById('gpa');
  const quickPrefillNote = document.getElementById('quick-prefill-note');
  const quickErrorBanner = document.getElementById('quick-cgpa-error');
  const quickResultBox = document.getElementById('cgpa-result');
  const quickValueEl = document.getElementById('cgpa-msg');
  const quickMetaEl = document.getElementById('cgpa-meta');
  const quickNextActionsEl = document.getElementById('cgpa-next-actions');

  const quickFieldMap = {
    prevCredits: tcInput,
    prevCgpa: cgpaInput,
    semCredits: cInput,
    semGpa: gpaInput,
  };

  function evaluateQuickCgpa({ isSubmit = false } = {}) {
    const inputs = Object.values(quickFieldMap).filter(Boolean);
    const allBlank = inputs.every((el) => !el.validity?.badInput && el.value === '');

    if (!isSubmit && allBlank) {
      hideResult(quickResultBox, quickValueEl, quickMetaEl);
      clearPersonalPromo();
      clearCalcTracking('gc');
      if (quickForm?.dataset.submitted !== 'true') {
        setBanner(quickErrorBanner, '');
      }
      return { ok: false };
    }

    const res = calculateQuickCgpa({
      prevCredits: readNumberInput(tcInput),
      prevCgpa: readNumberInput(cgpaInput),
      semCredits: readNumberInput(cInput),
      semGpa: readNumberInput(gpaInput),
    });

    if (res.ok) {
      inputs.forEach((el) => {
        if (el.validity?.valid) el.classList.remove('user-invalid-fallback');
        syncAria(el, false);
      });
      setBanner(quickErrorBanner, '');
      showResult(
        quickResultBox,
        quickValueEl,
        quickMetaEl,
        res.formatted,
        `${res.totalCredits} total credits · ~${res.percentage}%`,
        { scroll: isSubmit }
      );
      const quickActions = [
        {
          label: `Can I reach my target CGPA from ${res.formatted}? →`,
          href: `/target-cgpa/?cgpa=${encodeURIComponent(res.formatted)}&credits=${encodeURIComponent(res.totalCredits)}&uni=${encodeURIComponent(config.id)}`,
          actionName: 'plan_target_cgpa',
        },
      ];
      if (config.id === 'vit') {
        quickActions.push({
          label: 'Calculate Semester GPA →',
          href: '/',
          actionName: 'go_to_semester_gpa',
        });
      }
      renderNextActions(quickNextActionsEl, quickActions, 'gc');
      schedulePersonalPromo(
        { ok: true, tab: 'gc', result: res.cgpa, credits: res.totalCredits },
        { immediate: isSubmit }
      );
      recordCalculation(
        'gc',
        'computed_qcc',
        {
          university: config.id,
          cgpa: res.cgpa,
          totalCredits: res.totalCredits,
        },
        res.cgpa,
        { isSubmit, signature: `${res.cgpa}:${res.totalCredits}` }
      );
      return res;
    }

    hideResult(quickResultBox, quickValueEl, quickMetaEl, quickNextActionsEl);
    clearPersonalPromo();
    clearCalcTracking('gc');
    if (!isSubmit) return res;

    setBanner(quickErrorBanner, res.error);
    trackEvent('form_validation_error', {
      calculator: 'gc',
      university: config.id,
      error_count: res.invalidFields?.length || 1,
    });
    let firstInvalid = null;
    const invalidSet = new Set(res.invalidFields || []);

    for (const [key, el] of Object.entries(quickFieldMap)) {
      if (!el) continue;
      if (invalidSet.has(key)) {
        setControlError(el, { showVisual: !el.validity.valid, announce: false });
        if (!firstInvalid) firstInvalid = el;
      } else if (el.validity.valid) {
        clearErrorState(el);
      }
    }

    if (firstInvalid) firstInvalid.focus();
    else revealElement(quickErrorBanner);
    return res;
  }

  if (quickForm) {
    const handleQuickChange = () => {
      if (tcInput && cInput && tcInput.validity.valid && cInput.validity.valid) {
        if (Number(tcInput.value) + Number(cInput.value) > 0) {
          if (tcInput.getAttribute('aria-invalid') === 'true') clearErrorState(tcInput);
          if (cInput.getAttribute('aria-invalid') === 'true') clearErrorState(cInput);
        }
      }
      evaluateQuickCgpa({ isSubmit: false });
    };

    quickForm.addEventListener('input', handleQuickChange);
    quickForm.addEventListener('change', handleQuickChange);

    quickForm.addEventListener('submit', (e) => {
      e.preventDefault();
      quickForm.dataset.submitted = 'true';
      evaluateQuickCgpa({ isSubmit: true });
    });

    wireResetButton('reset-qcc-btn', quickForm, () => {
      setBanner(quickErrorBanner, '');
      setBanner(quickPrefillNote, '');
      hideResult(quickResultBox, quickValueEl, quickMetaEl, quickNextActionsEl);
      clearPersonalPromo();
      clearCalcTracking('gc');
      trackEvent('calculator_reset', { calculator: 'gc', university: config.id });
    });

    try {
      const qParams = new URLSearchParams(window.location.search);
      const qGpa = Number(qParams.get('gpa'));
      const qCredits = Number(qParams.get('c'));
      const hasGpa = qParams.has('gpa') && Number.isFinite(qGpa) && qGpa >= 0 && qGpa <= 10;
      const hasCred = qParams.has('c') && Number.isFinite(qCredits) && qCredits >= 0 && qCredits <= 39;
      if (hasGpa && gpaInput && !gpaInput.value) gpaInput.value = String(qGpa);
      if (hasCred && cInput && !cInput.value) cInput.value = String(qCredits);
      if ((hasGpa || hasCred) && quickPrefillNote) {
        const parts = [];
        if (hasGpa) parts.push(`${qGpa.toFixed(2)} GPA`);
        if (hasCred) parts.push(`${qCredits} credits`);
        setBanner(
          quickPrefillNote,
          `Carried forward from Semester GPA (${parts.join(' · ')}) — enter your prior completed credits and CGPA below.`
        );
        trackEvent('prefill_applied', {
          calculator: 'gc',
          university: config.id,
          source_params: hasGpa && hasCred ? 'gpa_credits' : hasGpa ? 'gpa' : 'credits',
        });
      }
    } catch {
      // Ignore query prefill errors
    }
  }

  // 6. Expected Marks Calculator (#expected-marks-form, VIT only)
  const ecForm = document.getElementById('expected-marks-form');
  const ecFieldMap = {
    cat1: document.getElementById('cat1'),
    cat2: document.getElementById('cat2'),
    da: document.getElementById('da'),
    al: document.getElementById('al'),
    lab: document.getElementById('lab'),
    jComp: document.getElementById('j-comp'),
    fat: document.getElementById('fat'),
  };
  const ecErrorBanner = document.getElementById('ec-form-error');
  const ecResultBox = document.getElementById('marks-result');
  const ecValueEl = document.getElementById('marks');
  const ecMetaEl = document.getElementById('marks-meta');
  const ecNextActionsEl = document.getElementById('marks-next-actions');

  function evaluateExpectedMarks({ isSubmit = false } = {}) {
    const inputs = Object.values(ecFieldMap).filter(Boolean);
    const allBlank = inputs.every((el) => !el.validity?.badInput && el.value === '');

    if (!isSubmit && allBlank) {
      hideResult(ecResultBox, ecValueEl, ecMetaEl);
      clearPersonalPromo();
      clearCalcTracking('ec');
      if (ecForm?.dataset.submitted !== 'true') {
        setBanner(ecErrorBanner, '');
      }
      return { ok: false };
    }

    const res = calculateExpectedMarks({
      cat1: readNumberInput(ecFieldMap.cat1),
      cat2: readNumberInput(ecFieldMap.cat2),
      da: readNumberInput(ecFieldMap.da),
      al: readNumberInput(ecFieldMap.al),
      lab: readNumberInput(ecFieldMap.lab),
      jComp: readNumberInput(ecFieldMap.jComp),
      fat: readNumberInput(ecFieldMap.fat),
    });

    if (res.ok) {
      inputs.forEach((el) => {
        if (el.validity?.valid) el.classList.remove('user-invalid-fallback');
        syncAria(el, false);
      });
      setBanner(ecErrorBanner, '');
      showResult(
        ecResultBox,
        ecValueEl,
        ecMetaEl,
        res.formatted,
        `Internals: ${res.internals}/60 · ${res.modeLabel}`,
        { scroll: isSubmit }
      );
      renderNextActions(
        ecNextActionsEl,
        [
          {
            label: 'See how this impacts Semester GPA →',
            href: '/',
            actionName: 'go_to_semester_gpa',
          },
          {
            label: 'Can I still reach my target CGPA? →',
            href: '/target-cgpa/?uni=vit',
            actionName: 'plan_target_cgpa',
          },
        ],
        'ec'
      );
      schedulePersonalPromo({ ok: true, tab: 'ec', result: res.marks }, { immediate: isSubmit });
      recordCalculation(
        'ec',
        'computed_emc',
        {
          university: config.id,
          marks: res.marks,
          internals: res.internals,
          mode: res.modeLabel,
        },
        res.marks,
        { isSubmit, signature: `${res.marks}:${res.internals}:${res.modeLabel}` }
      );
      return res;
    }

    hideResult(ecResultBox, ecValueEl, ecMetaEl, ecNextActionsEl);
    clearPersonalPromo();
    clearCalcTracking('ec');
    if (!isSubmit) return res;

    setBanner(ecErrorBanner, res.error);
    trackEvent('form_validation_error', {
      calculator: 'ec',
      university: config.id,
      error_count: res.invalidFields?.length || 1,
    });
    let firstInvalid = null;
    const invalidSet = new Set(res.invalidFields || []);

    for (const [key, el] of Object.entries(ecFieldMap)) {
      if (!el) continue;
      if (invalidSet.has(key)) {
        setControlError(el, { showVisual: true, announce: false });
        if (!firstInvalid) firstInvalid = el;
      } else if (el.validity.valid) {
        clearErrorState(el);
      }
    }

    if (firstInvalid) firstInvalid.focus();
    else revealElement(ecErrorBanner);
    return res;
  }

  if (ecForm) {
    const handleEcChange = () => evaluateExpectedMarks({ isSubmit: false });
    ecForm.addEventListener('input', handleEcChange);
    ecForm.addEventListener('change', handleEcChange);

    ecForm.addEventListener('submit', (e) => {
      e.preventDefault();
      ecForm.dataset.submitted = 'true';
      evaluateExpectedMarks({ isSubmit: true });
    });

    wireResetButton('reset-ec-btn', ecForm, () => {
      setBanner(ecErrorBanner, '');
      hideResult(ecResultBox, ecValueEl, ecMetaEl, ecNextActionsEl);
      clearPersonalPromo();
      clearCalcTracking('ec');
      trackEvent('calculator_reset', { calculator: 'ec', university: config.id });
    });
  }

  // 7. All-Semester CGPA Calculator (#all-sem-form)
  const allSemForm = document.getElementById('all-sem-form');
  const semRowsContainer = document.getElementById('sem-rows');
  const addSemBtn = document.getElementById('add-sem-btn');
  const allSemErrorBanner = document.getElementById('all-sem-error');
  const allSemResultBox = document.getElementById('fcgpa-result');
  const allSemValueEl = document.getElementById('fcgpa');
  const allSemMetaEl = document.getElementById('fcgpa-meta');
  const allSemNextActionsEl = document.getElementById('fcgpa-next-actions');

  const semFieldSpecs = [
    { key: 'gpa', labelSuffix: 'GPA' },
    { key: 'credits', labelSuffix: 'credits' },
  ];

  function renumberSemRows() {
    if (!semRowsContainer) return;
    renumberRows({
      container: semRowsContainer,
      addBtn: addSemBtn,
      minRows: SEM_MIN_ROWS,
      maxRows: SEM_MAX_ROWS,
      labelPrefix: 'Semester',
      idPrefix: 'sem',
      fieldSpecs: semFieldSpecs,
    });
  }

  function createSemesterRow(index) {
    const num = index + 1;
    const row = createEl('div', { class: 'row-item', 'data-row-index': index });
    const rowIndex = createEl('span', { class: 'row-index', 'aria-hidden': 'true' }, `#${num}`);
    const rowFields = createEl('div', { class: 'row-fields' });

    const gpaField = createEl('div', { class: 'field' });
    const gpaLabel = createEl(
      'label',
      { class: 'visually-hidden', for: `sem-gpa-${num}`, 'data-field-label': 'gpa' },
      `Semester ${num} GPA`
    );
    const gpaEl = createEl('input', {
      type: 'number',
      id: `sem-gpa-${num}`,
      name: 'semGpa[]',
      'data-field': 'gpa',
      inputmode: 'decimal',
      step: 'any',
      min: '0',
      max: '10',
      placeholder: 'GPA (0–10)',
      'data-error': `sem-gpa-error-${num}`,
      'aria-invalid': 'false',
    });
    const gpaError = createEl(
      'p',
      { id: `sem-gpa-error-${num}`, class: 'field-error', 'data-field-error': 'gpa' },
      'Enter a GPA between 0 and 10.'
    );
    gpaField.append(gpaLabel, gpaEl, gpaError);

    const creditsField = createEl('div', { class: 'field' });
    const creditsLabel = createEl(
      'label',
      { class: 'visually-hidden', for: `sem-credits-${num}`, 'data-field-label': 'credits' },
      `Semester ${num} credits`
    );
    const creditsEl = createEl('input', {
      type: 'number',
      id: `sem-credits-${num}`,
      name: 'semCredits[]',
      'data-field': 'credits',
      inputmode: 'decimal',
      step: 'any',
      min: '0',
      max: '32',
      placeholder: 'Credits (0–32)',
      'data-error': `sem-credits-error-${num}`,
      'aria-invalid': 'false',
    });
    const creditsError = createEl(
      'p',
      { id: `sem-credits-error-${num}`, class: 'field-error', 'data-field-error': 'credits' },
      'Enter credits between 0 and 32.'
    );
    creditsField.append(creditsLabel, creditsEl, creditsError);

    const removeBtn = createEl(
      'button',
      { type: 'button', class: 'btn btn-subtle btn-icon btn-remove', 'aria-label': `Remove Semester ${num}` },
      '×'
    );

    rowFields.append(gpaField, creditsField);
    row.append(rowIndex, rowFields, removeBtn);
    return row;
  }

  function readSemRows() {
    if (!semRowsContainer) return [];
    return Array.from(semRowsContainer.querySelectorAll('.row-item')).map((row) => {
      const gpaEl = row.querySelector('input[data-field="gpa"]');
      const creditsEl = row.querySelector('input[data-field="credits"]');
      return {
        gpaEl,
        creditsEl,
        gpa: readNumberInput(gpaEl),
        credits: readNumberInput(creditsEl),
      };
    });
  }

  function evaluateAllSem({ isSubmit = false } = {}) {
    const entries = readSemRows();
    const res = calculateAllSemCgpa(entries.map(({ gpa, credits }) => ({ gpa, credits })));

    if (res.ok) {
      entries.forEach(({ gpaEl, creditsEl }) => {
        if (gpaEl?.validity.valid) clearErrorState(gpaEl);
        if (creditsEl?.validity.valid) clearErrorState(creditsEl);
      });
      setBanner(allSemErrorBanner, '');
      const semWord = res.semesterCount === 1 ? 'semester' : 'semesters';
      showResult(
        allSemResultBox,
        allSemValueEl,
        allSemMetaEl,
        res.formatted,
        `${res.semesterCount} ${semWord} · ${res.totalCredits} credits · ~${res.percentage}%`,
        { scroll: isSubmit }
      );
      const allSemActions = [
        {
          label: `Can I reach my target CGPA from ${res.formatted}? →`,
          href: `/target-cgpa/?cgpa=${encodeURIComponent(res.formatted)}&credits=${encodeURIComponent(res.totalCredits)}&uni=${encodeURIComponent(config.id)}`,
          actionName: 'plan_target_cgpa',
        },
      ];
      if (config.id === 'vit') {
        allSemActions.push({
          label: 'Calculate Semester GPA →',
          href: '/',
          actionName: 'go_to_semester_gpa',
        });
      }
      renderNextActions(allSemNextActionsEl, allSemActions, 'fc');
      schedulePersonalPromo(
        { ok: true, tab: 'fc', result: res.cgpa, credits: res.totalCredits },
        { immediate: isSubmit }
      );
      recordCalculation(
        'fc',
        'computed_ascc',
        {
          university: config.id,
          cgpa: res.cgpa,
          semesters: res.semesterCount,
          totalCredits: res.totalCredits,
        },
        res.cgpa,
        { isSubmit, signature: `${res.cgpa}:${res.semesterCount}:${res.totalCredits}` }
      );
      return res;
    }

    hideResult(allSemResultBox, allSemValueEl, allSemMetaEl, allSemNextActionsEl);
    clearPersonalPromo();
    clearCalcTracking('fc');

    if (!isSubmit) {
      entries.forEach(({ gpaEl, creditsEl, gpa, credits }) => {
        if ((gpa === '' && credits === '') || (gpa !== '' && credits !== '')) {
          if (gpaEl?.validity.valid) clearErrorState(gpaEl);
          if (creditsEl?.validity.valid) clearErrorState(creditsEl);
        }
      });
      if (!res.invalidRows?.length || allSemForm?.dataset.submitted !== 'true') {
        setBanner(allSemErrorBanner, '');
      } else {
        setBanner(allSemErrorBanner, res.error);
      }
      return res;
    }

    setBanner(allSemErrorBanner, res.error);
    trackEvent('form_validation_error', {
      calculator: 'fc',
      university: config.id,
      error_count: res.invalidRows?.length || 1,
    });
    let firstInvalid = null;

    if (res.invalidRows?.length) {
      const invalidSet = new Set(res.invalidRows);
      entries.forEach(({ gpaEl, creditsEl, gpa, credits }, idx) => {
        if (!invalidSet.has(idx)) {
          if (gpaEl?.validity.valid) clearErrorState(gpaEl);
          if (creditsEl?.validity.valid) clearErrorState(creditsEl);
          return;
        }

        const gpaNum = Number(gpa);
        const creditsNum = Number(credits);
        const gpaBad =
          (gpa === '' && credits !== '') ||
          gpa === '__BAD_INPUT__' ||
          (gpa !== '' && (!Number.isFinite(gpaNum) || gpaNum < 0 || gpaNum > 10));
        const creditsBad =
          (credits === '' && gpa !== '') ||
          credits === '__BAD_INPUT__' ||
          (credits !== '' && (!Number.isFinite(creditsNum) || creditsNum < 0 || creditsNum > 32));

        if (gpaBad && gpaEl) {
          setControlError(gpaEl, { showVisual: true, announce: false });
          if (!firstInvalid) firstInvalid = gpaEl;
        } else if (gpaEl?.validity.valid) {
          clearErrorState(gpaEl);
        }

        if (creditsBad && creditsEl) {
          setControlError(creditsEl, { showVisual: true, announce: false });
          if (!firstInvalid) firstInvalid = creditsEl;
        } else if (creditsEl?.validity.valid) {
          clearErrorState(creditsEl);
        }
      });
    } else if (entries[0]?.gpaEl) {
      firstInvalid = entries[0].gpaEl;
    }

    if (firstInvalid) firstInvalid.focus();
    else revealElement(allSemErrorBanner);
    return res;
  }

  if (semRowsContainer && allSemForm) {
    const initialFragment = document.createDocumentFragment();
    for (let i = 0; i < SEM_INITIAL_ROWS; i += 1) {
      initialFragment.appendChild(createSemesterRow(i));
    }
    semRowsContainer.replaceChildren(initialFragment);
    renumberSemRows();

    const handleSemChange = (e) => {
      const row = e.target?.closest?.('.row-item');
      if (row) {
        const gpaEl = row.querySelector('input[data-field="gpa"]');
        const creditsEl = row.querySelector('input[data-field="credits"]');
        if (gpaEl && creditsEl) {
          const gVal = readNumberInput(gpaEl);
          const cVal = readNumberInput(creditsEl);
          if ((gVal === '' && cVal === '') || (gVal !== '' && cVal !== '')) {
            if (gpaEl.validity.valid) clearErrorState(gpaEl);
            if (creditsEl.validity.valid) clearErrorState(creditsEl);
          }
        }
      }
      evaluateAllSem({ isSubmit: false });
    };

    semRowsContainer.addEventListener('input', handleSemChange);
    semRowsContainer.addEventListener('change', handleSemChange);

    semRowsContainer.addEventListener('click', (e) => {
      const removeBtn = e.target?.closest?.('.btn-remove');
      if (!removeBtn) return;
      const rows = Array.from(semRowsContainer.querySelectorAll('.row-item'));
      if (rows.length <= SEM_MIN_ROWS) return;
      const targetRow = removeBtn.closest('.row-item');
      const idx = rows.indexOf(targetRow);
      targetRow.remove();
      renumberSemRows();
      const updatedRows = semRowsContainer.querySelectorAll('.row-item');
      trackEvent('row_removed', {
        calculator: 'fc',
        row_count: updatedRows.length,
        university: config.id,
      });
      updatedRows[Math.min(idx, updatedRows.length - 1)]
        ?.querySelector('input[data-field="gpa"]')
        ?.focus();
      evaluateAllSem({ isSubmit: false });
    });

    if (addSemBtn) {
      addSemBtn.addEventListener('click', () => {
        const rows = semRowsContainer.querySelectorAll('.row-item');
        if (rows.length >= SEM_MAX_ROWS) return;
        const newRow = createSemesterRow(rows.length);
        semRowsContainer.appendChild(newRow);
        renumberSemRows();
        trackEvent('row_added', {
          calculator: 'fc',
          row_count: rows.length + 1,
          university: config.id,
        });
        newRow.querySelector('input[data-field="gpa"]')?.focus();
      });
    }

    allSemForm.addEventListener('submit', (e) => {
      e.preventDefault();
      allSemForm.dataset.submitted = 'true';
      evaluateAllSem({ isSubmit: true });
    });

    wireResetButton('reset-fc-btn', allSemForm, () => {
      setBanner(allSemErrorBanner, '');
      hideResult(allSemResultBox, allSemValueEl, allSemMetaEl, allSemNextActionsEl);
      clearPersonalPromo();
      clearCalcTracking('fc');
      trackEvent('calculator_reset', { calculator: 'fc', university: config.id });
    });
  }

  // 7b. Target CGPA Planner (#target-cgpa-form)
  const targetForm = document.getElementById('target-cgpa-form');
  const targetFieldMap = {
    currentCgpa: document.getElementById('target-current-cgpa'),
    completedCredits: document.getElementById('target-completed-credits'),
    targetCgpa: document.getElementById('target-goal-cgpa'),
    remainingCredits: document.getElementById('target-remaining-credits'),
  };
  const targetPrefillNote = document.getElementById('target-prefill-note');
  const targetErrorBanner = document.getElementById('target-form-error');
  const targetResultBox = document.getElementById('target-result');
  const targetValueEl = document.getElementById('target-required-gpa');
  const targetMetaEl = document.getElementById('target-meta');
  const targetNextActionsEl = document.getElementById('target-next-actions');

  function evaluateTargetCgpa({ isSubmit = false } = {}) {
    const inputs = Object.values(targetFieldMap).filter(Boolean);
    const allBlank = inputs.every((el) => !el.validity?.badInput && el.value === '');

    if (!isSubmit && allBlank) {
      hideResult(targetResultBox, targetValueEl, targetMetaEl, targetNextActionsEl);
      clearPersonalPromo();
      clearCalcTracking('target');
      if (targetForm?.dataset.submitted !== 'true') {
        setBanner(targetErrorBanner, '');
      }
      return { ok: false };
    }

    const res = calculateTargetCgpa({
      currentCgpa: readNumberInput(targetFieldMap.currentCgpa),
      completedCredits: readNumberInput(targetFieldMap.completedCredits),
      targetCgpa: readNumberInput(targetFieldMap.targetCgpa),
      remainingCredits: readNumberInput(targetFieldMap.remainingCredits),
    });

    if (res.ok) {
      inputs.forEach((el) => {
        if (el.validity?.valid) el.classList.remove('user-invalid-fallback');
        syncAria(el, false);
      });
      setBanner(targetErrorBanner, '');

      const isImpossible = res.status === 'impossible';
      const displayVal = isImpossible ? `> 10.00 (${res.formatted})` : res.formatted;
      let metaMsg;
      if (res.status === 'already_achieved') {
        metaMsg = `Already achieved! Even 0.00 GPA keeps your CGPA at or above target across ${res.totalCredits} total credits.`;
      } else if (isImpossible) {
        metaMsg = `Not achievable on a 10-point scale. Max possible CGPA is ${res.maxPossibleFormatted} across ${res.totalCredits} total credits.`;
      } else {
        metaMsg = `Required average GPA across remaining credits · Max possible: ${res.maxPossibleFormatted}`;
      }

      showResult(targetResultBox, targetValueEl, targetMetaEl, displayVal, metaMsg, {
        scroll: isSubmit,
        warning: isImpossible,
      });
      const simLabel = isImpossible
        ? 'Simulate max Semester GPA →'
        : `Simulate ${res.formatted} Semester GPA →`;
      renderNextActions(
        targetNextActionsEl,
        [
          {
            label: simLabel,
            href: '/',
            actionName: 'simulate_semester_gpa',
          },
          {
            label: 'Check Quick CGPA →',
            href: '/quick-cgpa/',
            actionName: 'go_to_quick_cgpa',
          },
        ],
        'target'
      );
      schedulePersonalPromo(
        { ok: true, tab: 'target', result: res.requiredGpa, credits: res.totalCredits },
        { immediate: isSubmit }
      );
      recordCalculation(
        'target',
        'computed_target_cgpa',
        {
          university: config.id,
          required_gpa: res.requiredGpa,
          status: res.status,
          total_credits: res.totalCredits,
        },
        res.requiredGpa,
        { isSubmit, signature: `${res.requiredGpa}:${res.status}:${res.totalCredits}` }
      );
      return res;
    }

    hideResult(targetResultBox, targetValueEl, targetMetaEl, targetNextActionsEl);
    clearPersonalPromo();
    clearCalcTracking('target');
    if (!isSubmit) return res;

    setBanner(targetErrorBanner, res.error);
    trackEvent('form_validation_error', {
      calculator: 'target',
      university: config.id,
      error_count: res.invalidFields?.length || 1,
    });
    let firstInvalid = null;
    const invalidSet = new Set(res.invalidFields || []);
    for (const [key, el] of Object.entries(targetFieldMap)) {
      if (!el) continue;
      if (invalidSet.has(key)) {
        setControlError(el, { showVisual: !el.validity.valid, announce: false });
        if (!firstInvalid) firstInvalid = el;
      } else if (el.validity.valid) {
        clearErrorState(el);
      }
    }
    if (firstInvalid) firstInvalid.focus();
    else revealElement(targetErrorBanner);
    return res;
  }

  if (targetForm) {
    const handleTargetChange = () => evaluateTargetCgpa({ isSubmit: false });
    targetForm.addEventListener('input', handleTargetChange);
    targetForm.addEventListener('change', handleTargetChange);
    targetForm.addEventListener('submit', (e) => {
      e.preventDefault();
      targetForm.dataset.submitted = 'true';
      evaluateTargetCgpa({ isSubmit: true });
    });

    wireResetButton('reset-target-btn', targetForm, () => {
      setBanner(targetErrorBanner, '');
      setBanner(targetPrefillNote, '');
      hideResult(targetResultBox, targetValueEl, targetMetaEl, targetNextActionsEl);
      clearPersonalPromo();
      clearCalcTracking('target');
      trackEvent('calculator_reset', { calculator: 'target', university: config.id });
    });

    try {
      const tParams = new URLSearchParams(window.location.search);
      const tCgpa = Number(tParams.get('cgpa'));
      const tCred = Number(tParams.get('credits'));
      const hasCgpa = tParams.has('cgpa') && Number.isFinite(tCgpa) && tCgpa >= 0 && tCgpa <= 10;
      const hasCred = tParams.has('credits') && Number.isFinite(tCred) && tCred >= 0 && tCred <= 300;
      if (hasCgpa && targetFieldMap.currentCgpa) targetFieldMap.currentCgpa.value = String(tCgpa);
      if (hasCred && targetFieldMap.completedCredits) targetFieldMap.completedCredits.value = String(tCred);
      if ((hasCgpa || hasCred) && targetPrefillNote) {
        const parts = [];
        if (hasCgpa) parts.push(`${tCgpa.toFixed(2)} CGPA`);
        if (hasCred) parts.push(`${tCred} completed credits`);
        setBanner(
          targetPrefillNote,
          `Carried forward (${parts.join(' · ')}) — set your target CGPA and remaining credits.`
        );
        trackEvent('prefill_applied', {
          calculator: 'target',
          university: config.id,
          source_params: hasCgpa && hasCred ? 'cgpa_credits' : hasCgpa ? 'cgpa' : 'credits',
        });
      }
    } catch {
      // Ignore query prefill errors
    }
  }

  // 8. PWA Registration, Install Prompt, Display Mode & Share Button, Footer Year
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/serviceWorker.js').catch((err) => {
        console.error('ServiceWorker registration failed:', err);
      });
    });
  }

  let deferredPrompt = null;
  const installBtn = document.getElementById('install-app-btn');
  if (installBtn) {
    installBtn.hidden = true;
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      installBtn.hidden = true;
      try {
        await deferredPrompt.prompt?.();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult?.outcome === 'accepted') {
          trackEvent('pwa_installed', { university: config.id });
        }
      } catch {
        // Ignore prompt dismissal errors
      }
      deferredPrompt = null;
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) {
      installBtn.hidden = false;
    }
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    if (installBtn) {
      installBtn.hidden = true;
    }
    trackEvent('App Installed', { university: config.id });
  });

  const standaloneQuery = window.matchMedia?.('(display-mode: standalone)');
  let launchMode = 'browser tab';
  if (window.navigator?.standalone === true) {
    launchMode = 'standalone-ios';
  } else if (standaloneQuery?.matches) {
    launchMode = 'standalone';
  }
  setUserProperties({ university: config.id, launch_mode: launchMode, ui_version: 'v2' });
  trackEvent('App Launched', { mode: launchMode, university: config.id });

  const legacyUiLink = document.getElementById('legacy-ui-link');
  if (legacyUiLink) {
    try {
      const currentUrl = new URL(window.location.href);
      if (currentUrl.searchParams.get('ui') === 'v2') {
        safeStorageSet(UI_VERSION_STORAGE_KEY, 'v2');
        currentUrl.searchParams.delete('ui');
        window.history.replaceState({}, '', currentUrl.toString());
      }
    } catch {
      // Ignore URL cleanup errors
    }

    legacyUiLink.addEventListener('click', (e) => {
      e.preventDefault();
      safeStorageSet(UI_VERSION_STORAGE_KEY, 'legacy');
      trackEvent('ui_version_switched', {
        from: 'v2',
        to: 'legacy',
        university: config.id,
      });
      const activeBtn =
        document.querySelector('[role="tab"][aria-selected="true"][data-tab]') ||
        document.querySelector('.mode-tab[aria-current="page"][data-tab]');
      const activeTabId = activeBtn?.dataset?.tab;
      const targetUrl = new URL('/legacy/', window.location.origin);
      if (activeTabId && ['gc', 'ec', 'fc'].includes(activeTabId)) {
        targetUrl.searchParams.set('tab', activeTabId);
      }
      window.location.assign(targetUrl.toString());
    });
  }

  standaloneQuery?.addEventListener?.('change', (evt) => {
    const mode = evt.matches ? 'standalone' : 'browser tab';
    trackEvent('Display mode changed', { mode, university: config.id });
  });

  const shareBtn = document.getElementById('share-app-btn');
  if (shareBtn && typeof navigator.share === 'function') {
    shareBtn.hidden = false;
    shareBtn.addEventListener('click', async () => {
      try {
        await navigator.share({
          title: document.title,
          text: `Check out ${config.name} CGPA Calculator`,
          url: window.location.href,
        });
        trackEvent('app_shared', { university: config.id });
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    });
  }

  const yearEl = document.getElementById('thisYear');
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  // 9. Lazy-Loaded & Theme-Synced Giscus Comments
  function initGiscusComments() {
    const container = document.getElementById('giscus-container');
    if (!container) return;

    const {
      repo = '',
      repoId = '',
      category = 'General',
      categoryId = '',
      mapping = 'pathname',
      term = '',
      strict = '0',
      reactionsEnabled = '1',
      emitMetadata = '0',
      inputPosition = 'top',
      lang = 'en',
    } = container.dataset;

    if (!repo.trim() || !repoId.trim() || !categoryId.trim()) return;

    let giscusInjected = false;
    const target = document.getElementById('comments-section') || container;

    function injectGiscusScript() {
      if (giscusInjected) return;
      if (container.querySelector('script[src="https://giscus.app/client.js"]')) {
        giscusInjected = true;
        return;
      }
      giscusInjected = true;

      window.addEventListener('message', function onGiscusReady(event) {
        if (event.origin !== 'https://giscus.app' || !event.data?.giscus) return;
        window.removeEventListener('message', onGiscusReady);
        syncGiscusTheme(currentThemeMode);
      });

      const script = document.createElement('script');
      script.src = 'https://giscus.app/client.js';
      script.async = true;
      script.setAttribute('crossorigin', 'anonymous');
      script.setAttribute('data-repo', repo);
      script.setAttribute('data-repo-id', repoId);
      script.setAttribute('data-category', category || 'General');
      script.setAttribute('data-category-id', categoryId);
      script.setAttribute('data-mapping', mapping);
      if (term.trim()) {
        script.setAttribute('data-term', term.trim());
      }
      script.setAttribute('data-strict', strict);
      script.setAttribute('data-reactions-enabled', reactionsEnabled);
      script.setAttribute('data-emit-metadata', emitMetadata);
      script.setAttribute('data-input-position', inputPosition);
      script.setAttribute('data-theme', resolveGiscusTheme(currentThemeMode));
      script.setAttribute('data-lang', lang);
      container.appendChild(script);
    }

    function startObserving() {
      let triggered = false;
      let fallbackTimer = null;
      const runOnce = () => {
        if (triggered) return;
        triggered = true;
        if (fallbackTimer !== null) {
          window.clearTimeout(fallbackTimer);
          fallbackTimer = null;
        }
        const viewportHeight = window.innerHeight || document.documentElement?.clientHeight || 0;
        const rect = typeof target.getBoundingClientRect === 'function' ? target.getBoundingClientRect() : null;
        const isAlreadyVisible =
          rect &&
          (rect.width > 0 || rect.height > 0) &&
          rect.top <= viewportHeight + 250 &&
          rect.bottom >= -250;

        if (isAlreadyVisible || typeof window.IntersectionObserver !== 'function') {
          injectGiscusScript();
        } else {
          const observer = new window.IntersectionObserver(
            (entries) => {
              if (entries.some((entry) => entry.isIntersecting)) {
                observer.disconnect();
                injectGiscusScript();
              }
            },
            { rootMargin: '250px' }
          );
          observer.observe(target);
        }
      };

      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(runOnce, { timeout: 1000 });
        fallbackTimer = window.setTimeout(runOnce, 1000);
      } else {
        fallbackTimer = window.setTimeout(runOnce, 150);
      }
    }

    if (document.readyState === 'complete') {
      startObserving();
    } else {
      window.addEventListener('load', startObserving, { once: true });
    }
  }

  // 10. Contribute, Discussions & FAQ Telemetry + Opt-In Quality Display Ad Controller
  const contributeSection = document.getElementById('contribute-section');
  if (contributeSection) {
    contributeSection.addEventListener('click', (e) => {
      const actionEl = e.target?.closest?.('[data-contribute-action]');
      if (!actionEl) return;
      const action = actionEl.dataset.contributeAction;
      if (!action) return;
      trackEvent('contribute_clicked', { action, university: config.id });
    });
  }

  const commentsSection = document.getElementById('comments-section');
  if (commentsSection) {
    commentsSection.addEventListener('click', (e) => {
      const link = e.target?.closest?.('a[href]');
      if (!link) return;
      trackEvent('discussions_clicked', {
        university: config.id,
        link_text: (link.textContent || '').trim(),
      });
    });
  }

  document.querySelectorAll('details.faq-item').forEach((detailsEl) => {
    detailsEl.addEventListener('toggle', () => {
      if (!detailsEl.open) return;
      const question = detailsEl.querySelector('summary')?.textContent?.trim() || '';
      trackEvent('faq_opened', {
        university: config.id,
        question,
      });
    });
  });

  function initDisplayAds() {
    let previewMode = false;
    try {
      previewMode = new URLSearchParams(window.location.search).get('ads') === 'preview';
    } catch {
      previewMode = false;
    }

    let started = false;
    const mountAds = (trigger) => {
      if (started) return;
      started = true;
      import('./ads-manager.js?v=26')
        .then((mod) => {
          mod.initManagedAds({ university: config.id, trigger });
        })
        .catch(() => {
          started = false;
        });
    };

    if (previewMode) {
      mountAds('preview');
      return;
    }

    const scheduleMount = () => {
      if (started) return;
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(() => mountAds('default_on'), { timeout: 1500 });
        window.setTimeout(() => mountAds('default_on'), 1500);
      } else {
        window.setTimeout(() => mountAds('default_on'), 1500);
      }
    };

    if (document.readyState === 'complete') {
      scheduleMount();
    } else {
      window.addEventListener('load', scheduleMount, { once: true });
    }
  }

  function initAnnouncementBanner() {
    const bannerEl = document.getElementById('announcement-banner');
    if (!bannerEl) return;

    const customAnnouncement = resolveAnnouncementBanner(config.id);
    if (customAnnouncement) {
      bannerEl.removeAttribute('data-ad-managed');
      const shown = renderAnnouncementBanner(bannerEl, customAnnouncement, {
        onCtaClick: (item) => {
          trackEvent('announcement_clicked', {
            announcement_id: item.id || 'custom-announcement',
            university: config.id,
          });
        },
      });
      if (shown) {
        trackEvent('announcement_shown', {
          announcement_id: customAnnouncement.id || 'custom-announcement',
          university: config.id,
        });
      }
      return;
    }

    let previewMode = false;
    try {
      previewMode = new URLSearchParams(window.location.search).get('ads') === 'preview';
    } catch {
      previewMode = false;
    }

    if (!previewMode && !ANNOUNCEMENT_BANNER.adFallbackEnabled) {
      bannerEl.removeAttribute('data-ad-managed');
      bannerEl.hidden = true;
    }
  }

  function initSessionMilestones() {
    const thresholds = [60, 180, 300];
    const readSent = () =>
      new Set(
        String(safeSessionGet(SESSION_MILESTONES_KEY) || '')
          .split(',')
          .filter(Boolean)
          .map(Number)
      );

    if (thresholds.every((m) => readSent().has(m))) return;

    let dwellSec = Number(safeSessionGet(SESSION_DWELL_KEY) || 0);
    if (!Number.isFinite(dwellSec) || dwellSec < 0) dwellSec = 0;

    let timerId = null;
    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      dwellSec += 5;
      safeSessionSet(SESSION_DWELL_KEY, String(dwellSec));

      const sent = readSent();
      let updated = false;
      for (const m of thresholds) {
        if (dwellSec >= m && !sent.has(m)) {
          sent.add(m);
          updated = true;
          trackEvent('session_milestone', {
            milestone_sec: m,
            calc_count: Number(safeSessionGet(SESSION_CALCS_KEY) || 0),
            university: config.id,
            calculator: pageTab,
          });
        }
      }
      if (updated) {
        safeSessionSet(SESSION_MILESTONES_KEY, Array.from(sent).join(','));
        if (thresholds.every((m) => sent.has(m)) && timerId !== null) {
          window.clearInterval(timerId);
          timerId = null;
        }
      }
    };

    timerId = window.setInterval(tick, 5000);
    window.addEventListener('pagehide', () => {
      safeSessionSet(SESSION_DWELL_KEY, String(dwellSec));
    });
  }

  initAnnouncementBanner();
  initGiscusComments();
  initDisplayAds();
  initSessionMilestones();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp, { once: true });
  } else {
    initApp();
  }
}
