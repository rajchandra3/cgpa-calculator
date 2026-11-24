/**
 * Declarative Wow-Moment Personal & Affiliate Promo Rule Engine
 * + Announcement Banner Config.
 *
 * Announcement Banner (`ANNOUNCEMENT_BANNER`):
 * - By default `enabled: false`, so `#announcement-banner` automatically falls back
 *   to a Google AdSense display banner.
 * - Set `enabled: true` and fill `badge`, `text`, `ctaLabel`, `ctaUrl`, and `universities`
 *   to replace the top Google Ad with your own announcement or affiliate push.
 *
 * Wow-Moment Promos (`PERSONAL_PROMOS`):
 * 1. Add an entry to PERSONAL_PROMOS below (higher `priority` wins when multiple rules match).
 * 2. Set `enabled: true` (or `false` to disable a template without deleting it).
 * 3. Configure `when`:
 *    - `tabs`: array of tab IDs ('sc', 'gc', 'ec', 'fc'), aliases ('gpa', 'cgpa', 'quick-cgpa', 'all-sem', 'expected-marks'), or ['*'].
 *    - `universities`: array of university keys ('vit', 'anna', 'ktu', 'srm') or ['*'] (omit for any university).
 *    - `result`: optional numeric bounds `{ gt, gte, lt, lte }` matched against computed GPA / CGPA / expected marks.
 *    - `credits`: optional numeric bounds `{ gt, gte, lt, lte }` matched against computed credits.
 * 4. Set `disclosure`: use 'By Raj Chandra' for own projects or 'Affiliate' for affiliate links
 *    ('Affiliate' automatically adds `rel="noopener noreferrer sponsored"` on the CTA link).
 * 5. Always provide an absolute `https://` or `http://` URL in `ctaUrl`.
 */

export const ANNOUNCEMENT_BANNER = Object.freeze({
  id: 'custom-announcement',
  enabled: false, // Set to true to override the top Google Ad banner with this announcement
  universities: Object.freeze(['*']),
  badge: 'Announcement',
  disclosure: 'By Raj Chandra',
  text: 'Replace this text and set enabled: true to display a custom announcement banner.',
  ctaLabel: 'Learn more ↗',
  ctaUrl: 'https://rajchandra.me/',
});

export const TAB_ALIASES = Object.freeze({
  gpa: Object.freeze(['sc']),
  cgpa: Object.freeze(['gc', 'fc']),
  'quick-cgpa': Object.freeze(['gc']),
  'all-sem': Object.freeze(['fc']),
  'expected-marks': Object.freeze(['ec']),
});

export const PERSONAL_PROMOS = Object.freeze([
  Object.freeze({
    id: 'cgpa-9-plus-day20',
    enabled: true,
    priority: 100,
    when: Object.freeze({
      tabs: Object.freeze(['cgpa']),
      universities: Object.freeze(['*']),
      result: Object.freeze({ gt: 9 }),
    }),
    badge: '9+ Pointer Pick',
    disclosure: 'By Raj Chandra',
    title: '9+ CGPA locked in — track your money like your grades with Day20',
    body: 'Built by the creator of this calculator. Plan internships, stipends, and semester budgets in 2 minutes.',
    ctaLabel: 'Explore Day20 ↗',
    ctaUrl: 'https://day20.rajchandra.me/?utm_source=cgpa-calculator&utm_medium=wow-promo&utm_campaign=cgpa_gt_9',
  }),
  Object.freeze({
    id: 'gpa-8-5-plus-forkfolio',
    enabled: true,
    priority: 80,
    when: Object.freeze({
      tabs: Object.freeze(['gpa']),
      universities: Object.freeze(['*']),
      result: Object.freeze({ gte: 8.5 }),
    }),
    badge: 'High GPA Pick',
    disclosure: 'By Raj Chandra',
    title: 'Strong semester — track your investments & net worth in ForkFolio',
    body: 'Free, privacy-first portfolio tracker built by Raj Chandra for students and young engineers.',
    ctaLabel: 'Check out ForkFolio ↗',
    ctaUrl: 'https://forkfolio.rajchandra.me/?utm_source=cgpa-calculator&utm_medium=wow-promo&utm_campaign=gpa_gte_85',
  }),
  // Ready-to-use affiliate template: flip `enabled: true` and replace copy/URL when active.
  Object.freeze({
    id: 'affiliate-template-expected-marks',
    enabled: false,
    priority: 70,
    when: Object.freeze({
      tabs: Object.freeze(['expected-marks']),
      universities: Object.freeze(['vit']),
      result: Object.freeze({ lt: 75 }),
    }),
    badge: 'Study Pick',
    disclosure: 'Affiliate',
    title: 'Need a fast revision boost before FAT?',
    body: 'Replace this template with your favorite course, book, or study-tool affiliate link.',
    ctaLabel: 'View Recommended Guide ↗',
    ctaUrl: 'https://rajchandra.me/?utm_source=cgpa-calculator&utm_medium=wow-promo&utm_campaign=affiliate_template',
  }),
  Object.freeze({
    id: 'creator-fallback',
    enabled: true,
    priority: 10,
    when: Object.freeze({
      tabs: Object.freeze(['*']),
      universities: Object.freeze(['*']),
      result: Object.freeze({ gte: 0 }),
    }),
    badge: 'From the Creator',
    disclosure: 'By Raj Chandra',
    title: 'Like fast, clutter-free tools? Explore more apps by Raj Chandra',
    body: 'Browse other free student and developer utilities I build and maintain.',
    ctaLabel: 'Visit rajchandra.me ↗',
    ctaUrl: 'https://rajchandra.me/?utm_source=cgpa-calculator&utm_medium=wow-promo&utm_campaign=creator_fallback',
  }),
]);

