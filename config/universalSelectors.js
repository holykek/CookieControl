/**
 * CookieControl — Language-agnostic selectors for consent detection.
 * CMPs use standardized IDs, classes, and data attributes across all languages.
 * Structure-first: no phrase matching required for detection or button finding.
 */
(function (global) {
  if (!global) global = typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : this;

  /** data-action values used by Quantcast, CookieYes, and other CMPs — language-agnostic */
  var ACCEPT_ACTIONS = ['accept-all', 'accept_all', 'acceptall', 'accept-all-cookies', 'accept'];
  var REJECT_ACTIONS = ['reject-all', 'reject_all', 'rejectall', 'reject-all-cookies', 'reject', 'decline', 'decline-all'];

  /** ID substring patterns — many CMPs use English IDs regardless of UI language */
  var ACCEPT_ID_PATTERNS = ['accept', 'allow', 'allowall', 'optin', 'agree'];
  var REJECT_ID_PATTERNS = ['reject', 'decline', 'refuse', 'deny', 'optout', 'essential'];

  /** Class substring patterns — CMP-specific, same across locales */
  var ACCEPT_CLASS_PATTERNS = ['accept', 'allow', 'optin', 'agree', 'consent-all'];
  var REJECT_CLASS_PATTERNS = ['reject', 'decline', 'refuse', 'deny', 'optout', 'essential-only'];

  /** Container selectors — CMPs use these class/id patterns in all languages */
  var CONTAINER_SELECTORS = [
    '[role="dialog"]', '[role="alertdialog"]',
    '[id*="cookie"]', '[class*="cookie"]', '[id*="consent"]', '[class*="consent"]',
    '[id*="gdpr"]', '[class*="gdpr"]', '[id*="privacy"]', '[class*="privacy"]',
    '[class*="banner"]', '[class*="modal"]', '[class*="popup"]',
    '[id*="onetrust"]', '[class*="onetrust"]', '[id*="Cookiebot"]', '[class*="CybotCookiebot"]',
    '[id*="didomi"]', '[class*="didomi"]', '[class*="termly"]', '[class*="cookieyes"]',
    '[class*="cky-consent"]', '[class*="qc-cmp"]', '[class*="truste"]',
    '[class*="sp_message"]', '[class*="sp_cc"]', '[class*="sourcepoint"]',
    '[class*="cookie-banner"]', '[class*="cookie-notice"]', '[class*="cc-banner"]',
    '[class*="kakor"]', '[id*="kakor"]', '[class*="integritet"]', '[class*="samtycke"]',
    '[class*="ciasteczka"]', '[class*="eväste"]', '[class*="koekjes"]'
  ].join(', ');

  function matchesPattern(str, patterns) {
    if (!str || typeof str !== 'string') return false;
    var s = str.toLowerCase();
    return patterns.some(function (p) { return s.indexOf(p) !== -1; });
  }

  function isAcceptByAttributes(el) {
    var action = (el.getAttribute && el.getAttribute('data-action')) || '';
    if (action) return ACCEPT_ACTIONS.indexOf(action.toLowerCase()) !== -1;
    var id = (el.id || '').toLowerCase();
    if (id && ACCEPT_ID_PATTERNS.some(function (p) { return id.indexOf(p) !== -1; })) return true;
    var cls = (el.className && el.className.toString()) || '';
    if (cls && ACCEPT_CLASS_PATTERNS.some(function (p) { return cls.toLowerCase().indexOf(p) !== -1; })) return true;
    return false;
  }

  function isRejectByAttributes(el) {
    var action = (el.getAttribute && el.getAttribute('data-action')) || '';
    if (action) return REJECT_ACTIONS.indexOf(action.toLowerCase()) !== -1;
    var id = (el.id || '').toLowerCase();
    if (id && REJECT_ID_PATTERNS.some(function (p) { return id.indexOf(p) !== -1; })) return true;
    var cls = (el.className && el.className.toString()) || '';
    if (cls && REJECT_CLASS_PATTERNS.some(function (p) { return cls.toLowerCase().indexOf(p) !== -1; })) return true;
    return false;
  }

  /** Structural heuristic: in a 2-button consent layout, primary (right/larger) = accept, secondary (left) = reject */
  function getButtonsByPosition(buttons) {
    var arr = Array.isArray(buttons) ? buttons : Array.from(buttons || []);
    if (arr.length < 2) return { accept: arr[0] || null, reject: null };
    var sorted = arr.slice().sort(function (a, b) {
      var ra = a.getBoundingClientRect ? a.getBoundingClientRect() : { left: 0, width: 0 };
      var rb = b.getBoundingClientRect ? b.getBoundingClientRect() : { left: 0, width: 0 };
      return ra.left - rb.left;
    });
    return { accept: sorted[sorted.length - 1], reject: sorted[0] };
  }

  global.CookieControlUniversal = {
    CONTAINER_SELECTORS: CONTAINER_SELECTORS,
    ACCEPT_ACTIONS: ACCEPT_ACTIONS,
    REJECT_ACTIONS: REJECT_ACTIONS,
    isAcceptByAttributes: isAcceptByAttributes,
    isRejectByAttributes: isRejectByAttributes,
    getButtonsByPosition: getButtonsByPosition,
    matchesPattern: matchesPattern,
  };
})(typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : this);
