/**
 * CookieControl — Safe DOM queries and visibility checks.
 * Only interact with visible, user-facing elements.
 */

(function () {
  const ns = window.CookieControl || {};

  /**
   * Query selector that returns the first match or null. Safe for missing nodes.
   * @param {Document|Element} root
   * @param {string} selector
   * @returns {Element|null}
   */
  function queryOne(root, selector) {
    if (!root || !root.querySelector) return null;
    try {
      return root.querySelector(selector);
    } catch {
      return null;
    }
  }

  /**
   * Query all; returns array (never null).
   * @param {Document|Element} root
   * @param {string} selector
   * @returns {Element[]}
   */
  function queryAll(root, selector) {
    if (!root || !root.querySelectorAll) return [];
    try {
      return Array.from(root.querySelectorAll(selector));
    } catch {
      return [];
    }
  }

  /**
   * Check if element is visible (not hidden by display/none, visibility, or zero size).
   * @param {Element} el
   * @returns {boolean}
   */
  function isVisible(el) {
    if (!el || typeof el.getBoundingClientRect !== 'function') return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0')
      return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  /**
   * Check if element is likely clickable (visible and not disabled).
   * @param {Element} el
   * @returns {boolean}
   */
  function isClickable(el) {
    if (!el || !isVisible(el)) return false;
    if (el.disabled === true) return false;
    const role = (el.getAttribute && el.getAttribute('role')) || '';
    const tag = (el.tagName || '').toLowerCase();
    return tag === 'button' || tag === 'a' || role === 'button' || el.onclick != null || true;
  }

  /**
   * Safe click: only if visible and clickable. Returns whether click was attempted.
   * @param {Element} el
   * @returns {boolean}
   */
  function safeClick(el) {
    if (!isClickable(el)) return false;
    try {
      el.click();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Text content trimmed and lowercased for comparison (e.g. button labels).
   * @param {Element} el
   * @returns {string}
   */
  function normalizedText(el) {
    if (!el || !el.textContent) return '';
    return el.textContent.replace(/\s+/g, ' ').trim().toLowerCase();
  }

  ns.queryOne = queryOne;
  ns.queryAll = queryAll;
  ns.isVisible = isVisible;
  ns.isClickable = isClickable;
  ns.safeClick = safeClick;
  ns.normalizedText = normalizedText;
  window.CookieControl = ns;
})();
