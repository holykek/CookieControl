/**
 * CookieControl — French news sites (Le Figaro, Le Monde, etc.).
 */
(function () {
  const HOSTS = /lefigaro\.fr|lemonde\.fr|leparisien\.fr|liberation\.fr|france24\.com|lexpress\.fr/i;
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

  function inReloadCooldown() {
    try {
      var raw = sessionStorage.getItem('CookieControl_cooldown');
      if (!raw) return false;
      var parts = raw.split('|');
      var ts = parseInt(parts[0], 10);
      var origin = parts[1] || '';
      var key = (typeof location !== 'undefined' && (location.origin || location.hostname)) || '';
      return key && origin === key && !isNaN(ts) && (Date.now() - ts) < 12000;
    } catch (e) { return false; }
  }

  function setCooldown() {
    try {
      var key = (typeof location !== 'undefined' && (location.origin || location.hostname)) || '';
      if (key) sessionStorage.setItem('CookieControl_cooldown', Date.now() + '|' + key);
    } catch (e) {}
  }

  function tryClick(essential) {
    if (clicked) return true;
    if (inReloadCooldown()) return false;
    const doc = document;
    if (!doc || !doc.body) return false;
    const bodyText = (doc.body.innerText || '').toLowerCase();
    var rejectTiedToSubscribe = /(reject|refuse|rechazar|rifiuta|refuser|ablehnen).*(subscribe|suscripción|suscripcion|abonnement|s'abonner|abbonamento|pagar|pay|purchase|buy|comprar)/i.test(bodyText) ||
      /(subscribe|suscripción|suscripcion|abonnement|s'abonner|pagar|pay|comprar|buy).*(reject|refuse|rechazar|rifiuta|refuser)/i.test(bodyText) ||
      /obligatoire|accéder gratuitement|free.*by accepting/i.test(bodyText);
    var noRejectOption = /(accepter|accept|subscribe|suscripción|suscripcion|s'abonner|abonnement)/i.test(bodyText) && !/(refuser|reject|refuse)/i.test(bodyText);
    var forceAccept = essential && (rejectTiedToSubscribe || noRejectOption);

    function walk(rootEl, out) {
      if (!rootEl) return;
      try {
        const sel = 'button, [role="button"]';
        const list = (rootEl.querySelectorAll && rootEl.querySelectorAll(sel)) || [];
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

    function wouldNavigate(el) {
      if (!el || (el.tagName || '').toUpperCase() !== 'A') return false;
      var h = (el.getAttribute && el.getAttribute('href')) || '';
      if (!h) return false;
      h = h.trim();
      if (!h || h === '#' || h === '') return false;
      if (/^javascript\s*:/i.test(h)) return false;
      if (h.charAt(0) === '#') return false;
      return true;
    }

    var consentHints = ['cookie', 'consent', 'gdpr', 'privacy', 'banner', 'données', 'partenaires'];
    function inConsentContext(el) {
      var node = el;
      for (var u = 0; u < 15 && node && node !== doc.body; u++) {
        var c = (node.className && String(node.className)) || '';
        var id = (node.id || '');
        var s = (c + ' ' + id).toLowerCase();
        if (consentHints.some(function (h) { return s.indexOf(h) !== -1; })) return true;
        node = node.parentElement;
      }
      return false;
    }

    function safeToClick(el) {
      var tag = (el.tagName || '').toUpperCase();
      var role = el.getAttribute && el.getAttribute('role');
      return (tag === 'BUTTON' || role === 'button');
    }

    function doClick(el) {
      if (!visible(el)) return false;
      if (!safeToClick(el)) return false;
      try {
        el.click();
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        return true;
      } catch (e) {
        return false;
      }
    }

    const rejectPhrases = ['refuse all', 'tout refuser', 'refuser tout', 'essential only', 'essential cookies only', 'reject all', 'continuer sans accepter', 'refuser'];
    const acceptAllPhrases = ['accept all', 'tout accepter', 'accepter tout', 'allow all'];
    const acceptPhrases = ['accept all', 'tout accepter', 'accepter tout', 'accepter et continuer', 'i accept', 'j\'accepte', 'accept', 'accepter', 'agree'];

    for (let pass = 0; pass < 2; pass++) {
      const preferAcceptAll = (pass === 0) && (forceAccept || !essential);
      for (let i = 0; i < nodes.length; i++) {
        const t = textOf(nodes[i]);
        if (forceAccept || !essential) {
          const matchesAccept = acceptPhrases.some(function (p) { return t.indexOf(p) !== -1; });
          const matchesAcceptAll = acceptAllPhrases.some(function (p) { return t.indexOf(p) !== -1; });
          if (matchesAccept && t.length < 80 && (!preferAcceptAll || matchesAcceptAll)) {
            if (doClick(nodes[i])) {
              setCooldown();
              clicked = true;
              return true;
            }
          }
        } else {
          const isSubscribe = /subscribe|suscripción|suscripcion|s'abonner|abonnement|abbonamento|pagar|pay|comprar/i.test(t);
          if (rejectPhrases.some(function (p) { return t.indexOf(p) !== -1; }) && !isSubscribe) {
            if (doClick(nodes[i])) {
              setCooldown();
              clicked = true;
              return true;
            }
          }
        }
      }
    }
    if (essential && !clicked && forceAccept) {
      for (let i = 0; i < nodes.length; i++) {
        const t = textOf(nodes[i]);
        if (acceptPhrases.some(function (p) { return t.indexOf(p) !== -1; }) && t.indexOf('abonner') === -1 && t.length < 80) {
          if (doClick(nodes[i])) { setCooldown(); clicked = true; return true; }
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
