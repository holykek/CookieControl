/**
 * CookieControl — Free vs Pro feature flags
 * PRO features are gated; when isPro is false, callers must no-op or use Free behavior.
 * All checks are local-only and deterministic.
 */

const FEATURES = {
  // ---- FREE (always on) ----
  GLOBAL_REJECT_NON_ESSENTIAL: true,
  AUTO_DETECT_CMP: true,
  AUTO_ENFORCE_ON_LOAD: true,
  MANUAL_REAPPLY_BUTTON: true,
  PER_SITE_REMEMBER_LAST: true,
  CMP_ONETRUST: true,
  CMP_COOKIEBOT: true,
  CMP_QUANTCAST: true,
  CMP_COOKIEYES: true,
  CMP_GENERIC: true,

  // ---- PRO (paid; high value, low infra) ----
  CATEGORY_BASED_CONSENT: false,
  PER_SITE_CUSTOM_RULES: false,
  DARK_PATTERN_NAVIGATION: false,
  CONSENT_HISTORY_LOG: false,
  CMP_EXTENDED_COVERAGE: false,
  AUTO_RE_CONSENT_ON_POLICY_CHANGE: false,
  PRIORITY_RULE_EXECUTION: false,
};

/**
 * Whether the user has Pro. Reads from storage (set by popup upgrade flow).
 * @returns {boolean}
 */
function isPro() {
  return (typeof window !== 'undefined' && window.CookieControl && window.CookieControl._isPro) === true;
}

/**
 * Check if a feature is enabled. Pro-only features require isPro().
 * @param {keyof typeof FEATURES} featureKey
 * @returns {boolean}
 */
function isFeatureEnabled(featureKey) {
  const value = FEATURES[featureKey];
  if (value === undefined) return false;
  const proOnly = [
    'CATEGORY_BASED_CONSENT',
    'PER_SITE_CUSTOM_RULES',
    'DARK_PATTERN_NAVIGATION',
    'CONSENT_HISTORY_LOG',
    'CMP_EXTENDED_COVERAGE',
    'AUTO_RE_CONSENT_ON_POLICY_CHANGE',
    'PRIORITY_RULE_EXECUTION',
  ].includes(featureKey);
  if (proOnly) return isPro();
  return !!value;
}

// Content script / popup namespace (no ES modules in manifest-injected scripts)
(function () {
  const ns = window.CookieControl || {};
  ns.FEATURES = FEATURES;
  ns.isPro = isPro;
  ns.isFeatureEnabled = isFeatureEnabled;
  window.CookieControl = ns;
})();