export function isSafeHttpUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return false;
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function expandTabs(tabs) {
  const expanded = new Set();
  if (!Array.isArray(tabs)) return expanded;

  for (const rawTab of tabs) {
    if (typeof rawTab !== 'string') continue;
    const key = rawTab.trim().toLowerCase();
    if (!key) continue;
    if (Object.hasOwn(TAB_ALIASES, key)) {
      for (const mappedId of TAB_ALIASES[key]) {
        expanded.add(mappedId);
      }
    } else {
      expanded.add(key);
    }
  }

  return expanded;
}

export function matchesNumericRule(value, rule) {
  if (!rule) return true;
  if (!Number.isFinite(value)) return false;
  if (typeof rule.gt === 'number' && !(value > rule.gt)) return false;
  if (typeof rule.gte === 'number' && !(value >= rule.gte)) return false;
  if (typeof rule.lt === 'number' && !(value < rule.lt)) return false;
  if (typeof rule.lte === 'number' && !(value <= rule.lte)) return false;
  return true;
}

export function matchesPromoRule(promo, context = {}) {
  if (!promo || typeof promo !== 'object') return false;
  if (promo.enabled === false) return false;
  if (!isSafeHttpUrl(promo.ctaUrl)) return false;

  const ctx = context && typeof context === 'object' ? context : {};
  const when = promo.when && typeof promo.when === 'object' ? promo.when : {};

  const allowedTabs = expandTabs(when.tabs);
  const tabId = typeof ctx.tab === 'string' ? ctx.tab.trim().toLowerCase() : '';
  if (!allowedTabs.has('*') && (!tabId || !allowedTabs.has(tabId))) {
    return false;
  }

  if (when.universities) {
    const allowedUniversities = new Set(
      (Array.isArray(when.universities) ? when.universities : [])
        .map((u) => (typeof u === 'string' ? u.trim().toLowerCase() : ''))
        .filter(Boolean)
    );
    const uniId = typeof ctx.university === 'string' ? ctx.university.trim().toLowerCase() : '';
    if (!allowedUniversities.has('*') && (!uniId || !allowedUniversities.has(uniId))) {
      return false;
    }
  }

  if (!matchesNumericRule(ctx.result, when.result)) return false;
  if (!matchesNumericRule(ctx.credits, when.credits)) return false;

  return true;
}

export function matchPromo(context, promos = PERSONAL_PROMOS, dismissedIds = new Set()) {
  if (!Array.isArray(promos)) return null;
  const dismissed =
    dismissedIds instanceof Set
      ? dismissedIds
      : new Set(Array.isArray(dismissedIds) ? dismissedIds : []);

  let best = null;
  let bestPriority = -Infinity;

  for (const promo of promos) {
    if (!promo || dismissed.has(promo.id)) continue;
    if (!matchesPromoRule(promo, context)) continue;
    const priority = Number.isFinite(promo.priority) ? promo.priority : 0;
    if (!best || priority > bestPriority) {
      best = promo;
      bestPriority = priority;
    }
  }

  return best;
}

function clearPromoContainer(container) {
  if (typeof container.replaceChildren === 'function') {
    container.replaceChildren();
  } else {
    container.textContent = '';
  }
}

