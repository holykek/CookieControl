/**
 * CookieControl — CMP detection on page load, DOM mutations, and SPA navigation.
 * Triggers consent executor when a CMP is detected. No infinite loops; bounded retry.
 */

(function () {
  const ns = window.CookieControl || {};
  let ran = false;
  let observer = null;

  function scheduleRun() {
    if (!ns.runConsentWithRetry) return;
    ns.runConsentWithRetry().then((result) => {
      if (result.applied) ran = true;
    });
  }

  /**
   * Start detection: run once after idle, then observe DOM for late CMPs and SPA changes.
   */
  function start() {
    if (!ns.isFeatureEnabled || !ns.isFeatureEnabled('AUTO_DETECT_CMP')) return;

    scheduleRun();

    try {
      observer = new MutationObserver(() => {
        if (ran) return;
        scheduleRun();
      });
      observer.observe(document.documentElement || document.body, {
        childList: true,
        subtree: true,
      });
    } catch (_) {
      // Fail safely
    }
  }

  /**
   * Manual re-apply (e.g. from popup "Re-apply consent" button).
   */
  function reapply() {
    ran = false;
    scheduleRun();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  ns.cmpDetectorStart = start;
  ns.cmpDetectorReapply = reapply;
  window.CookieControl = ns;

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg === 'cookieControl_reapply' || (msg && msg.type === 'cookieControl_reapply')) {
      reapply();
      sendResponse({ ok: true });
    }
    return true;
  });
})();
