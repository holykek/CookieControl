/**
 * CookieControl — Retries and timeouts. No infinite loops.
 */

(function () {
  const ns = window.CookieControl || {};
  const DEFAULT_MAX_ATTEMPTS = 5;
  const DEFAULT_INTERVAL_MS = 800;
  const DEFAULT_GIVE_UP_MS = 15000;

  /**
   * Try a predicate until it returns true or we hit limits.
   * @param {() => boolean} fn - Return true when done (success).
   * @param {{ maxAttempts?: number, intervalMs?: number, giveUpMs?: number }} opts
   * @returns {Promise<boolean>} - True if fn() returned true before limits.
   */
  function retryUntil(fn, opts = {}) {
    const maxAttempts = opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    const intervalMs = opts.intervalMs ?? DEFAULT_INTERVAL_MS;
    const giveUpMs = opts.giveUpMs ?? DEFAULT_GIVE_UP_MS;
    const start = Date.now();

    return new Promise((resolve) => {
      function attempt(n) {
        if (n >= maxAttempts || Date.now() - start >= giveUpMs) {
          resolve(false);
          return;
        }
        if (fn()) {
          resolve(true);
          return;
        }
        setTimeout(() => attempt(n + 1), intervalMs);
      }
      attempt(0);
    });
  }

  /**
   * Delay for a number of milliseconds.
   * @param {number} ms
   * @returns {Promise<void>}
   */
  function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  ns.retryUntil = retryUntil;
  ns.delay = delay;
  ns.DEFAULT_GIVE_UP_MS = DEFAULT_GIVE_UP_MS;
  window.CookieControl = ns;
})();
