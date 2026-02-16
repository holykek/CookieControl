/**
 * CookieControl — Generic consent banner handler (fallback).
 * Looks for any visible consent-like bar/modal with Accept / Reject-style buttons.
 * Catches many custom and smaller CMPs (e.g. redis.io, Termly-like, custom banners).
 */

(function () {
  const ns = window.CookieControl || {};
  const qAll = ns.queryAll;
  const visible = ns.isVisible;
  const click = ns.safeClick;
  const text = ns.normalizedText;

  const NAME = 'Generic';

  const BANNER_HINTS = [
    'cookie', 'consent', 'gdpr', 'privacy', 'ccpa', 'banner', 'cookie-banner',
    'cookie_notice', 'cookie-notice', 'cookieconsent', 'cookie-consent',
    'accept-cookies', 'cookie-policy', 'termly', 'cookieyes', 'cookie-info',
  ];

  const REJECT_PHRASES = [
    'reject all', 'decline all', 'reject', 'decline', 'only essential', 'essential only',
    'necessary only', 'strictly necessary', 'no thanks', 'deny', 'refuse', 'alle ablehnen',
    'tout refuser', 'rechazar', 'only required', 'accept necessary only',
  ];

  const ACCEPT_PHRASES = [
    'accept all', 'accept', 'allow all', 'agree', 'allow', 'accept all cookies',
    'accept cookies', 'agree to all', 'alle akzeptieren', 'tout accepter',
    'aceptar todo', 'accept and close', 'i agree',
  ];

  /** Match short "No" / "Yes" buttons (e.g. redis.io) without matching "know", "yes please" in nav, etc. */
  function isNoButton(t) {
    if (!t || t.length > 15) return false;
    return t === 'no' || t === 'no.' || t === 'no,' || t === 'no!' || /^no[\s,.]/.test(t) || t === 'no thanks';
  }
  function isYesButton(t) {
    if (!t || t.length > 20) return false;
    return t === 'yes' || t === 'yes.' || t === 'yes,' || t === 'yes!' || /^yes[\s,.]/i.test(t) || t === 'yes please';
  }

  function isLikelyConsentContainer(el) {
    if (!el || !el.className) return false;
    const str = (el.className + ' ' + (el.id || '')).toLowerCase();
    return BANNER_HINTS.some((h) => str.includes(h));
  }

  /** Collect buttons from root and from inside any shadow roots (e.g. web components). */
  function getAllButtons(root) {
    const list = [];
    const sel = 'button, a[role="button"], [role="button"]';
    try {
      list.push(...qAll(root, sel));
      const all = root.querySelectorAll('*');
      for (const el of all) {
        if (el.shadowRoot) {
          list.push(...qAll(el.shadowRoot, sel));
          const deep = el.shadowRoot.querySelectorAll('*');
          for (const sub of deep) {
            if (sub.shadowRoot) list.push(...qAll(sub.shadowRoot, sel));
          }
        }
      }
    } catch (_) {}
    return list;
  }

  function getBannerContainer(btn) {
    if (!btn || !btn.closest) return null;
    let container = btn.closest('div, section, aside, [role="dialog"], [role="alertdialog"]');
    if (!container || container === document.body || !visible(container)) return null;
    if (container.clientHeight <= 500 && container.clientWidth > 100) return container;
    let parent = btn.parentElement;
    for (let i = 0; i < 8 && parent && parent !== document.body; i++) {
      if (visible(parent) && parent.clientHeight <= 500 && parent.clientWidth > 100) return parent;
      parent = parent.parentElement;
    }
    return container;
  }

  function findBannerRoot() {
    const root = document.body || document.documentElement;
    if (!root) return null;
    const candidates = root.querySelectorAll(
      '[class*="cookie"], [id*="cookie"], [class*="consent"], [id*="consent"], ' +
      '[class*="gdpr"], [role="dialog"], [class*="banner"], [class*="cookie-notice"], ' +
      '[class*="termly"], [class*="cookieyes"], [data-testid*="cookie"]'
    );
    for (const el of candidates) {
      if (!visible(el)) continue;
      if (isLikelyConsentContainer(el)) return el;
      const parent = el.closest && el.closest('[class*="cookie"], [class*="consent"], [role="dialog"]');
      if (parent && visible(parent)) return parent;
    }
    const allButtons = getAllButtons(root);
    for (const btn of allButtons) {
      const t = text(btn);
      if (REJECT_PHRASES.some((p) => t.includes(p)) || ACCEPT_PHRASES.some((p) => t.includes(p))) {
        const container = getBannerContainer(btn);
        if (container) return container;
      }
    }
    let noBtn = null, yesBtn = null;
    for (const btn of allButtons) {
      if (!visible(btn)) continue;
      const t = text(btn);
      if (isNoButton(t)) noBtn = btn;
      if (isYesButton(t)) yesBtn = btn;
    }
    if (noBtn && yesBtn) {
      let container = noBtn.parentElement;
      while (container && container !== root && !container.contains(yesBtn)) container = container.parentElement;
      if (container && container !== root && visible(container)) return container;
      container = yesBtn.parentElement;
      while (container && container !== root && !container.contains(noBtn)) container = container.parentElement;
      if (container && container !== root && visible(container)) return container;
    }
    return null;
  }

  function detect() {
    return findBannerRoot() !== null;
  }

  function getButtonsInScope(scope) {
    const sel = 'button, a[role="button"], [role="button"], [onclick]';
    const list = [];
    try {
      if (scope) list.push(...qAll(scope, sel));
      if (scope && scope.shadowRoot) {
        list.push(...qAll(scope.shadowRoot, sel));
        scope.shadowRoot.querySelectorAll('*').forEach((el) => {
          if (el.shadowRoot) list.push(...qAll(el.shadowRoot, sel));
        });
      }
    } catch (_) {}
    return list;
  }

  function findRejectButton(root) {
    const scope = root || document.body;
    const candidates = scope ? getButtonsInScope(scope) : getAllButtons(document.body);
    for (const el of candidates) {
      if (!visible(el)) continue;
      const t = text(el);
      if (REJECT_PHRASES.some((p) => t.includes(p)) || isNoButton(t)) return el;
    }
    return null;
  }

  function findAcceptButton(root) {
    const scope = root || document.body;
    const candidates = scope ? getButtonsInScope(scope) : getAllButtons(document.body);
    for (const el of candidates) {
      if (!visible(el)) continue;
      const t = text(el);
      if (ACCEPT_PHRASES.some((p) => t.includes(p)) || isYesButton(t)) return el;
    }
    return null;
  }

  function applyConsent(ruleSet) {
    const banner = findBannerRoot();
    if (!banner) return false;

    const essentialOnly = ruleSet && ruleSet.essential === true &&
      (ruleSet.functional !== true && ruleSet.analytics !== true && ruleSet.marketing !== true);

    if (essentialOnly) {
      const btn = findRejectButton(banner) || findRejectButton(document.body);
      if (btn && click(btn)) return true;
    } else {
      const btn = findAcceptButton(banner) || findAcceptButton(document.body);
      if (btn && click(btn)) return true;
    }
    return false;
  }

  const handler = { name: NAME, detect, applyConsent };
  if (ns.registerCMP) ns.registerCMP(handler);
  window.CookieControl = ns;
})();
