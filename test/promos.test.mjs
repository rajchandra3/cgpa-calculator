import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ANNOUNCEMENT_BANNER,
  PERSONAL_PROMOS,
  PERSONAL_PROMOS_ENABLED,
  TAB_ALIASES,
  expandTabs,
  isSafeHttpUrl,
  matchPromo,
  matchPromos,
  matchesNumericRule,
  matchesPromoRule,
  pickNextPromo,
  renderAnnouncementBanner,
  renderPersonalPromo,
  resolveAnnouncementBanner,
} from '../src/js/promos.js';

function createFakeElement(tagName) {
  const attrs = new Map();
  const listeners = new Map();
  return {
    tagName: tagName.toUpperCase(),
    className: '',
    textContent: '',
    hidden: false,
    children: [],
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
    click() {
      for (const fn of listeners.get('click') || []) fn({});
    },
    append(...nodes) {
      this.children.push(...nodes);
    },
    appendChild(node) {
      this.children.push(node);
      return node;
    },
    replaceChildren(...nodes) {
      this.children = [...nodes];
    },
  };
}

function createFakeDoc() {
  return {
    createElement(tag) {
      return createFakeElement(tag);
    },
  };
}

test('TAB_ALIASES and PERSONAL_PROMOS expose frozen rule definitions and defaults', () => {
  assert.deepEqual(TAB_ALIASES.gpa, ['sc']);
  assert.deepEqual(TAB_ALIASES.cgpa, ['gc', 'fc']);
  assert.deepEqual(TAB_ALIASES['quick-cgpa'], ['gc']);
  assert.deepEqual(TAB_ALIASES['all-sem'], ['fc']);
  assert.deepEqual(TAB_ALIASES['expected-marks'], ['ec']);

  assert.equal(PERSONAL_PROMOS.length, 4);
  const day20 = PERSONAL_PROMOS.find((p) => p.id === 'personal-day20');
  assert.equal(day20.enabled, true);
  assert.equal(
    day20.ctaUrl,
    'https://day20.rajchandra.me/students/?utm_source=cgpa-calculator&utm_medium=wow-promo&utm_campaign=personal_promo'
  );
  const linkedin = PERSONAL_PROMOS.find((p) => p.id === 'personal-linkedin');
  assert.equal(linkedin.enabled, true);
  assert.equal(linkedin.ctaUrl, 'https://www.linkedin.com/in/rajchandra3/');
  const affiliate = PERSONAL_PROMOS.find((p) => p.id === 'affiliate-template-expected-marks');
  assert.equal(affiliate.enabled, false);
  assert.equal(affiliate.disclosure, 'Affiliate');
  const twitter = PERSONAL_PROMOS.find((p) => p.id === 'personal-twitter');
  assert.equal(twitter.enabled, true);
  assert.equal(twitter.ctaUrl, 'https://x.com/raj_chandra3');
});

test('isSafeHttpUrl allows only http/https URLs and rejects unsafe schemes or malformed inputs', () => {
  assert.equal(isSafeHttpUrl('https://day20.rajchandra.me/?x=1'), true);
  assert.equal(isSafeHttpUrl('http://localhost:3000/test'), true);

  assert.equal(isSafeHttpUrl('javascript:alert(1)'), false);
  assert.equal(isSafeHttpUrl('data:text/html,<script>alert(1)</script>'), false);
  assert.equal(isSafeHttpUrl('mailto:test@example.com'), false);
  assert.equal(isSafeHttpUrl('/relative/path'), false);
  assert.equal(isSafeHttpUrl('http://[invalid'), false);
  assert.equal(isSafeHttpUrl(''), false);
  assert.equal(isSafeHttpUrl('   '), false);
  assert.equal(isSafeHttpUrl(null), false);
  assert.equal(isSafeHttpUrl(42), false);
});

