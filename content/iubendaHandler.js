/**
 * CookieControl — iubenda Cookie Solution handler (e.g. Repubblica, sites using iubenda).
 * Applies consent via the page's _iub.cs.api (acceptAll / storeConsent) by injecting into MAIN world.
 */

(function () {
  const ns = window.CookieControl || {};
  const NAME = 'Iubenda';

  function detect() {
    if (typeof document === 'undefined') return false;
    // iubenda injects an iframe or elements with their class/script
    if (document.querySelector && (
      document.querySelector('iframe[src*="iubenda"]') ||
      document.querySelector('[class*="iubenda"]') ||
      document.querySelector('[id*="iubenda"]') ||
      document.querySelector('script[src*="iubenda"]')
    )) return true;
    return false;
  }

  function applyConsent(ruleSet) {
    const essential = ruleSet && ruleSet.essential === true &&
      !(ruleSet.functional || ruleSet.analytics || ruleSet.marketing);
    return new Promise(function (resolve) {
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
        resolve(false);
        return;
      }
      chrome.runtime.sendMessage(
        { type: 'cookieControl_applyIubenda', essential: essential },
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
