/**
 * CookieControl — Didomi CMP handler.
 * We cannot inject inline script (CSP blocks it on many sites). We only detect Didomi
 * and return false so the executor tries the Generic handler, which clicks the UI
 * when the content script runs in the Didomi iframe (all_frames: true).
 */

(function () {
  const ns = window.CookieControl || {};
  const NAME = 'Didomi';

  /** Only detect when Didomi UI is in the DOM. Do not use script[src] – it causes false positives on many sites. */
  function detect() {
    if (typeof window === 'undefined') return false;
    const roots = getConsentRoots();
    for (const root of roots) {
      if (root.querySelector && (root.querySelector('[class*="didomi"]') || root.querySelector('[id*="didomi"]')))
        return true;
    }
    return false;
  }

  function getConsentRoots() {
    const roots = [];
    try {
      if (document && document.body) roots.push(document.body);
      const iframes = document.querySelectorAll ? document.querySelectorAll('iframe') : [];
      for (const frame of iframes) {
        try {
          if (frame.contentDocument && frame.contentDocument.body) roots.push(frame.contentDocument.body);
        } catch (_) {}
      }
    } catch (_) {}
    return roots;
  }

  function applyConsent(ruleSet) {
    var essential = ruleSet && ruleSet.essential === true &&
      !(ruleSet.functional || ruleSet.analytics || ruleSet.marketing);
    return new Promise(function (resolve) {
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
        resolve(false);
        return;
      }
      chrome.runtime.sendMessage(
        { type: 'cookieControl_applyDidomi', essential: essential },
        function (response) {
          resolve(!!(response && response.ok));
        }
      );
    });
  }

  const handler = { name: NAME, detect, applyConsent };
  if (ns.registerCMP) ns.registerCMP(handler);
  window.CookieControl = ns;
})();