test('expandTabs maps aliases and lowercased tab IDs into a Set', () => {
  assert.deepEqual(Array.from(expandTabs(['cgpa'])), ['gc', 'fc']);
  assert.deepEqual(Array.from(expandTabs(['gpa', 'quick-cgpa', 'all-sem', 'expected-marks'])), [
    'sc',
    'gc',
    'fc',
    'ec',
  ]);
  assert.deepEqual(Array.from(expandTabs(['*', ' SC ', '', null, 123, 'toString'])), [
    '*',
    'sc',
    'tostring',
  ]);
  assert.deepEqual(Array.from(expandTabs(null)), []);
  assert.deepEqual(Array.from(expandTabs('cgpa')), []);
});

test('matchesNumericRule enforces strict gt/gte/lt/lte bounds and rejects non-finite values', () => {
  assert.equal(matchesNumericRule(undefined, null), true);
  assert.equal(matchesNumericRule(NaN, undefined), true);

  assert.equal(matchesNumericRule(NaN, { gt: 0 }), false);
  assert.equal(matchesNumericRule(Infinity, { gt: 0 }), false);
  assert.equal(matchesNumericRule('9.5', { gt: 9 }), false);
  assert.equal(matchesNumericRule(null, { gte: 0 }), false);

  assert.equal(matchesNumericRule(9, { gt: 9 }), false);
  assert.equal(matchesNumericRule(9.0, { gt: 9 }), false);
  assert.equal(matchesNumericRule(9.01, { gt: 9 }), true);

  assert.equal(matchesNumericRule(8.49, { gte: 8.5 }), false);
  assert.equal(matchesNumericRule(8.5, { gte: 8.5 }), true);
  assert.equal(matchesNumericRule(0, { gte: 0 }), true);

  assert.equal(matchesNumericRule(75, { lt: 75 }), false);
  assert.equal(matchesNumericRule(74.99, { lt: 75 }), true);

  assert.equal(matchesNumericRule(20.01, { lte: 20 }), false);
  assert.equal(matchesNumericRule(20, { lte: 20 }), true);

  assert.equal(matchesNumericRule(15, { gte: 10, lte: 20 }), true);
  assert.equal(matchesNumericRule(21, { gte: 10, lte: 20 }), false);
});

test('matchesPromoRule validates enabled flag, URL safety, tabs, universities, result, and credits', () => {
  const baseRule = {
    id: 'test-rule',
    enabled: true,
    ctaUrl: 'https://example.com',
    when: {
      tabs: ['cgpa'],
      universities: ['vit', 'ktu'],
      result: { gt: 9 },
      credits: { gte: 15, lte: 30 },
    },
  };

  assert.equal(matchesPromoRule(null, {}), false);
  assert.equal(matchesPromoRule({ ...baseRule, enabled: false }, { tab: 'gc', university: 'vit', result: 9.5, credits: 20 }), false);
  assert.equal(matchesPromoRule({ ...baseRule, ctaUrl: 'javascript:alert(1)' }, { tab: 'gc', university: 'vit', result: 9.5, credits: 20 }), false);

  // Matching Quick CGPA & All-Sem CGPA via 'cgpa' alias
  assert.equal(matchesPromoRule(baseRule, { tab: 'gc', university: 'VIT', result: 9.1, credits: 20 }), true);
  assert.equal(matchesPromoRule(baseRule, { tab: 'FC', university: 'ktu', result: 9.5, credits: 15 }), true);

  // Boundary & mismatch checks
  assert.equal(matchesPromoRule(baseRule, { tab: 'gc', university: 'vit', result: 9.0, credits: 20 }), false);
  assert.equal(matchesPromoRule(baseRule, { tab: 'sc', university: 'vit', result: 9.5, credits: 20 }), false);
  assert.equal(matchesPromoRule(baseRule, { tab: 'gc', university: 'anna', result: 9.5, credits: 20 }), false);
  assert.equal(matchesPromoRule(baseRule, { tab: 'gc', university: '', result: 9.5, credits: 20 }), false);
  assert.equal(matchesPromoRule(baseRule, { tab: 'gc', result: 9.5, credits: 20 }), false);
  assert.equal(matchesPromoRule(baseRule, { tab: 'gc', university: 'vit', result: 9.5, credits: 14 }), false);
  assert.equal(matchesPromoRule(baseRule, { tab: 'gc', university: 'vit', result: 9.5, credits: 31 }), false);
  assert.equal(matchesPromoRule(baseRule, { tab: null, university: 'vit', result: 9.5, credits: 20 }), false);
  assert.equal(matchesPromoRule(baseRule, null), false);

  // Omitted universities matches any; non-array universities rejects; missing `when` fails tab check
  assert.equal(
    matchesPromoRule(
      { id: 'any-uni', ctaUrl: 'https://example.com', when: { tabs: ['*'] } },
      { tab: 'sc' }
    ),
    true
  );
  assert.equal(
    matchesPromoRule(
      { id: 'bad-uni', ctaUrl: 'https://example.com', when: { tabs: ['*'], universities: 'vit' } },
      { tab: 'sc', university: 'vit' }
    ),
    false
  );
  assert.equal(
    matchesPromoRule(
      { id: 'non-str-uni', ctaUrl: 'https://example.com', when: { tabs: ['*'], universities: [123] } },
      { tab: 'sc', university: 'vit' }
    ),
    false
  );
  assert.equal(matchesPromoRule({ id: 'no-when', ctaUrl: 'https://example.com' }, { tab: 'sc' }), false);
});

