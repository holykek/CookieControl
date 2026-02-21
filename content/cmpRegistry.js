/**
 * CookieControl — CMP handler registry. Register handlers and select first that detects.
 * Each handler implements: { name, detect(), getCategories?(), applyConsent(ruleSet) }.
 */

(function () {
  const ns = window.CookieControl || {};
  const handlers = [];

  /**
   * Register a CMP handler. Order matters: first to detect() wins.
   * @param {{ name: string, detect: () => boolean, getCategories?: () => string[], applyConsent: (object) => boolean }} handler
   */
  function register(handler) {
    if (handler && typeof handler.detect === 'function' && typeof handler.applyConsent === 'function') {
      handlers.push(handler);
    }
  }

  /**
   * Find first registered handler that detects the current page.
   * Gated by AUTO_DETECT_CMP and per-CMP feature flags.
   * @returns {{ name: string, handler: object }|null}
   */
  function detectCMPGated() {
    if (!ns.isFeatureEnabled || !ns.isFeatureEnabled('AUTO_DETECT_CMP')) return null;
    for (const h of handlers) {
      const enabled =
        (h.name === 'OneTrust' && ns.isFeatureEnabled('CMP_ONETRUST')) ||
        (h.name === 'Cookiebot' && ns.isFeatureEnabled('CMP_COOKIEBOT')) ||
        (h.name === 'Quantcast' && ns.isFeatureEnabled('CMP_QUANTCAST')) ||
        (h.name === 'CookieYes' && ns.isFeatureEnabled('CMP_COOKIEYES')) ||
        (h.name === 'Didomi' && ns.isFeatureEnabled('CMP_DIDOMI')) ||
        (h.name === 'Iubenda' && ns.isFeatureEnabled('CMP_IUBENDA')) ||
        (h.name === 'Generic' && ns.isFeatureEnabled('CMP_GENERIC'));
      if (!enabled) continue;
      try {
        if (h.detect()) return { name: h.name, handler: h };
      } catch (_) {}
    }
    return null;
  }

  ns.registerCMP = register;
  ns.detectCMP = detectCMPGated;
  ns._handlers = handlers;
  window.CookieControl = ns;
})();
