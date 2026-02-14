/**
 * CookieControl — Rule evaluation: global + per-site → single rule set for executor.
 * Free: global "reject non-essential" + basic per-site remember. PRO: per-site overrides (stubbed).
 */

(function () {
  const ns = window.CookieControl || {};

  /**
   * Get the rule set to apply for the current page.
   * Uses getRulesForCurrentDomain() which merges global + per-site (when PRO/per-site is used).
   * @returns {Promise<{ essential: boolean, functional: boolean, analytics: boolean, marketing: boolean }>}
   */
  async function getRuleSetForPage() {
    if (!ns.getRulesForCurrentDomain) return ns.DEFAULT_GLOBAL_RULES || defaultRules();
    const rules = await ns.getRulesForCurrentDomain();
    return { ...defaultRules(), ...rules };
  }

  function defaultRules() {
    return {
      essential: true,
      functional: false,
      analytics: false,
      marketing: false,
    };
  }

  ns.getRuleSetForPage = getRuleSetForPage;
  window.CookieControl = ns;
})();