test('matchPromos & pickNextPromo show Day20, LinkedIn, and Twitter to everyone across tabs/scores and shuffle without repeating', () => {
  assert.equal(PERSONAL_PROMOS_ENABLED, true);
  assert.equal(ANNOUNCEMENT_BANNER.enabled, false);
  assert.equal(ANNOUNCEMENT_BANNER.adFallbackEnabled, false);

  // Explicit kill-switch suppresses all personal promos
  assert.deepEqual(
    matchPromos({ tab: 'gc', university: 'vit', result: 9.5, credits: 22 }, PERSONAL_PROMOS, new Set(), {
      enabled: false,
    }),
    []
  );
  assert.equal(
    pickNextPromo({ tab: 'gc', university: 'vit', result: 9.5 }, { enabled: false }),
    null
  );

  // Every tab and score (0, 6.5, 9.8) matches all 3 active promos (Day20, LinkedIn, Twitter)
  for (const ctx of [
    { tab: 'sc', university: 'vit', result: 0, credits: 4 },
    { tab: 'gc', university: 'anna', result: 6.5, credits: 80 },
    { tab: 'ec', university: 'vit', result: 42 },
    { tab: 'fc', university: 'ktu', result: 9.8, credits: 140 },
  ]) {
    const matched = matchPromos(ctx);
    assert.deepEqual(
      matched.map((p) => p.id),
      ['personal-day20', 'personal-linkedin', 'personal-twitter']
    );
    assert.equal(matchPromo(ctx)?.id, 'personal-day20');
  }

  // Disabled affiliate template can still be enabled for targeted rules
  const withAffiliateEnabled = PERSONAL_PROMOS.map((p) =>
    p.id === 'affiliate-template-expected-marks' ? { ...p, enabled: true, priority: 150 } : p
  );
  assert.equal(
    matchPromo({ tab: 'ec', university: 'vit', result: 74.9 }, withAffiliateEnabled)?.id,
    'affiliate-template-expected-marks'
  );

  // Dismissed IDs filter out dismissed promos across shuffles
  assert.deepEqual(
    matchPromos(
      { tab: 'gc', university: 'vit', result: 7.5 },
      PERSONAL_PROMOS,
      new Set(['personal-day20'])
    ).map((p) => p.id),
    ['personal-linkedin', 'personal-twitter']
  );
  assert.equal(
    pickNextPromo(
      { tab: 'gc', university: 'vit', result: 7.5 },
      { dismissedIds: ['personal-day20', 'personal-linkedin', 'personal-twitter'] }
    ),
    null
  );
  assert.equal(
    pickNextPromo(
      { tab: 'gc', university: 'vit', result: 7.5 },
      { dismissedIds: ['personal-day20', 'personal-linkedin'] }
    )?.id,
    'personal-twitter'
  );
  assert.equal(
    matchPromo({ tab: 'gc', university: 'vit', result: 9.5 }, PERSONAL_PROMOS, null)?.id,
    'personal-day20'
  );

  // Consecutive pickNextPromo calls NEVER repeat lastPromoId when 2+ candidates exist
  const first = pickNextPromo(
    { tab: 'sc', university: 'vit', result: 7.0 },
    { lastPromoId: '', random: () => 0 }
  );
  assert.equal(first.id, 'personal-day20');

  const second = pickNextPromo(
    { tab: 'sc', university: 'vit', result: 7.0 },
    { lastPromoId: first.id, random: () => 0 }
  );
  assert.equal(second.id, 'personal-linkedin');
  assert.notEqual(second.id, first.id);

  const third = pickNextPromo(
    { tab: 'sc', university: 'vit', result: 7.0 },
    { lastPromoId: second.id, random: () => 0.99 }
  );
  assert.equal(third.id, 'personal-twitter');
  assert.notEqual(third.id, second.id);

  // Out-of-bounds / non-finite random() and single-item fallback when filtered pool empties
  assert.equal(
    pickNextPromo(
      { tab: 'sc', university: 'vit', result: 7.0 },
      { lastPromoId: 'personal-day20', random: () => Number.NaN }
    )?.id,
    'personal-linkedin'
  );
  assert.equal(
    pickNextPromo(
      { tab: 'sc', university: 'vit', result: 7.0 },
      {
        promos: [
          { id: 'only-a', priority: 10, ctaUrl: 'https://example.com/a', when: { tabs: ['*'] } },
          { id: 'only-a', priority: 10, ctaUrl: 'https://example.com/a', when: { tabs: ['*'] } },
        ],
        lastPromoId: 'only-a',
        random: () => 5,
      }
    )?.id,
    'only-a'
  );

  // Priority sorting & tie-breaking + non-finite priority coverage
  const tiedPromos = [
    null,
    { id: 'first', priority: 'bad', ctaUrl: 'https://example.com/1', when: { tabs: ['*'] } },
    { id: 'second', priority: 0, ctaUrl: 'https://example.com/2', when: { tabs: ['*'] } },
    { id: 'third', priority: 5, ctaUrl: 'https://example.com/3', when: { tabs: ['*'] } },
  ];
  assert.equal(matchPromo({ tab: 'sc' }, tiedPromos)?.id, 'third');
  assert.equal(
    pickNextPromo({ tab: 'sc' }, { promos: tiedPromos, lastPromoId: 'first', random: () => 0 })?.id,
    'third'
  );
  assert.deepEqual(
    pickNextPromo(
      { tab: 'sc' },
      { promos: [tiedPromos[1], tiedPromos[2]], lastPromoId: 'second', random: () => -1 }
    )?.id,
    'first'
  );
  assert.equal(matchPromo({ tab: 'sc' }, 'not-an-array'), null);
});

