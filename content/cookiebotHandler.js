/**
 * CookieControl — Cookiebot CMP handler.
 * Auto-apply accept all or essential only on sites using Cookiebot.
 */

(function () {
  const ns = window.CookieControl || {};
  const q = ns.queryOne;
  const qAll = ns.queryAll;
  const visible = ns.isVisible;
  const click = ns.safeClick;
  const text = ns.normalizedText;

  const NAME = 'Cookiebot';

  function detect() {
    const root = document.body || document.documentElement;
    if (!root) return false;
    const el = root.querySelector('#CybotCookiebotDialog, #CookiebotWidget, [id*="Cookiebot"], [class*="CybotCookiebotDialog"]');
    return el && ns.isVisible && ns.isVisible(el);
  }

  function getCategories() {
    return ['essential', 'functional', 'analytics', 'marketing'];
  }

  function findRejectButton(root) {
    const byId = root.querySelector('#CybotCookiebotDialogBodyButtonDecline, [id*="Decline"], [id*="decline"]');
    if (byId && visible(byId)) return byId;
    const phrases = ['decline', 'reject', 'only necessary', 'essential only', 'necessary only', 'no thanks', 'alle ablehnen', 'refuser'];
    const candidates = qAll(root, '#CybotCookiebotDialog button, #CybotCookiebotDialog a, [id*="Cookiebot"] button, [id*="Cookiebot"] a');
    for (const el of candidates) {
      if (!visible(el)) continue;
      const t = text(el);
      if (phrases.some((p) => t.includes(p))) return el;
    }
    return null;
  }

  function findAcceptAllButton(root) {
    const byId = root.querySelector('#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll, [id*="AllowAll"], [id*="Allow"]');
    if (byId && visible(byId)) return byId;
    const phrases = ['allow all', 'accept all', 'accept', 'agree', 'allow', 'alle akzeptieren', 'tout accepter'];
    const candidates = qAll(root, '#CybotCookiebotDialog button, #CybotCookiebotDialog a, [id*="Cookiebot"] button, [id*="Cookiebot"] a');
    for (const el of candidates) {
      if (!visible(el)) continue;
      const t = text(el);
      if (phrases.some((p) => t.includes(p))) return el;
    }
    return null;
  }

  function applyConsent(ruleSet) {
    const root = document.body || document.documentElement;
    if (!root) return false;

    const essentialOnly = ruleSet && ruleSet.essential === true &&
      (ruleSet.functional !== true && ruleSet.analytics !== true && ruleSet.marketing !== true);

    if (essentialOnly) {
      const btn = findRejectButton(root);
      if (btn && click(btn)) return true;
    } else {
      const btn = findAcceptAllButton(root);
      if (btn && click(btn)) return true;
    }
    return false;
  }

  const handler = { name: NAME, detect, getCategories, applyConsent };
  if (ns.registerCMP) ns.registerCMP(handler);
  window.CookieControl = ns;
})();
