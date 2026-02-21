/**
 * CookieControl — Pipeline: detect → decision → execution. Retry with timeouts, no infinite loops.
 */

(function () {
  const ns = window.CookieControl || {};

  /** Domains where we skip consent automation (e.g. CMP not yet supported). */
  const SKIP_DOMAINS = ['expressen.se', 'www.expressen.se'];

  function shouldSkipDomain(hostname) {
    if (!hostname) return false;
    const h = hostname.toLowerCase();
    return SKIP_DOMAINS.some(function (d) { return h === d || h.endsWith('.' + d); });
  }

  /**
   * Run consent enforcement once: detect CMP, get rules, apply, log.
   * @returns {Promise<{ applied: boolean, cmpName?: string, success?: boolean }>}
   */
  async function runOnce() {
    if (!ns.isFeatureEnabled || !ns.isFeatureEnabled('AUTO_ENFORCE_ON_LOAD')) {
      return { applied: false };
    }
    const hostname = (window.location && window.location.hostname) || '';
    if (shouldSkipDomain(hostname)) return { applied: false };

    const ruleSet = ns.getRuleSetForPage ? await ns.getRuleSetForPage() : { essential: true, functional: false, analytics: false, marketing: false };
    const detected = ns.detectCMP ? ns.detectCMP() : null;
    let success = false;
    let cmpName = 'Generic';

    if (detected) {
      try {
        success = await Promise.resolve(detected.handler.applyConsent(ruleSet));
        cmpName = detected.name;
      } catch (_) {
        success = false;
      }
    }

    if (!success && ns._handlers) {
      try {
        const generic = ns._handlers.find(function (h) { return h.name === 'Generic'; });
        if (generic && generic.applyConsent) {
          const result = generic.applyConsent(ruleSet);
          success = await Promise.resolve(result);
          if (success) cmpName = 'Generic';
        }
      } catch (_) {}
    }

    const domain = ns.getCurrentDomain ? ns.getCurrentDomain() : (window.location && window.location.hostname) || '';
    if (ns.appendLog) {
      await ns.appendLog({
        domain,
        cmpName: cmpName,
        ruleApplied: ruleSet,
        success,
      });
    }
    if (success && ns.setLastActionForDomain) {
      await ns.setLastActionForDomain(ruleSet, domain);
    }
    return { applied: !!detected || success, cmpName: cmpName, success };
  }

  /**
   * Run with retries (CMP may load after first run). Bounded attempts and time.
   * All-frames fallback runs at most once at the end (not every attempt) to avoid breaking the page.
   */
  async function runWithRetry() {
    const giveUpMs = ns.DEFAULT_GIVE_UP_MS || 20000;
    const maxAttempts = 10;
    const intervalMs = 600;
    const start = Date.now();
    let lastResult = { applied: false };

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (Date.now() - start >= giveUpMs) break;
      lastResult = await runOnce();
      if (lastResult.applied || lastResult.success) return lastResult;
      if (ns.delay) await ns.delay(intervalMs);
    }

    if (!lastResult.success && typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        const ruleSet = ns.getRuleSetForPage ? await ns.getRuleSetForPage() : { essential: true, functional: false, analytics: false, marketing: false };
        const essentialOnly = ruleSet && ruleSet.essential === true && !(ruleSet.functional || ruleSet.analytics || ruleSet.marketing);
        function runAllFrames() {
          return new Promise(function (resolve) {
            chrome.runtime.sendMessage(
              { type: 'cookieControl_runAllFramesAccept', essential: essentialOnly },
              function (r) { resolve(r || {}); }
            );
          });
        }
        if (essentialOnly) {
          try {
            var spFirst = await new Promise(function (resolve) {
              chrome.runtime.sendMessage({ type: 'cookieControl_applySourcePoint', essential: true }, function (r) {
                resolve(r && r.ok);
              });
            });
            if (spFirst) {
              lastResult = { applied: true, cmpName: 'SourcePoint', success: true };
              var domain = ns.getCurrentDomain ? ns.getCurrentDomain() : (window.location && window.location.hostname) || '';
              if (ns.appendLog) await ns.appendLog({ domain, cmpName: 'SourcePoint', ruleApplied: ruleSet, success: true });
              if (ns.setLastActionForDomain) await ns.setLastActionForDomain(ruleSet, domain);
            }
          } catch (_) {}
        }
        var waitBetweenRuns = [0, 2000, 3000, 5000, 8000];
        var reply = { clicked: false };
        for (var d = 0; d < waitBetweenRuns.length && !reply.clicked && !lastResult.success; d++) {
          if (waitBetweenRuns[d] > 0 && ns.delay) await ns.delay(waitBetweenRuns[d]);
          reply = await runAllFrames();
        }
        if (reply.clicked) {
          lastResult = { applied: true, cmpName: 'Generic', success: true };
          const domain = ns.getCurrentDomain ? ns.getCurrentDomain() : (window.location && window.location.hostname) || '';
          if (ns.appendLog) await ns.appendLog({ domain, cmpName: 'Generic', ruleApplied: ruleSet, success: true });
          if (ns.setLastActionForDomain) await ns.setLastActionForDomain(ruleSet, domain);
        } else if (essentialOnly) {
          try {
            var spReply = await new Promise(function (resolve) {
              chrome.runtime.sendMessage(
                { type: 'cookieControl_applySourcePoint', essential: true },
                function (r) { resolve(r || {}); }
              );
            });
            if (spReply.ok) {
              lastResult = { applied: true, cmpName: 'SourcePoint', success: true };
              var domain = ns.getCurrentDomain ? ns.getCurrentDomain() : (window.location && window.location.hostname) || '';
              if (ns.appendLog) await ns.appendLog({ domain, cmpName: 'SourcePoint', ruleApplied: ruleSet, success: true });
              if (ns.setLastActionForDomain) await ns.setLastActionForDomain(ruleSet, domain);
            }
          } catch (_) {}
        }
        if (!lastResult.success) {
          var host = (typeof window !== 'undefined' && window.location && window.location.hostname) ? window.location.hostname.toLowerCase() : '';
          if (host.indexOf('reuters') !== -1 || host.indexOf('dailymail') !== -1 || host.indexOf('telegraph') !== -1 || host.indexOf('lefigaro') !== -1 || host.indexOf('lemonde') !== -1 || host.indexOf('spiegel') !== -1) {
            function trySourcePoint() {
              return new Promise(function (resolve) {
                chrome.runtime.sendMessage({ type: 'cookieControl_applySourcePoint', essential: true }, function (r) {
                  resolve(r && r.ok);
                });
              });
            }
            [22000, 32000].forEach(function (ms) {
              setTimeout(function () {
                runAllFrames().then(function (r) {
                  if (r && r.clicked && ns.setLastActionForDomain) {
                    var domain = ns.getCurrentDomain ? ns.getCurrentDomain() : host;
                    ns.setLastActionForDomain(ruleSet, domain);
                    return;
                  }
                  if (essentialOnly) {
                    trySourcePoint().then(function (ok) {
                      if (ok && ns.setLastActionForDomain) {
                        var domain = ns.getCurrentDomain ? ns.getCurrentDomain() : host;
                        ns.setLastActionForDomain(ruleSet, domain);
                      }
                    });
                  }
                }).catch(function () {});
              }, ms);
            });
          }
        }
      } catch (_) {}
    }
    return lastResult;
  }

  ns.runConsentOnce = runOnce;
  ns.runConsentWithRetry = runWithRetry;
  window.CookieControl = ns;
})();
