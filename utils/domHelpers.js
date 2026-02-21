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
   * True if el is already in the viewport (no need to scroll).
   */
  function isInViewport(el) {
    if (!el || typeof el.getBoundingClientRect !== 'function') return true;
    const r = el.getBoundingClientRect();
    const margin = 2;
    return r.top >= -margin && r.left >= -margin && r.bottom <= (window.innerHeight + margin) && r.right <= (window.innerWidth + margin);
  }

  /**
   * True if clicking this element would navigate away (e.g. external link, subscription page).
   */
  function wouldNavigate(el) {
    if (!el || (el.tagName || '').toUpperCase() !== 'A') return false;
    const h = (el.getAttribute && el.getAttribute('href')) || '';
    if (!h) return false;
    const href = h.trim();
    if (!href || href === '#' || href === '') return false;
    if (/^javascript\s*:/i.test(href)) return false;
    if (href.charAt(0) === '#') return false;
    return true;
  }

  /**
   * Safe click: click only. No scroll or focus to avoid unwanted page movement.
   * Never clicks links that would navigate away. Also dispatch a native MouseEvent.
   * @param {Element} el
   * @returns {boolean}
   */
  function safeClick(el) {
    if (!isClickable(el)) return false;
    if ((el.tagName || '').toUpperCase() === 'A') return false;
    if (wouldNavigate(el)) return false;
    try {
      el.click();
      // Some sites (BBC, React-based CMPs) only respond to a dispatched MouseEvent
      try {
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      } catch (_) {}
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Text content trimmed and lowercased for comparison (e.g. button labels).
   * Uses aria-label or title if textContent is empty (some banners use those).
   * @param {Element} el
   * @returns {string}
   */
  function normalizedText(el) {
    if (!el) return '';
    let t = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!t && el.getAttribute) {
      t = (el.getAttribute('aria-label') || el.getAttribute('title') || '').trim();
    }
    return t.toLowerCase();
  }

  ns.queryOne = queryOne;
  ns.queryAll = queryAll;
  ns.isVisible = isVisible;
  ns.isClickable = isClickable;
  ns.safeClick = safeClick;
  ns.normalizedText = normalizedText;
  window.CookieControl = ns;
})();