test('renderPersonalPromo mounts safe DOM, sets affiliate rel, fires callbacks, and clears invalid states', () => {
  const doc = createFakeDoc();
  const container = createFakeElement('section');
  container.hidden = true;

  assert.equal(renderPersonalPromo(null, PERSONAL_PROMOS[0], { doc }), false);

  // Null promo or unsafe URL hides & clears container (both replaceChildren and textContent fallback)
  container.hidden = false;
  container.children = [createFakeElement('div')];
  assert.equal(renderPersonalPromo(container, null, { doc }), false);
  assert.equal(container.hidden, true);
  assert.equal(container.children.length, 0);

  const fallbackContainer = createFakeElement('section');
  delete fallbackContainer.replaceChildren;
  fallbackContainer.hidden = false;
  fallbackContainer.textContent = 'stale';
  assert.equal(
    renderPersonalPromo(fallbackContainer, { id: 'bad', ctaUrl: 'javascript:evil()' }, { doc }),
    false
  );
  assert.equal(fallbackContainer.hidden, true);
  assert.equal(fallbackContainer.textContent, '');

  // Render creator promo (non-affiliate -> rel="noopener noreferrer")
  const clicks = [];
  const dismissals = [];
  const day20 = PERSONAL_PROMOS[0];
  assert.equal(
    renderPersonalPromo(container, day20, {
      doc,
      onCtaClick: (p) => clicks.push(p.id),
      onDismiss: (p) => dismissals.push(p.id),
    }),
    true
  );
  assert.equal(container.hidden, false);
  assert.equal(container.children.length, 1);

  const card = container.children[0];
  assert.equal(card.className, 'personal-promo-card');
  assert.equal(card.getAttribute('data-promo-id'), 'personal-day20');

  const [meta, title, body, cta] = card.children;
  assert.equal(meta.className, 'personal-promo-meta');
  assert.equal(meta.children[0].className, 'promo-badge');
  assert.equal(meta.children[0].textContent, 'Student Pick');
  assert.equal(meta.children[1].className, 'promo-disclosure');
  assert.equal(meta.children[1].textContent, 'By Raj Chandra');
  const dismissBtn = meta.children[2];
  assert.equal(dismissBtn.className, 'promo-dismiss');
  assert.equal(dismissBtn.getAttribute('type'), 'button');
  assert.equal(dismissBtn.getAttribute('aria-label'), 'Dismiss recommendation');
  assert.equal(dismissBtn.textContent, '×');

  assert.equal(title.className, 'personal-promo-title');
  assert.equal(title.textContent, day20.title);
  assert.equal(body.className, 'personal-promo-body');
  assert.equal(body.textContent, day20.body);

  assert.equal(cta.className, 'btn btn-secondary personal-promo-cta');
  assert.equal(cta.getAttribute('href'), day20.ctaUrl);
  assert.equal(cta.getAttribute('target'), '_blank');
  assert.equal(cta.getAttribute('rel'), 'noopener noreferrer');
  assert.equal(cta.textContent, day20.ctaLabel);

  cta.click();
  assert.deepEqual(clicks, ['personal-day20']);

  dismissBtn.click();
  assert.equal(container.hidden, true);
  assert.deepEqual(dismissals, ['personal-day20']);

  // Affiliate promo adds `sponsored` to rel, and fallback container mounts without optional fields or callbacks
  const affiliatePromo = {
    id: 'aff',
    disclosure: 'Affiliate',
    ctaUrl: 'https://example.com/study',
  };
  assert.equal(renderPersonalPromo(fallbackContainer, affiliatePromo, { doc }), true);
  assert.equal(fallbackContainer.hidden, false);
  const affCard = fallbackContainer.children[0];
  const [affMeta, affTitle, affBody, affCta] = affCard.children;
  assert.equal(affMeta.children.length, 2); // disclosure + dismiss (no badge)
  assert.equal(affTitle.textContent, '');
  assert.equal(affBody.textContent, '');
  assert.equal(affCta.getAttribute('rel'), 'noopener noreferrer sponsored');
  assert.equal(affCta.textContent, 'Learn more ↗');

  // Calling click & dismiss without callbacks does not throw
  affCta.click();
  affMeta.children[1].click();
  assert.equal(fallbackContainer.hidden, true);
});

