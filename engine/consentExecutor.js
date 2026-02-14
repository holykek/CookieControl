/**
 * CookieControl — Pipeline: detect → decision → execution. Retry with timeouts, no infinite loops.
 */

(function () {
  const ns = window.CookieControl || {};

  /**
   * Run consent enforcement once: detect CMP, get rules, apply, log.
   * @returns {Promise<{ applied: boolean, cmpName?: string, success?: boolean }>}
   */
  async function runOnce() {
    if (!ns.isFeatureEnabled || !ns.isFeatureEnabled('AUTO_ENFORCE_ON_LOAD')) {
      return { applied: false };
    }
    const detected = ns.detectCMP ? ns.detectCMP() : null;
    if (!detected) return { applied: false };

    const ruleSet = ns.getRuleSetForPage ? await ns.getRuleSetForPage() : { essential: true, functional: false, analytics: false, marketing: false };
    let success = false;
    try {
      success = detected.handler.applyConsent(ruleSet);
    } catch (_) {
      success = false;
    }

    const domain = ns.getCurrentDomain ? ns.getCurrentDomain() : (window.location && window.location.hostname) || '';
    if (ns.appendLog) {
      await ns.appendLog({
        domain,
        cmpName: detected.name,
        ruleApplied: ruleSet,
        success,
      });
    }
    if (success && ns.setLastActionForDomain) {
      await ns.setLastActionForDomain(ruleSet);
    }
    return { applied: true, cmpName: detected.name, success };
  }

  /**
   * Run with retries (CMP may load after first run). Bounded attempts and time.
   */
  async function runWithRetry() {
    const giveUpMs = ns.DEFAULT_GIVE_UP_MS || 15000;
    const maxAttempts = 5;
    const intervalMs = 800;
    const start = Date.now();

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (Date.now() - start >= giveUpMs) break;
      const result = await runOnce();
      if (result.applied) return result;
      if (ns.delay) await ns.delay(intervalMs);
    }
    return { applied: false };
  }

  ns.runConsentOnce = runOnce;
  ns.runConsentWithRetry = runWithRetry;
  window.CookieControl = ns;
})();
