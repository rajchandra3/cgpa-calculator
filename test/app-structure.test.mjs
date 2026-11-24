import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveTabId } from '../src/js/app.js';

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

test('serviceWorker.js uses cgpa-calculator-v2 and precaches only existing local assets', () => {
  const swSource = readRepoFile('serviceWorker.js');
  assert.match(swSource, /const CACHE_NAME = 'cgpa-calculator-v2'/);
  assert.match(swSource, /caches\.delete/);
  assert.match(swSource, /event\.request\.method !== 'GET'/);

  const arrayMatch = swSource.match(/const PRECACHE_URLS = \[([\s\S]*?)\];/);
  assert.ok(arrayMatch, 'PRECACHE_URLS array must exist in serviceWorker.js');

  const urls = Array.from(arrayMatch[1].matchAll(/'([^']+)'/g), (m) => m[1]);
  assert.equal(urls.length, 17);

  for (const urlPath of urls) {
    const diskRel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\//, '');
    assert.equal(repoFileExists(diskRel), true, `serviceWorker precache path missing on disk: ${urlPath}`);
  }
});

test('obsolete JS files are deleted and active JS files meet security and hygiene rules', () => {
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

  const activeJsFiles = [
    'src/js/universities.js',
    'src/js/math.js',
    'src/js/analytics.js',
    'src/js/app.js',
  ];
  const forbiddenPattern =
    /innerHTML|outerHTML|document\.write|insertAdjacentHTML|\beval\(|alert\(|confirm\(|prompt\(|adsbygoogle|pagead2|AW-16729760450|smartlook|UA-99147431|fb-comments|connect\.facebook|files\.rajchandra\.me/;

  for (const file of activeJsFiles) {
    assert.equal(repoFileExists(file), true, `Missing active JS file: ${file}`);
    const content = readRepoFile(file);
    assert.equal(
      forbiddenPattern.test(content),
      false,
      `Forbidden pattern detected in ${file}`
    );
  }
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

test('all 4 HTML pages match DOM contract IDs expected by src/js/app.js', () => {
  const pages = [
    { file: 'index.html', uni: 'vit', hasEc: true },
    { file: 'college/anna-university.html', uni: 'anna', hasEc: false },
    { file: 'college/ktu.html', uni: 'ktu', hasEc: false },
    { file: 'college/srm.html', uni: 'srm', hasEc: false },
  ];

  const requiredIds = [
    'theme-selector',
    'install-app-btn',
    'share-app-btn',
    'thisYear',
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
  ];

  for (const page of pages) {
    const html = readRepoFile(page.file);
    assert.match(html, new RegExp(`data-university="${page.uni}"`));
    assert.match(html, /<script src="\/src\/js\/analytics\.js" defer><\/script>/);
    assert.match(html, /<script type="module" src="\/src\/js\/app\.js"><\/script>/);

    for (const id of requiredIds) {
      assert.match(html, new RegExp(`id="${id}"`), `${page.file} missing #${id}`);
    }

    if (page.hasEc) {
      assert.match(html, /id="expected-marks-form"/);
      for (const ecId of ['cat1', 'cat2', 'da', 'al', 'lab', 'j-comp', 'fat', 'ec-submit']) {
        assert.match(html, new RegExp(`id="${ecId}"`), `${page.file} missing #${ecId}`);
      }
    } else {
      assert.doesNotMatch(html, /id="expected-marks-form"/);
    }
  }
});
