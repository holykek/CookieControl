/**
 * CookieControl — Background service worker (MV3).
 * Forwards re-apply request to the active tab.
 * ExtPay runs in the popup only (service worker has no DOM/window).
 */
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message && message.type === 'cookieControl_reapply') {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const tab = tabs && tabs[0];
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'cookieControl_reapply' })
          .then(function () { sendResponse({ ok: true }); })
          .catch(function () { sendResponse({ ok: false }); });
      } else {
        sendResponse({ ok: false });
      }
    });
    return true;
  }
});