test('resolveAnnouncementBanner & renderAnnouncementBanner handle default disabled, university filters, safe URLs, and custom rendering', () => {
  // Default config is disabled so Google Ad fallback runs
  assert.equal(ANNOUNCEMENT_BANNER.enabled, false);
  assert.equal(resolveAnnouncementBanner('vit'), null);
  assert.equal(resolveAnnouncementBanner('vit', null), null);

  // Blank/non-string text or unsafe URL rejected
  assert.equal(resolveAnnouncementBanner('vit', { enabled: true, text: '   ' }), null);
  assert.equal(resolveAnnouncementBanner('vit', { enabled: true, text: 123 }), null);
  assert.equal(
    resolveAnnouncementBanner('vit', { enabled: true, text: 'Hi', ctaUrl: 'javascript:alert(1)' }),
    null
  );

  // University targeting
  const vitOnly = {
    id: 'vit-banner',
    enabled: true,
    universities: ['VIT', 123],
    badge: 'Update',
    text: 'FAT schedule updated!',
    ctaLabel: 'See details ↗',
    ctaUrl: 'https://rajchandra.me/news',
  };
  assert.equal(resolveAnnouncementBanner('vit', vitOnly), vitOnly);
  assert.equal(resolveAnnouncementBanner('ktu', vitOnly), null);
  assert.equal(resolveAnnouncementBanner('', vitOnly), null);
  assert.equal(resolveAnnouncementBanner(null, vitOnly), null);
  assert.equal(
    resolveAnnouncementBanner('vit', { enabled: true, text: 'Bad uni', universities: 'vit' }),
    null
  );

  const anyUni = { enabled: true, text: 'All students notice' };
  assert.equal(resolveAnnouncementBanner('srm', anyUni), anyUni);
  assert.equal(
    resolveAnnouncementBanner('srm', { enabled: true, universities: ['*'], text: 'Global notice' })?.text,
    'Global notice'
  );

  // renderAnnouncementBanner validation & DOM output
  const doc = createFakeDoc();
  const container = createFakeElement('section');
  container.classList = {
    set: new Set(['is-unfilled']),
    add(c) { this.set.add(c); },
    remove(...cs) { cs.forEach((c) => this.set.delete(c)); },
    contains(c) { return this.set.has(c); },
  };
  assert.equal(renderAnnouncementBanner(null, vitOnly, { doc }), false);
  assert.equal(renderAnnouncementBanner(container, null, { doc }), false);
  assert.equal(container.hidden, true);
  assert.equal(
    renderAnnouncementBanner(container, { text: 'Bad', ctaUrl: 'javascript:void(0)' }, { doc }),
    false
  );

  const clicked = [];
  assert.equal(
    renderAnnouncementBanner(container, vitOnly, {
      doc,
      onCtaClick: (item) => clicked.push(item.id),
    }),
    true
  );
  assert.equal(container.hidden, false);
  assert.equal(container.classList.contains('is-custom-announcement'), true);
  assert.equal(container.classList.contains('is-unfilled'), false);
  const bar = container.children[0];
  assert.equal(bar.className, 'announcement-custom');
  assert.equal(bar.getAttribute('data-announcement-id'), 'vit-banner');
  assert.equal(bar.children[0].textContent, 'Update');
  assert.equal(bar.children[1].textContent, 'FAT schedule updated!');
  assert.equal(bar.children[2].getAttribute('rel'), 'noopener noreferrer');
  bar.children[2].click();
  assert.deepEqual(clicked, ['vit-banner']);

  // Fallback without replaceChildren, affiliate disclosure, default CTA label, and text-only banner without CTA
  const fallback = createFakeElement('section');
  delete fallback.replaceChildren;
  assert.equal(
    renderAnnouncementBanner(
      fallback,
      { text: 'Affiliate deal', disclosure: 'Affiliate', ctaUrl: 'https://example.com/deal' },
      { doc }
    ),
    true
  );
  assert.equal(fallback.children[0].getAttribute('data-announcement-id'), 'custom-announcement');
  const affLink = fallback.children[0].children[1];
  assert.equal(affLink.getAttribute('rel'), 'noopener noreferrer sponsored');
  assert.equal(affLink.textContent, 'Learn more ↗');
  affLink.click();

  assert.equal(renderAnnouncementBanner(container, { text: 'Plain notice only' }, { doc }), true);
  assert.equal(container.children[0].children.length, 1);
});
