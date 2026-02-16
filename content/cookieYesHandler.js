/**
 * CookieControl — CookieYes CMP handler.
 * CookieYes uses .cky-consent-bar and .cky-btn-accept / .cky-btn-reject.
 * @see https://cookieyes.com/documentation/
 */

(function () {
  const ns = window.CookieControl || {};
  const q = ns.queryOne;
  const qAll = ns.queryAll;
  const visible = ns.isVisible;
  const click = ns.safeClick;

  const NAME = 'CookieYes';

  function detect() {
    const root = document.body || document.documentElement;
    if (!root) return false;
    const bar = root.querySelector('.cky-consent-bar, [class*="cky-consent"], [id*="cookieyes"]');
    return bar && visible(bar);
  }

  function getCategories() {
    return ['essential', 'functional', 'analytics', 'marketing'];
  }

  function applyConsent(ruleSet) {
    const root = document.body || document.documentElement;
    if (!root) return false;

    const essentialOnly = ruleSet && ruleSet.essential === true &&
      (ruleSet.functional !== true && ruleSet.analytics !== true && ruleSet.marketing !== true);

    const rejectBtn = q(root, '.cky-btn-reject, [class*="cky-btn-reject"], [data-action="reject"]');
    const acceptBtn = q(root, '.cky-btn-accept, [class*="cky-btn-accept"], [data-action="accept_all"]');

    if (essentialOnly && rejectBtn && visible(rejectBtn)) {
      return click(rejectBtn);
    }
    if (!essentialOnly && acceptBtn && visible(acceptBtn)) {
      return click(acceptBtn);
    }
    return false;
  }

  const handler = { name: NAME, detect, getCategories, applyConsent };
  if (ns.registerCMP) ns.registerCMP(handler);
  window.CookieControl = ns;
})();
