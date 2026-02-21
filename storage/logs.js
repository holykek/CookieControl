/**
 * CookieControl — Action log (local only). Every automated action is logged.
 * PRO: full history viewable in popup; Free: log written, history not shown.
 */

(function () {
  const ns = window.CookieControl || {};
  const LOG_KEY = 'cookieControl_actionLog';
  const MAX_LOG_ENTRIES = 500;

  /**
   * Append one log entry.
   * @param {{ domain: string, cmpName: string, ruleApplied: string|object, success: boolean }} entry
   * @returns {Promise<void>}
   */
  function appendLog(entry) {
    return new Promise((resolve) => {
      try {
        if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
          resolve();
          return;
        }
        const record = {
          domain: (entry && entry.domain) || '',
          cmpName: (entry && entry.cmpName) || '',
          ruleApplied: (entry && (entry.ruleApplied !== undefined ? entry.ruleApplied : entry)) || {},
          success: entry && entry.success !== false,
          timestamp: Date.now(),
        };
        chrome.storage.local.get([LOG_KEY], (result) => {
          try {
            const list = Array.isArray(result && result[LOG_KEY]) ? result[LOG_KEY] : [];
            list.push(record);
            const trimmed = list.slice(-MAX_LOG_ENTRIES);
            chrome.storage.local.set({ [LOG_KEY]: trimmed }, resolve);
          } catch (e) {
            resolve();
          }
        });
      } catch (e) {
        resolve();
      }
    });
  }

  /**
   * Get recent log entries (e.g. for popup). PRO: full history; Free: can still read for last action.
   * @param {{ limit?: number, domain?: string }} opts
   * @returns {Promise<Array<{ domain: string, cmpName: string, ruleApplied: object, success: boolean, timestamp: number }>>}
   */
  function getLogEntries(opts) {
    const limit = (opts && opts.limit !== undefined) ? opts.limit : 50;
    const domainFilter = opts && opts.domain;
    return new Promise((resolve) => {
      try {
        if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
          resolve([]);
          return;
        }
        chrome.storage.local.get([LOG_KEY], (result) => {
          try {
            let list = Array.isArray(result && result[LOG_KEY]) ? result[LOG_KEY] : [];
            if (domainFilter) list = list.filter((e) => e && e.domain === domainFilter);
            list = list.slice(-limit).reverse();
            resolve(list);
          } catch (e) {
            resolve([]);
          }
        });
      } catch (e) {
        resolve([]);
      }
    });
  }

  ns.appendLog = appendLog;
  ns.getLogEntries = getLogEntries;
  window.CookieControl = ns;
})();
