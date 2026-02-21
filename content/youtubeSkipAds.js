/**
 * CookieControl — YouTube: click "Skip ad" as soon as it appears so the player doesn't wait.
 * Runs only on youtube.com. Works with ad blocking (blocked ads still cause a wait; this skips the slot).
 */
(function () {
  if (!document.body) return;

  var SKIP_SELECTORS = [
    '.ytp-ad-skip-button-modern',
    '.ytp-skip-ad-button',
    '.ytp-ad-skip-button-slot',
    '.ytp-ad-skip-button',
    'button.ytp-ad-skip-button-container',
    '.ytp-ad-overlay-close-button',
  ];

  function findAndClickSkip() {
    for (var i = 0; i < SKIP_SELECTORS.length; i++) {
      var el = document.querySelector(SKIP_SELECTORS[i]);
      if (el && el.offsetParent !== null) {
        try {
          el.click();
          return true;
        } catch (e) {}
        try {
          el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          return true;
        } catch (e) {}
      }
    }
    return false;
  }

  function trySkipVideoAd() {
    if (findAndClickSkip()) return;
    // Only seek when we have the ad overlay video — never touch the main player video.
    var adOverlay = document.querySelector('.ytp-ad-player-overlay');
    if (!adOverlay || adOverlay.offsetParent === null) return;
    var video = adOverlay.querySelector('video');
    if (video && video.duration && isFinite(video.duration)) {
      try {
        video.currentTime = video.duration - 0.1;
      } catch (e) {}
    }
  }

  var checkInterval = setInterval(function () {
    trySkipVideoAd();
  }, 500);

  var observer = new MutationObserver(function () {
    trySkipVideoAd();
  });
  observer.observe(document.documentElement || document.body, { childList: true, subtree: true });

  setTimeout(function () {
    clearInterval(checkInterval);
  }, 120000);
})();
