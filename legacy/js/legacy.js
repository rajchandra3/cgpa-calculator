(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var UI_VERSION_KEY = 'cgpa_ui_version';
  var LEGACY_TABS = ['sc', 'gc', 'ec', 'fc'];
  var TAB_ALIASES = { qcc: 'gc', ascc: 'fc', emc: 'ec' };

  function safeGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (err) {
      return null;
    }
  }

  function safeSet(key, val) {
    try {
      window.localStorage.setItem(key, val);
    } catch (err) {
      // Ignore storage errors
    }
  }

  function trackLegacy(eventName, props) {
    var payload = Object.assign({ university: 'vit', ui_version: 'legacy' }, props || {});
    try {
      if (typeof window.track === 'function') {
        window.track(eventName, payload);
      } else if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, payload);
      }
    } catch (err) {
      // Ignore analytics errors
    }
  }

  function setLegacyUserProperties() {
    try {
      if (typeof window.setAnalyticsUserProperties === 'function') {
        window.setAnalyticsUserProperties({ university: 'vit', ui_version: 'legacy' });
      } else if (typeof window.gtag === 'function') {
        window.gtag('set', 'user_properties', { university: 'vit', ui_version: 'legacy' });
      }
    } catch (err) {
      // Ignore analytics errors
    }
  }

  function roundToTwo(num) {
    if (!Number.isFinite(num)) return 0;
    var rounded = Math.round(num * 1000) / 1000;
    var decimalPart = rounded - Math.floor(rounded);
    var thirdDecimal = Math.round((decimalPart * 1000) % 10);
    if (thirdDecimal >= 5) {
      return Math.ceil(rounded * 100) / 100;
    }
    return Math.floor(rounded * 100) / 100;
  }

  function getScoreBand(tab, score) {
    var num = Number(score);
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

  function resolveTab(rawTab) {
    var key = String(rawTab || '').trim().toLowerCase();
    var mapped = TAB_ALIASES[key] || key;
    return LEGACY_TABS.indexOf(mapped) !== -1 ? mapped : 'sc';
  }

  function getActiveTabFromUrl() {
    try {
      return resolveTab(new URLSearchParams(window.location.search).get('tab'));
    } catch (err) {
      return 'sc';
    }
  }

  function renderResult(targetId, value) {
    var el = document.getElementById(targetId);
    if (!el) return;
    var heading = document.createElement('h1');
    heading.className = 'result-text';
    heading.textContent = String(value);
    el.replaceChildren(heading);
  }

  function applyLegacyTheme(theme) {
    var mode = theme === 'light' ? 'light' : 'dark';
    safeSet('ui_theme', mode);
    document.documentElement.setAttribute('data-bs-theme', mode);
    document.body.setAttribute('data-bs-theme', mode);

    var selector = document.getElementById('theme-selector');
    if (selector) selector.value = mode;

    var existing = document.querySelectorAll('link[data-legacy-theme]');
    existing.forEach(function (link) {
      link.remove();
    });

    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = mode === 'dark' ? '/legacy/css/themes/dark.css' : '/legacy/css/themes/light.css';
    link.setAttribute('data-legacy-theme', mode);
    document.head.appendChild(link);
  }

  document.addEventListener('DOMContentLoaded', function () {
    // Remember that user is on legacy UI
    safeSet(UI_VERSION_KEY, 'legacy');
    setLegacyUserProperties();

    // Dynamic footer year
    var yearEl = document.getElementById('thisYear');
    if (yearEl) {
      yearEl.textContent = String(new Date().getFullYear());
    }

    // Hide result alert boxes initially (classic v1 behavior)
    document.querySelectorAll('.alert-grades, .alert-cgpa-msg, .alert-marks, .alert-fcgpa').forEach(function (el) {
      el.style.display = 'none';
    });

    // Bootstrap error modal
    var modalEl = document.getElementById('modal-error');
    var errorModal = modalEl && window.bootstrap ? new window.bootstrap.Modal(modalEl) : null;
    function showErrorModal(message) {
      var bodyEl = document.getElementById('modal-body');
      if (bodyEl) bodyEl.textContent = String(message || 'Invalid input');
      if (errorModal) errorModal.show();
    }

    // Theme init + toggle
    var storedTheme = safeGet('ui_theme') || safeGet('color-scheme');
    var initialTheme = storedTheme === 'light' || storedTheme === 'dark'
      ? storedTheme
      : (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    applyLegacyTheme(initialTheme);

    var themeSelector = document.getElementById('theme-selector');
    if (themeSelector) {
      themeSelector.addEventListener('change', function () {
        applyLegacyTheme(themeSelector.value);
        trackLegacy('theme_changed', { theme: themeSelector.value });
      });
    }

    // Tab navigation
    var currentTab = getActiveTabFromUrl();
    function activateTab(tabId, opts) {
      var options = opts || {};
      var target = resolveTab(tabId);
      currentTab = target;

      LEGACY_TABS.forEach(function (id) {
        var panel = document.getElementById(id);
        if (panel) panel.style.display = id === target ? 'flex' : 'none';
      });

      document.querySelectorAll('.nav-link[data-tab]').forEach(function (link) {
        link.classList.toggle('active', link.getAttribute('data-tab') === target);
      });

      var collapseEl = document.querySelector('.navbar-collapse.show');
      if (collapseEl && window.bootstrap) {
        var inst = window.bootstrap.Collapse.getOrCreateInstance(collapseEl);
        inst.hide();
      }

      if (options.updateHistory) {
        var url = new URL(window.location.href);
        url.searchParams.set('tab', target);
        window.history.pushState({ tab: target }, '', url.toString());
      }
      if (options.trackChange) {
        trackLegacy('tab_change', { calculator: target });
      }
    }

    activateTab(currentTab, { updateHistory: false, trackChange: false });
    trackLegacy('page_view', { calculator: currentTab });

    document.querySelectorAll('.nav-link[data-tab]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        var tabId = link.getAttribute('data-tab');
        if (tabId) activateTab(tabId, { updateHistory: true, trackChange: true });
      });
    });

    window.addEventListener('popstate', function () {
      activateTab(getActiveTabFromUrl(), { updateHistory: false, trackChange: false });
    });

    // Switch back to 2.0 UI buttons
    function bindSwitchToV2(id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('click', function (e) {
        e.preventDefault();
        safeSet(UI_VERSION_KEY, 'v2');
        trackLegacy('ui_version_switched', { from: 'legacy', to: 'v2' });
        var targetUrl = new URL('/', window.location.origin);
        targetUrl.searchParams.set('ui', 'v2');
        if (currentTab && currentTab !== 'sc') {
          targetUrl.searchParams.set('tab', currentTab);
        }
        window.location.assign(targetUrl.toString());
      });
    }
    bindSwitchToV2('switch-to-v2-btn');
    bindSwitchToV2('banner-switch-v2');

    // 1. Semester GPA Calculator (#gbtn)
    var gbtn = document.getElementById('gbtn');
    if (gbtn) {
      gbtn.addEventListener('click', function () {
        var num = 0;
        var den = 0;
        var courses = 0;
        for (var i = 1; i <= 10; i++) {
          var gEl = document.getElementById('g' + i);
          var cEl = document.getElementById('c' + i);
          var g = gEl ? parseFloat(gEl.value) || 0 : 0;
          var c = cEl ? parseFloat(cEl.value) || 0 : 0;
          if (c > 0) {
            num += g * c;
            den += c;
            courses += 1;
          }
        }
        var gpa = den > 0 ? num / den : NaN;
        if (Number.isNaN(gpa)) {
          showErrorModal('Insufficient Data !!');
          return;
        }
        var rounded = roundToTwo(gpa);
        var alertEl = document.querySelector('.alert-grades');
        if (alertEl) alertEl.style.display = 'block';
        renderResult('grades', rounded);
        trackLegacy('computed_gpa', { gpa: rounded, courses: courses, credits: den, trigger: 'submit' });
        trackLegacy('calculation_completed', {
          calculator: 'sc',
          trigger: 'submit',
          score: rounded,
          score_band: getScoreBand('sc', rounded),
        });
      });
    }

    // 2. Quick CGPA Calculator (#submit)
    var submitBtn = document.getElementById('submit');
    if (submitBtn) {
      submitBtn.addEventListener('click', function () {
        var cgpaMsg = document.getElementById('cgpa-msg');
        if (cgpaMsg) cgpaMsg.classList.remove('hide');
        var cgpa = parseFloat((document.getElementById('cgpa') || {}).value);
        var gpa = parseFloat((document.getElementById('gpa') || {}).value);
        var c = parseFloat((document.getElementById('c') || {}).value);
        var tc = parseFloat((document.getElementById('tc') || {}).value);
        var totalCredits = tc + c;
        var res = totalCredits > 0 ? (cgpa * tc + gpa * c) / totalCredits : NaN;
        if (Number.isNaN(res)) {
          showErrorModal('Insufficient Data !!');
          return;
        }
        var rounded = roundToTwo(res);
        var alertEl = document.querySelector('.alert-cgpa-msg');
        if (alertEl) alertEl.style.display = 'block';
        renderResult('cgpa-msg', rounded);
        trackLegacy('computed_qcc', { cgpa: rounded, total_credits: totalCredits, trigger: 'submit' });
        trackLegacy('calculation_completed', {
          calculator: 'gc',
          trigger: 'submit',
          score: rounded,
          score_band: getScoreBand('gc', rounded),
        });
      });
    }

    // 3. Expected Marks Calculator (#ec-submit)
    var ecBtn = document.getElementById('ec-submit');
    if (ecBtn) {
      ecBtn.addEventListener('click', function () {
        var marksCat1 = parseFloat((document.getElementById('cat1') || {}).value);
        var marksCat2 = parseFloat((document.getElementById('cat2') || {}).value);
        var marksDa = parseFloat((document.getElementById('da') || {}).value);
        var marksAl = parseFloat((document.getElementById('al') || {}).value) || 0;
        var labRaw = (document.getElementById('lab') || {}).value;
        var projRaw = (document.getElementById('j-comp') || {}).value;
        var marksLab = labRaw !== '' ? parseFloat(labRaw) : NaN;
        var marksProj = projRaw !== '' ? parseFloat(projRaw) : NaN;
        var marksFat = parseFloat((document.getElementById('fat') || {}).value);

        var hasLab = Number.isFinite(marksLab);
        var hasProj = Number.isFinite(marksProj);
        var internals = (marksCat1 + marksCat2) * 0.5 + marksDa + marksAl;
        var clampedInternals = internals > 60 ? 60 : internals;
        var tot = clampedInternals + marksFat * 0.4;
        var netMarks;
        var mode;
        if (hasLab && hasProj) {
          netMarks = tot * 0.6 + marksLab * 0.2 + marksProj * 0.2;
          mode = 'Theory + Lab + J-Comp';
        } else if (hasLab) {
          netMarks = tot * 0.75 + marksLab * 0.25;
          mode = 'Theory + Lab';
        } else if (hasProj) {
          netMarks = tot * 0.75 + marksProj * 0.25;
          mode = 'Theory + J-Comp';
        } else {
          netMarks = tot;
          mode = 'Theory Only';
        }

        if (Number.isNaN(netMarks)) {
          showErrorModal('Insufficient Data !!');
          return;
        }
        var rounded = roundToTwo(netMarks);
        var alertEl = document.querySelector('.alert-marks');
        if (alertEl) alertEl.style.display = 'block';
        renderResult('marks', rounded);
        trackLegacy('computed_emc', {
          marks: rounded,
          internals: roundToTwo(clampedInternals),
          mode: mode,
          trigger: 'submit',
        });
        trackLegacy('calculation_completed', {
          calculator: 'ec',
          trigger: 'submit',
          score: rounded,
          score_band: getScoreBand('ec', rounded),
        });
      });
    }

    // 4. All-Semester CGPA Calculator (#sem-cgpa-btn)
    var semBtn = document.getElementById('sem-cgpa-btn');
    if (semBtn) {
      semBtn.addEventListener('click', function () {
        var weighted = 0;
        var totalCredits = 0;
        var semesters = 0;
        for (var i = 1; i <= 8; i++) {
          var gRaw = (document.getElementById('gpa' + i) || {}).value || '';
          var cRaw = (document.getElementById('fc' + i) || {}).value || '';
          if (gRaw !== '' && cRaw !== '') {
            var g = parseFloat(gRaw);
            var c = parseFloat(cRaw);
            if (Number.isFinite(g) && Number.isFinite(c) && c > 0) {
              weighted += g * c;
              totalCredits += c;
              semesters += 1;
            }
          }
        }
        if (totalCredits === 0) {
          showErrorModal('Total credits cannot be zero');
          return;
        }
        var fcgpa = weighted / totalCredits;
        if (Number.isNaN(fcgpa)) {
          showErrorModal('Insufficient Data !!');
          return;
        }
        var rounded = roundToTwo(fcgpa);
        var alertEl = document.querySelector('.alert-fcgpa');
        if (alertEl) alertEl.style.display = 'block';
        renderResult('fcgpa', rounded);
        trackLegacy('computed_ascc', {
          cgpa: rounded,
          semesters: semesters,
          total_credits: totalCredits,
          trigger: 'submit',
        });
        trackLegacy('calculation_completed', {
          calculator: 'fc',
          trigger: 'submit',
          score: rounded,
          score_band: getScoreBand('fc', rounded),
        });
      });
    }
  });
})();
