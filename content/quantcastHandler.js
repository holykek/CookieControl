/**
 * CookieControl — Quantcast Choice CMP handler.
 * Auto-apply accept all or essential only on sites using Quantcast Choice.
 */

(function () {
  const ns = window.CookieControl || {};
  const q = ns.queryOne;
  const qAll = ns.queryAll;
  const visible = ns.isVisible;
  const click = ns.safeClick;
  const text = ns.normalizedText;

  const NAME = 'Quantcast';

  function detect() {
    const root = document.body || document.documentElement;
    if (!root) return false;
    const el = root.querySelector('#qc-cmp2-main, .qc-cmp2-container, [id*="qc-cmp"], [class*="qc-cmp2"]');
    return el && ns.isVisible && ns.isVisible(el);
  }

  function getCategories() {
    return ['essential', 'functional', 'analytics', 'marketing'];
  }

  function findRejectButton(root) {
    const container = root.querySelector('#qc-cmp2-main, .qc-cmp2-container');
    const scope = container || root;
    const byId = scope.querySelector('[data-action="reject-all"], [class*="reject"], [id*="reject"]');
    if (byId && visible(byId)) return byId;
    const phrases = ['reject all', 'reject', 'decline', 'essential only', 'necessary only', 'no thanks'];
    const candidates = qAll(scope, 'button, a[role="button"], [data-action], .qc-cmp2-button');
    for (const el of candidates) {
      if (!visible(el)) continue;
      const t = text(el);
      if (phrases.some((p) => t.includes(p))) return el;
    }
    return null;
  }

  function findAcceptAllButton(root) {
    const container = root.querySelector('#qc-cmp2-main, .qc-cmp2-container');
    const scope = container || root;
    const byId = scope.querySelector('[data-action="accept-all"], [class*="accept"], [id*="accept"]');
    if (byId && visible(byId)) return byId;
    const phrases = ['accept all', 'accept', 'allow all', 'agree', 'allow'];
    const candidates = qAll(scope, 'button, a[role="button"], [data-action], .qc-cmp2-button');
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
