/**
 * CookieControl — OneTrust CMP handler (full implementation).
 * Only interacts with visible, user-facing consent UI. No cookie injection.
 */

(function () {
  const ns = window.CookieControl || {};
  const q = ns.queryOne;
  const qAll = ns.queryAll;
  const visible = ns.isVisible;
  const click = ns.safeClick;
  const text = ns.normalizedText;

  const NAME = 'OneTrust';

  /** OneTrust banner and button selectors (common patterns). */
  const SELECTORS = {
    BANNER: '#onetrust-banner-sdk, [id^="onetrust"], .onetrust-pc-dark-filter',
    ACCEPT_ALL: '#onetrust-accept-btn-handler, button[class*="accept"], [id*="accept"]',
    REJECT_ALL: '#onetrust-reject-all-handler, button[class*="reject"], [id*="reject"]',
    PREFERENCE_CENTER: '#onetrust-pc-btn-handler, [id*="pc-btn"], [class*="preference"]',
    SAVE_SETTINGS: '#onetrust-pc-sdk button[id*="save"], .save-preference-btn-handler',
    CLOSE: '.onetrust-close-btn-handler, [class*="close-btn"]',
  };

  /**
   * Detect if OneTrust consent UI is present and visible.
   * @returns {boolean}
   */
  function detect() {
    const root = document.body || document.documentElement;
    if (!root) return false;
    const banner = root.querySelector('#onetrust-banner-sdk') ||
      root.querySelector('[id^="onetrust-banner"]') ||
      root.querySelector('.onetrust-pc-dark-filter');
    if (!banner) return false;
    return visible(banner);
  }

  /**
   * Get category labels this CMP exposes (for PRO category-based rules). OneTrust uses standard categories.
   * @returns {string[]}
   */
  function getCategories() {
    return ['essential', 'functional', 'analytics', 'marketing'];
  }

  /**
   * Find visible button that matches reject/accept only essential intent.
   */
  function findRejectButton(root) {
    const candidates = qAll(root, 'button, a[role="button"], [onclick]');
    const rejectPhrases = ['reject all', 'reject', 'only essential', 'essential only', 'necessary only', 'decline', 'no thanks', 'alle ablehnen', 'tout refuser', 'rechazar', 'avvisa', 'endast nödvändiga', 'nej tack', 'afvis', 'afvis alle', 'weiger', 'rifiuta', 'rejeitar', 'odmítnout', 'hyväksy vain'];
    for (const el of candidates) {
      if (!visible(el)) continue;
      const t = text(el);
      if (rejectPhrases.some((p) => t.includes(p))) return el;
    }
    const byId = q(root, SELECTORS.REJECT_ALL);
    if (byId && visible(byId)) return byId;
    return null;
  }

  /**
   * Find visible "Accept all" button.
   */
  function findAcceptAllButton(root) {
    const byId = q(root, SELECTORS.ACCEPT_ALL);
    if (byId && visible(byId)) return byId;
    const candidates = qAll(root, 'button, a[role="button"], [onclick]');
    const acceptPhrases = ['accept all', 'accept', 'allow all', 'agree to all', 'allow', 'accept all cookies', 'alle akzeptieren', 'tout accepter', 'aceptar todo', 'acceptera alla', 'acceptera', 'godkänn', 'tillåt alla', 'godta alle', 'accepter alle', 'hyväksy kaikki', 'accepteer', 'accetta', 'aceitar', 'přijmout'];
    for (const el of candidates) {
      if (!visible(el)) continue;
      const t = text(el);
      if (acceptPhrases.some((p) => t.includes(p))) return el;
    }
    return null;
  }

  /**
   * Apply consent: Essential only → Reject all; Accept all → Accept all button.
   * @param {{ essential?: boolean, functional?: boolean, analytics?: boolean, marketing?: boolean }} ruleSet
   * @returns {boolean} - True if an action was taken.
   */
  function applyConsent(ruleSet) {
    const root = document.body || document.documentElement;
    if (!root) return false;

    const essentialOnly = ruleSet && ruleSet.essential === true &&
      (ruleSet.functional !== true && ruleSet.analytics !== true && ruleSet.marketing !== true);

    if (essentialOnly) {
      const rejectBtn = findRejectButton(root);
      if (rejectBtn && click(rejectBtn)) return true;
    } else {
      const acceptBtn = findAcceptAllButton(root);
      if (acceptBtn && click(acceptBtn)) return true;
    }
    return false;
  }

  const handler = { name: NAME, detect, getCategories, applyConsent };
  if (ns.registerCMP) ns.registerCMP(handler);
  window.CookieControl = ns;
})();
