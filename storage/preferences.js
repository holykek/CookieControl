/**
 * CookieControl — Global and per-site rule storage (chrome.storage.local).
 * Keys: cookieControl_globalRules, cookieControl_domainRules, cookieControl_lastAction_<domain>
 */

(function () {
  const ns = window.CookieControl || {};
  const STORAGE_KEYS = {
    GLOBAL_RULES: 'cookieControl_globalRules',
    DOMAIN_RULES: 'cookieControl_domainRules',
    LAST_ACTION_PREFIX: 'cookieControl_lastAction_',
    PRO: 'cookieControl_pro',
  };

  /** Default Free behavior: accept essential only. */
  const DEFAULT_GLOBAL_RULES = {
    essential: true,
    functional: false,
    analytics: false,
    marketing: false,
  };

  /**
   * Get current hostname for domain-based storage (no port).
   * @returns {string}
   */
  function getCurrentDomain() {
    try {
      return window.location.hostname || '';
    } catch {
      return '';
    }
  }

  /**
   * Get global rules from storage.
   * @returns {Promise<{ essential: boolean, functional: boolean, analytics: boolean, marketing: boolean }>}
   */
  function getGlobalRules() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.GLOBAL_RULES], (result) => {
        const stored = result[STORAGE_KEYS.GLOBAL_RULES];
        resolve(stored && typeof stored === 'object' ? { ...DEFAULT_GLOBAL_RULES, ...stored } : { ...DEFAULT_GLOBAL_RULES });
      });
    });
  }

  /**
   * Set global rules.
   * @param {object} rules
   * @returns {Promise<void>}
   */
  function setGlobalRules(rules) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEYS.GLOBAL_RULES]: rules }, resolve);
    });
  }

  /**
   * Get per-site rules (object keyed by domain). PRO: custom overrides; Free: last action (basic).
   * @returns {Promise<Record<string, object>>}
   */
  function getDomainRules() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.DOMAIN_RULES], (result) => {
        const stored = result[STORAGE_KEYS.DOMAIN_RULES];
        resolve(stored && typeof stored === 'object' ? stored : {});
      });
    });
  }

  /**
   * Get rules for current domain (per-site override or global).
   * @returns {Promise<{ essential: boolean, functional: boolean, analytics: boolean, marketing: boolean }>}
   */
  async function getRulesForCurrentDomain() {
    const domain = getCurrentDomain();
    const [global, domainRules] = await Promise.all([getGlobalRules(), getDomainRules()]);
    const override = domain && domainRules[domain];
    if (override && typeof override === 'object') {
      return { ...DEFAULT_GLOBAL_RULES, ...global, ...override };
    }
    return { ...DEFAULT_GLOBAL_RULES, ...global };
  }

  /**
   * Save last action for a domain (Free: basic per-site remember).
   * @param {object} ruleSet - Rule set that was applied
   * @param {string} [domain] - Domain to key by; if omitted uses getCurrentDomain()
   * @returns {Promise<void>}
   */
  function setLastActionForDomain(ruleSet, domain) {
    const d = domain || getCurrentDomain();
    if (!d) return Promise.resolve();
    const key = STORAGE_KEYS.LAST_ACTION_PREFIX + d;
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: { ruleSet, at: Date.now() } }, resolve);
    });
  }

  /**
   * Get last action for a domain (for popup display).
   * @param {string} domain
   * @returns {Promise<{ ruleSet: object, at: number }|null>}
   */
  function getLastActionForDomain(domain) {
    const key = STORAGE_KEYS.LAST_ACTION_PREFIX + (domain || getCurrentDomain());
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key] || null);
      });
    });
  }

  ns.getCurrentDomain = getCurrentDomain;
  ns.getGlobalRules = getGlobalRules;
  ns.setGlobalRules = setGlobalRules;
  ns.getDomainRules = getDomainRules;
  ns.getRulesForCurrentDomain = getRulesForCurrentDomain;
  ns.setLastActionForDomain = setLastActionForDomain;
  ns.getLastActionForDomain = getLastActionForDomain;
  ns.DEFAULT_GLOBAL_RULES = DEFAULT_GLOBAL_RULES;
  ns.STORAGE_KEYS = STORAGE_KEYS;
  window.CookieControl = ns;

  if (typeof window !== 'undefined') {
    ns._isPro = false;
    chrome.storage.local.get([STORAGE_KEYS.PRO], (result) => {
      ns._isPro = !!result[STORAGE_KEYS.PRO];
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes[STORAGE_KEYS.PRO]) {
        ns._isPro = !!changes[STORAGE_KEYS.PRO].newValue;
      }
    });
  }
})();
