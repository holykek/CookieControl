/**
 * CookieControl — CMP detection on page load, DOM mutations, and SPA navigation.
 * Triggers consent executor when a CMP is detected. No infinite loops; bounded retry.
 */

(function () {
  const ns = window.CookieControl || {};
  let ran = false;
  let observer = null;
  let mutationDebounceTimer = null;
  const MUTATION_DEBOUNCE_MS = 2500;

  function scheduleRun() {
    if (!ns.runConsentWithRetry) return;
    ns.runConsentWithRetry().then((result) => {
      ran = true;
    });
  }

  function debouncedScheduleRun() {
    if (ran) return;
    if (mutationDebounceTimer) return;
    mutationDebounceTimer = setTimeout(function () {
      mutationDebounceTimer = null;
      if (ran) return;
      scheduleRun();
    }, MUTATION_DEBOUNCE_MS);
  }

  /**
   * Start detection: run once after idle, then observe DOM for late CMPs (debounced).
   */
  function start() {
    if (!ns.isFeatureEnabled || !ns.isFeatureEnabled('AUTO_DETECT_CMP')) return;

    scheduleRun();

    try {
      observer = new MutationObserver(debouncedScheduleRun);
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

  /** Debug: from the page console run document.dispatchEvent(new CustomEvent('cookiecontrol-run'))
   *  to trigger consent run (content script runs in isolated world so window.CookieControl is not in page scope). */
  document.addEventListener('cookiecontrol-run', function () {
    if (ns.runConsentWithRetry) {
      ns.runConsentWithRetry().then(function (r) {
        console.log('[CookieControl] Run result:', r);
      });
    }
  });
})();
