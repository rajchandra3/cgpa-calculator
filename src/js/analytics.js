(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var MIXPANEL_TOKEN = '7ff5ca7b4aa0bef4db830b057c9076a2';
  var MIXPANEL_SRC = 'https://cdn4.mxpnl.com/libs/mixpanel-2-latest.min.js';
  var scriptInjected = false;
  var fallbackTimer = null;

  function injectMixpanelScript() {
    if (scriptInjected) return;
    scriptInjected = true;
    if (fallbackTimer !== null) {
      window.clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }

    var b = document.createElement('script');
    b.type = 'text/javascript';
    b.async = true;
    b.fetchPriority = 'low';
    b.src = MIXPANEL_SRC;

    var d = document.getElementsByTagName('script')[0];
    if (d && d.parentNode) {
      d.parentNode.insertBefore(b, d);
    } else if (document.head) {
      document.head.appendChild(b);
    } else if (document.documentElement) {
      document.documentElement.appendChild(b);
    }
  }

  function scheduleMixpanelLoad() {
    if (scriptInjected) return;
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(injectMixpanelScript, { timeout: 1200 });
      fallbackTimer = window.setTimeout(injectMixpanelScript, 1200);
    } else {
      injectMixpanelScript();
    }
  }

  // Mixpanel loader stub (token 7ff5ca7b4aa0bef4db830b057c9076a2)
  (function (c, a) {
    if (!a.__SV) {
      var b = window;
      try {
        var d, m, j, k = b.location, f = k.hash;
        d = function (str, key) {
          return (m = str.match(new RegExp(key + '=([^&]*)'))) ? m[1] : null;
        };
        if (f && d(f, 'state')) {
          j = JSON.parse(decodeURIComponent(d(f, 'state')));
          if (j.action === 'mpeditor') {
            b.sessionStorage.setItem('_mpcehash', f);
            history.replaceState(j.desiredHash || '', c.title, k.pathname + k.search);
          }
        }
      } catch (err) {
        // Ignore hash parsing errors
      }
      var l, h;
      window.mixpanel = a;
      a._i = [];
      a.init = function (token, cfg, name) {
        function bindMethod(target, methodPath) {
          var parts = methodPath.split('.');
          if (parts.length === 2) {
            target = target[parts[0]];
            methodPath = parts[1];
          }
          target[methodPath] = function () {
            target.push([methodPath].concat(Array.prototype.slice.call(arguments, 0)));
          };
        }
        var instance = a;
        if (typeof name !== 'undefined') {
          instance = a[name] = [];
        } else {
          name = 'mixpanel';
        }
        instance.people = instance.people || [];
        instance.toString = function (includeSub) {
          var str = 'mixpanel';
          if (name !== 'mixpanel') str += '.' + name;
          if (!includeSub) str += ' (stub)';
          return str;
        };
        instance.people.toString = function () {
          return instance.toString(1) + '.people (stub)';
        };
        l = 'disable time_event track track_pageview track_links track_forms track_with_groups add_group set_group remove_group register register_once alias unregister identify name_tag set_config reset opt_in_tracking opt_out_tracking has_opted_in_tracking has_opted_out_tracking clear_opt_in_out_tracking people.set people.set_once people.unset people.increment people.append people.union people.track_charge people.clear_charges people.delete_user people.remove'.split(' ');
        for (h = 0; h < l.length; h++) bindMethod(instance, l[h]);
        var groupMethods = 'set set_once union unset remove delete'.split(' ');
        instance.get_group = function () {
          function bindGroup(method) {
            grp[method] = function () {
              grp._q.push([groupCall, [method].concat(Array.prototype.slice.call(arguments, 0))]);
            };
          }
          var grp = { _q: [] };
          var groupCall = ['get_group'].concat(Array.prototype.slice.call(arguments, 0));
          for (var i = 0; i < groupMethods.length; i++) bindGroup(groupMethods[i]);
          return grp;
        };
        a._i.push([token, cfg, name]);
      };
      a.__SV = 1.2;

      if (c.readyState === 'complete') {
        scheduleMixpanelLoad();
      } else {
        b.addEventListener('load', scheduleMixpanelLoad, { once: true });
      }
    }
  })(document, window.mixpanel || []);

  if (window.mixpanel && typeof window.mixpanel.init === 'function') {
    window.mixpanel.init(MIXPANEL_TOKEN);
  }

  var BEACON_EVENTS = {
    promo_clicked: true,
    contribute_clicked: true,
    discussions_clicked: true,
    announcement_clicked: true,
    ui_version_switched: true,
    next_step_clicked: true,
    tool_nav_clicked: true,
  };

  function toSnakeCase(raw, maxLen) {
    var str = String(raw || '')
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (maxLen && str.length > maxLen) {
      str = str.slice(0, maxLen).replace(/_+$/g, '');
    }
    return str;
  }

  function toGa4EventName(rawName) {
    var name = toSnakeCase(rawName, 40);
    if (!name) return '';
    if (!/^[a-z]/.test(name)) {
      name = ('e_' + name).slice(0, 40);
    }
    if (name === 'page_view') {
      return 'calculator_view';
    }
    return name;
  }

  function sanitizeGa4Params(rawProps, gaEventName) {
    var out = {};
    if (rawProps && typeof rawProps === 'object') {
      var keys = Object.keys(rawProps);
      for (var i = 0; i < keys.length; i++) {
        var rawKey = keys[i];
        if (gaEventName === 'calculator_view' && rawKey === 'referrer') {
          continue;
        }
        var key = toSnakeCase(rawKey, 40);
        if (!key) continue;
        var val = rawProps[rawKey];
        if (typeof val === 'string') {
          var trimmed = val.trim();
          if (trimmed.length > 100) trimmed = trimmed.slice(0, 100);
          out[key] = trimmed;
        } else if (typeof val === 'number') {
          if (Number.isFinite(val)) out[key] = val;
        } else if (typeof val === 'boolean') {
          out[key] = val;
        }
      }
    }
    if (gaEventName && BEACON_EVENTS[gaEventName]) {
      out.transport_type = 'beacon';
    }
    return out;
  }

  window.setAnalyticsUserProperties = function setAnalyticsUserProperties(props) {
    var clean = sanitizeGa4Params(props, '');
    if (!Object.keys(clean).length) return;

    try {
      window.mixpanel?.register?.(clean);
    } catch (err) {
      // Ignore Mixpanel register errors
    }

    try {
      if (!window['ga-disable-G-65WDQ61WWG']) {
        window.gtag?.('set', 'user_properties', clean);
      }
    } catch (err) {
      // Ignore GA user_properties errors
    }
  };

  window.track = function track(eventName, props) {
    if (!eventName) return;
    var payload = props && typeof props === 'object' ? props : {};

    try {
      window.mixpanel?.track?.(eventName, payload);
    } catch (err) {
      // Ignore analytics transport errors
    }

    try {
      if (!window['ga-disable-G-65WDQ61WWG']) {
        var gaEventName = toGa4EventName(eventName);
        if (gaEventName) {
          var gaPayload = sanitizeGa4Params(payload, gaEventName);
          window.gtag?.('event', gaEventName, gaPayload);
        }
      }
    } catch (err) {
      // Ignore GA transport errors
    }
  };
})();