export function renderPersonalPromo(container, promo, { onCtaClick, onDismiss, doc = document } = {}) {
  if (!container) return false;

  if (!promo || !isSafeHttpUrl(promo.ctaUrl)) {
    container.hidden = true;
    clearPromoContainer(container);
    return false;
  }

  const card = doc.createElement('div');
  card.className = 'personal-promo-card';
  card.setAttribute('data-promo-id', promo.id);

  const meta = doc.createElement('div');
  meta.className = 'personal-promo-meta';

  if (promo.badge) {
    const badge = doc.createElement('span');
    badge.className = 'promo-badge';
    badge.textContent = promo.badge;
    meta.appendChild(badge);
  }

  if (promo.disclosure) {
    const disclosure = doc.createElement('span');
    disclosure.className = 'promo-disclosure';
    disclosure.textContent = promo.disclosure;
    meta.appendChild(disclosure);
  }

  const dismissBtn = doc.createElement('button');
  dismissBtn.className = 'promo-dismiss';
  dismissBtn.setAttribute('type', 'button');
  dismissBtn.setAttribute('aria-label', 'Dismiss recommendation');
  dismissBtn.textContent = '×';
  dismissBtn.addEventListener('click', () => {
    container.hidden = true;
    onDismiss?.(promo);
  });
  meta.appendChild(dismissBtn);

  const title = doc.createElement('h3');
  title.className = 'personal-promo-title';
  title.textContent = promo.title || '';

  const body = doc.createElement('p');
  body.className = 'personal-promo-body';
  body.textContent = promo.body || '';

  const cta = doc.createElement('a');
  cta.className = 'btn btn-secondary personal-promo-cta';
  cta.setAttribute('href', promo.ctaUrl);
  cta.setAttribute('target', '_blank');
  const isAffiliate =
    typeof promo.disclosure === 'string' && promo.disclosure.trim().toLowerCase() === 'affiliate';
  cta.setAttribute('rel', isAffiliate ? 'noopener noreferrer sponsored' : 'noopener noreferrer');
  cta.textContent = promo.ctaLabel || 'Learn more ↗';
  cta.addEventListener('click', () => {
    onCtaClick?.(promo);
  });

  card.append(meta, title, body, cta);

  if (typeof container.replaceChildren === 'function') {
    container.replaceChildren(card);
  } else {
    container.textContent = '';
    container.appendChild(card);
  }

  container.hidden = false;
  return true;
}

export function resolveAnnouncementBanner(university, config = ANNOUNCEMENT_BANNER) {
  if (!config || typeof config !== 'object' || config.enabled !== true) return null;
  const text = typeof config.text === 'string' ? config.text.trim() : '';
  if (!text) return null;
  if (config.ctaUrl && !isSafeHttpUrl(config.ctaUrl)) return null;

  if (config.universities) {
    const allowed = new Set(
      (Array.isArray(config.universities) ? config.universities : [])
        .map((u) => (typeof u === 'string' ? u.trim().toLowerCase() : ''))
        .filter(Boolean)
    );
    const uniId = typeof university === 'string' ? university.trim().toLowerCase() : '';
    if (!allowed.has('*') && (!uniId || !allowed.has(uniId))) {
      return null;
    }
  }

  return config;
}

export function renderAnnouncementBanner(
  container,
  announcement,
  { onCtaClick, doc = document } = {}
) {
  if (!container) return false;
  const text = typeof announcement?.text === 'string' ? announcement.text.trim() : '';
  if (!announcement || !text || (announcement.ctaUrl && !isSafeHttpUrl(announcement.ctaUrl))) {
    container.hidden = true;
    clearPromoContainer(container);
    return false;
  }

  const bar = doc.createElement('div');
  bar.className = 'announcement-custom';
  bar.setAttribute('data-announcement-id', announcement.id || 'custom-announcement');

  if (announcement.badge) {
    const badge = doc.createElement('span');
    badge.className = 'promo-badge';
    badge.textContent = announcement.badge;
    bar.appendChild(badge);
  }

  const message = doc.createElement('p');
  message.className = 'announcement-text';
  message.textContent = text;
  bar.appendChild(message);

  if (announcement.ctaUrl) {
    const cta = doc.createElement('a');
    cta.className = 'btn btn-secondary announcement-cta';
    cta.setAttribute('href', announcement.ctaUrl);
    cta.setAttribute('target', '_blank');
    const isAffiliate =
      typeof announcement.disclosure === 'string' &&
      announcement.disclosure.trim().toLowerCase() === 'affiliate';
    cta.setAttribute('rel', isAffiliate ? 'noopener noreferrer sponsored' : 'noopener noreferrer');
    cta.textContent = announcement.ctaLabel || 'Learn more ↗';
    cta.addEventListener('click', () => {
      onCtaClick?.(announcement);
    });
    bar.appendChild(cta);
  }

  if (typeof container.replaceChildren === 'function') {
    container.replaceChildren(bar);
  } else {
    container.textContent = '';
    container.appendChild(bar);
  }

  container.classList?.add('is-custom-announcement');
  container.classList?.remove('is-unfilled', 'is-inactive');
  container.hidden = false;
  return true;
}
