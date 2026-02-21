/**
 * CookieControl — UK news sites with consent-or-choice banners (Telegraph, etc.).
 * Aggressively finds and clicks Essential-only or Accept.
 */
(function () {
  const HOSTS = /telegraph\.co\.uk|independent\.co\.uk|theguardian\.com|thetimes\.co\.uk|thesun\.co\.uk|mirror\.co\.uk|express\.co\.uk|standard\.co\.uk/i;
  if (!HOSTS.test(window.location.hostname || '')) return;

  let clicked = false;
  const MAX_ATTEMPTS = 120;
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
    const bodyText = (doc.body.innerText || '').toLowerCase();
    const rejectTiedToPay = /reject.*(purchase|buy|pay|subscription|subscribe)/i.test(bodyText);
    const forceAccept = essential && rejectTiedToPay;

    function walk(rootEl, out) {
      if (!rootEl) return;
      try {
        const list = (rootEl.querySelectorAll && rootEl.querySelectorAll('button, [role="button"]')) || [];
        for (let i = 0; i < list.length; i++) out.push(list[i]);
        const all = rootEl.querySelectorAll ? rootEl.querySelectorAll('*') : [];
        for (let j = 0; j < all.length; j++) {
          if (all[j].shadowRoot) walk(all[j].shadowRoot, out);
        }
      } catch (e) {}
    }
    const nodes = [];
    walk(doc.body, nodes);
    if (doc.head) walk(doc.head, nodes);

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

    const rejectPhrases = ['essential cookies only', 'essential only', 'necessary only', 'reject all', 'refuse all', 'reject', 'decline'];
    const acceptPhrases = ['i accept', 'accept all', 'allow all', 'accept', 'agree', 'i agree'];

    for (let i = 0; i < nodes.length; i++) {
      const t = textOf(nodes[i]);
      if (forceAccept || !essential) {
        if (acceptPhrases.some(function (p) { return t.indexOf(p) !== -1; }) && t.length < 60) {
          if (doClick(nodes[i])) {
            clicked = true;
            return true;
          }
        }
      } else {
        if (rejectPhrases.some(function (p) { return t.indexOf(p) !== -1; }) && t.indexOf('purchase') === -1 && t.indexOf('subscribe') === -1) {
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
      if (tryClick(essential)) clearInterval(interval);
    });
  }

  const interval = setInterval(run, 500);
  run();
})();
