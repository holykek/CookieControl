/**
 * CookieControl — Daily Mail consent-or-pay banner.
 * Aggressively finds and clicks the exact button structure.
 */
(function () {
  const DAILYMAIL_MATCH = /dailymail\.co\.uk/i;
  if (!DAILYMAIL_MATCH.test(window.location.hostname || '')) return;

  let clicked = false;
  const MAX_ATTEMPTS = 120; // 60 seconds at 500ms
  let attempts = 0;

  function getPreference(cb) {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
        cb(true);
        return;
      }
      chrome.storage.local.get(['cookieControl_globalRules'], function (r) {
        const rules = r && r.cookieControl_globalRules;
        const essential = !rules || (rules.essential === true && !rules.functional && !rules.analytics && !rules.marketing);
        cb(essential);
      });
    } catch (e) {
      cb(true);
    }
  }

  function tryClick(essential) {
    if (clicked) return true;
    const doc = document;
    if (!doc || !doc.body) return false;
    const root = doc.body;
    function walkShadow(rootEl, out) {
      if (!rootEl) return;
      try {
        const sel = 'button, [role="button"]';
        const list = rootEl.querySelectorAll ? rootEl.querySelectorAll(sel) : [];
        for (let i = 0; i < list.length; i++) out.push(list[i]);
        const all = rootEl.querySelectorAll ? rootEl.querySelectorAll('*') : [];
        for (let j = 0; j < all.length; j++) {
          if (all[j].shadowRoot) walkShadow(all[j].shadowRoot, out);
        }
      } catch (e) {}
    }
    const nodes = [];
    walkShadow(root, nodes);
    if (doc.head) walkShadow(doc.head, nodes);

    function textOf(el) {
      if (!el) return '';
      return ((el.textContent || '') + ' ' + (el.getAttribute && (el.getAttribute('aria-label') || el.getAttribute('title') || ''))).replace(/\s+/g, ' ').trim().toLowerCase();
    }

    function visible(el) {
      if (!el || !el.getBoundingClientRect) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }

    function doClick(el) {
      if (!visible(el)) return false;
      try {
        el.click();
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        return true;
      } catch (e) {
        return false;
      }
    }

    const rejectTiedToPay = /reject.*(purchase|buy|pay|subscription|subscribe)|(purchase|buy|pay|subscription).*reject/i;
    const forceAccept = essential && rejectTiedToPay.test((doc.body && doc.body.innerText) || '');
    for (let i = 0; i < nodes.length; i++) {
      const t = textOf(nodes[i]);
      if (forceAccept || !essential) {
        if (t.indexOf('accept') !== -1 && t.length < 60) {
          if (doClick(nodes[i])) {
            clicked = true;
            return true;
          }
        }
      } else {
        if ((t.indexOf('reject') !== -1 || t.indexOf('refuse') !== -1) && t.indexOf('purchase') === -1 && t.indexOf('subscribe') === -1 && t.indexOf('buy') === -1) {
          if (doClick(nodes[i])) {
            clicked = true;
            return true;
          }
        }
      }
    }
    return false;
  }

  function run() {
    if (clicked || attempts >= MAX_ATTEMPTS) return;
    attempts++;
    getPreference(function (essential) {
      if (tryClick(essential)) {
        clearInterval(interval);
      }
    });
  }

  const interval = setInterval(run, 500);
  run();
})();
