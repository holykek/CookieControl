/**
 * CookieControl — Background service worker (MV3).
 * Forwards re-apply request to the active tab; runs consent scripts in page context.
 * Note: importScripts of consentPhrases.js can cause status 15 in some Chrome builds;
 * we use built-in fallbacks for the injected all-frames clicker. Full phrases run in content scripts.
 */

/** Run in page context to apply Didomi consent via API (closes banner without clicking). */
function didomiApplyInPage(essential) {
  window.didomiOnReady = window.didomiOnReady || [];
  window.didomiOnReady.push(function (Didomi) {
    if (Didomi && typeof Didomi.setUserAgreeToAll === 'function' && typeof Didomi.setUserDisagreeToAll === 'function') {
      if (essential) Didomi.setUserDisagreeToAll(); else Didomi.setUserAgreeToAll();
    }
  });
}

/** Run in MAIN frame to apply SourcePoint/TCF consent (Daily Mail, Reuters, etc.). */
function sourcePointApplyInPage(essential) {
  return new Promise(function (resolve) {
    try {
      if (!essential) { resolve(false); return; }
      function trySpGdpr() {
        try {
          var sp = window._sp_ && window._sp_.gdpr;
          if (sp && typeof sp.postRejectAll === 'function') {
            var done = false;
            sp.postRejectAll(function (resp, success) {
              if (!done) { done = true; resolve(!!success); }
            });
            setTimeout(function () { if (!done) { done = true; resolve(false); } }, 3000);
            return true;
          }
        } catch (e) {}
        return false;
      }
      function tryTcfApi(attempt) {
        var api = typeof window.__tcfapi === 'function' ? window.__tcfapi : null;
        if (!api) {
          if (attempt < 4) setTimeout(function () { tryTcfApi(attempt + 1); }, 300 * attempt);
          else { if (!trySpGdpr()) resolve(false); }
          return;
        }
        var done = false;
        api('postRejectAll', 2, function (resp, success) {
          if (done) return;
          done = true;
          if (success) { resolve(true); return; }
          if (!trySpGdpr()) resolve(false);
        });
        setTimeout(function () {
          if (done) return;
          done = true;
          if (!trySpGdpr()) resolve(false);
        }, 2500);
      }
      tryTcfApi(0);
    } catch (e) {
      resolve(false);
    }
  });
}

/** Run in page context to apply iubenda consent via API (Repubblica etc.). */
function iubendaApplyInPage(essential) {
  try {
    var api = typeof window._iub !== 'undefined' && window._iub && window._iub.cs && window._iub.cs.api ? window._iub.cs.api : null;
    if (!api) return;
    if (essential) {
      if (typeof api.rejectAll === 'function') api.rejectAll();
      else if (typeof api.storeConsent === 'function') api.storeConsent({ consent: false });
    } else {
      if (typeof api.acceptAll === 'function') api.acceptAll();
      else if (typeof api.storeConsent === 'function') api.storeConsent({ consent: true });
    }
  } catch (e) {}
}

/**
 * Run in EVERY frame (including cross-origin CMP iframes) in MAIN world.
 * Finds and clicks the accept (or reject) button so banners in iframes actually close.
 * @param {boolean} essential - if true, try reject/save first
 * @returns {boolean} - true if we clicked something
 */
function clickConsentInFrame(essential, acceptPhrasesArg, rejectPhrasesArg, savePhrasesArg, hintsArg, consentDetectArg) {
  try {
    try {
      var raw = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('CookieControl_cooldown');
      if (raw) {
        var p = raw.split('|');
        var ts = parseInt(p[0], 10);
        var key = (typeof location !== 'undefined' && (location.origin || location.hostname)) || '';
        if (key && p[1] === key && !isNaN(ts) && (Date.now() - ts) < 12000) return false;
      }
    } catch (_) {}
    function setCooldown() {
      try {
        var k = (typeof location !== 'undefined' && (location.origin || location.hostname)) || '';
        if (k && typeof sessionStorage !== 'undefined') sessionStorage.setItem('CookieControl_cooldown', Date.now() + '|' + k);
      } catch (_) {}
    }
    var acceptPhrases = acceptPhrasesArg && acceptPhrasesArg.length ? acceptPhrasesArg : ['accept all', 'allow all', 'accept', 'agree', 'akzeptieren', 'tout accepter', 'accepter et continuer', 'accepter', 'aceptar', 'godkänn alla', 'godkänn allt', 'ok'];
    var rejectPhrases = rejectPhrasesArg && rejectPhrasesArg.length ? rejectPhrasesArg : ['reject all', 'refuse all', 'essential only', 'reject', 'refuse', 'ablehnen', 'tout refuser', 'godkänn endast nödvändiga', 'endast nödvändiga', 'avvisa alla'];
    var savePhrases = savePhrasesArg && savePhrasesArg.length ? savePhrasesArg : ['save', 'confirm', 'spara', 'enregistrer', 'valider'];
    var hints = hintsArg && hintsArg.length ? hintsArg : ['cookie', 'consent', 'privacy', 'gdpr', 'banner', 'truste', 'onetrust', 'iubenda', 'sourcepoint', 'kakor', 'integritet', 'samtycke'];
    var consentDetect = consentDetectArg && consentDetectArg.length ? consentDetectArg : ['cookie', 'privacy', 'consent', 'gdpr', 'données', 'donnees', 'accepter', 'kakor', 'godkänn'];
    var doc = typeof document !== 'undefined' ? document : null;
    if (!doc || !doc.body) return false;
    var bodyText = (doc.body.innerText || '').toLowerCase();
    var url = (typeof location !== 'undefined' && location.href) || '';
    var isSubscriptionPaywall = /suscripcion|subscription|abonnement|abbonamento|subscribe|inscrição|inscricao|suscribete|abonnieren|€|\$\d|choose.*plan|elige.*modelo|paywall|plan mensual|plan anual|monthly|annual|abonneer|prenumerera|tilaa|会员|구독|สมัครสมาชิก|đăng ký/i.test(bodyText + ' ' + url) &&
      /cookie|accept|aceptar|accepter|akzeptieren|godkänn|kakor|continúa|continue|continuer|fortfahren|accetta|aceitar|수락|接受|同意|ยอมรับ|chấp nhận|terima|قبول/i.test(bodyText);
    if (isSubscriptionPaywall) {
      function linkHrefSafe(el) {
        if ((el.tagName || '').toUpperCase() !== 'A') return true;
        var h = ((el.getAttribute && el.getAttribute('href')) || '').trim();
        if (!h || h === '#' || h === '') return true;
        if (/^javascript\s*:/i.test(h)) return true;
        if (h.charAt(0) === '#') return true;
        return false;
      }
      var paywallPhrases = ['continúa aceptando las cookies', 'continua aceptando', 'continue accepting cookies', 'accept cookies', 'aceptar cookies', 'aceptar las cookies', 'accepter les cookies', 'o continúa aceptando', 'o continua aceptando', 'continue with cookies', 'continuer avec les cookies', 'accept and continue', 'aceptar y continuar', 'accetta i cookie', 'aceitar cookies', 'cookies accepteren', 'akzeptiere cookies', 'godkänn cookies', 'hyväksy evästeet', 'akceptuj cookies', 'přijmout cookies', '接受cookie', '쿠키 수락', 'クッキーを受け入れる'];
      var paywallCandidates = doc.body.querySelectorAll('button, [role="button"]');
      for (var idx = 0; idx < paywallCandidates.length; idx++) {
        var el = paywallCandidates[idx];
        if (!el || !el.getBoundingClientRect) continue;
        var rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;
        if (!linkHrefSafe(el)) continue;
        var t = ((el.textContent || '') + ' ' + (el.getAttribute && (el.getAttribute('aria-label') || el.getAttribute('title') || ''))).replace(/\s+/g, ' ').trim().toLowerCase();
        if (t.length < 10 || t.length > 120) continue;
        if (paywallPhrases.some(function (p) { return t.indexOf(p) !== -1; })) {
          try {
            el.click();
            el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
            setCooldown();
            return true;
          } catch (e) {}
        }
      }
    }
    function inConsentContext(el) {
      var node = el;
      for (var i = 0; i < 20 && node && node !== doc.body; i++) {
        var c = (node.className && node.className.toString()) || '';
        var id = (node.id || '');
        var r = (node.getAttribute && node.getAttribute('role')) || '';
        var s = (c + ' ' + id + ' ' + r).toLowerCase();
        if (hints.some(function (h) { return s.indexOf(h) !== -1; })) return true;
        node = node.parentElement;
      }
      return false;
    }
    function textOf(el) {
      if (!el) return '';
      var t = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (!t && el.getAttribute) t = (el.getAttribute('aria-label') || el.getAttribute('title') || '').trim().toLowerCase();
      return t;
    }
    function visible(el) {
      if (!el || !el.getBoundingClientRect) return false;
      var r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }
    function inViewport(el) {
      if (!el || !el.getBoundingClientRect) return true;
      var r = el.getBoundingClientRect();
      var m = 2;
      return r.top >= -m && r.left >= -m && r.bottom <= (window.innerHeight + m) && r.right <= (window.innerWidth + m);
    }
    function wouldNavigate(el) {
      if (!el || (el.tagName || '').toUpperCase() !== 'A') return false;
      var h = (el.getAttribute && el.getAttribute('href')) || '';
      if (!h) return false;
      h = h.trim();
      if (!h || h === '#' || h === '') return false;
      if (/^javascript\s*:/i.test(h)) return false;
      if (h.charAt(0) === '#') return false;
      return true;
    }
    function safeToClick(el) {
      var tag = (el.tagName || '').toUpperCase();
      var role = el.getAttribute && el.getAttribute('role');
      return (tag === 'BUTTON' || role === 'button');
    }
    function doClick(el) {
      if (!visible(el)) return false;
      if (!safeToClick(el)) return false;
      try {
        el.click();
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        return true;
      } catch (e) { return false; }
    }
    var CONTAINER_SEL = '[role="dialog"],[role="alertdialog"],[id*="cookie"],[class*="cookie"],[id*="consent"],[class*="consent"],[id*="gdpr"],[class*="gdpr"],[id*="privacy"],[class*="privacy"],[class*="banner"],[id*="onetrust"],[class*="onetrust"],[id*="Cookiebot"],[class*="Cookiebot"],[class*="didomi"],[class*="termly"],[class*="cookieyes"],[class*="cky-consent"],[class*="qc-cmp"],[class*="truste"],[class*="sp_message"]';
    var ACCEPT_ACTIONS = ['accept-all','accept_all','acceptall','accept'];
    var REJECT_ACTIONS = ['reject-all','reject_all','rejectall','reject','decline'];
    function isAcceptAttr(el) {
      var a = (el.getAttribute && el.getAttribute('data-action')) || '';
      if (a && ACCEPT_ACTIONS.indexOf(a.toLowerCase()) !== -1) return true;
      var s = ((el.id || '') + ' ' + (el.className || '')).toLowerCase();
      return s.indexOf('accept') !== -1 || s.indexOf('allow') !== -1;
    }
    function isRejectAttr(el) {
      var a = (el.getAttribute && el.getAttribute('data-action')) || '';
      if (a && REJECT_ACTIONS.indexOf(a.toLowerCase()) !== -1) return true;
      var s = ((el.id || '') + ' ' + (el.className || '')).toLowerCase();
      return s.indexOf('reject') !== -1 || s.indexOf('decline') !== -1 || s.indexOf('refuse') !== -1;
    }
    function structClick() {
      try {
        var containers = doc.body.querySelectorAll(CONTAINER_SEL);
        for (var ci = 0; ci < containers.length; ci++) {
          var scope = containers[ci];
          if (!visible(scope)) continue;
          var btns = scope.querySelectorAll('button, [role="button"]');
          var vis = [];
          for (var vi = 0; vi < btns.length; vi++) {
            if (visible(btns[vi])) vis.push(btns[vi]);
          }
          if (vis.length < 2) continue;
          var target = null;
          if (essential && !forceAccept) {
            for (var ri = 0; ri < vis.length; ri++) { if (isRejectAttr(vis[ri])) { target = vis[ri]; break; } }
            if (!target) target = vis[0];
          } else {
            for (var ai = 0; ai < vis.length; ai++) { if (isAcceptAttr(vis[ai])) { target = vis[ai]; break; } }
            if (!target) target = vis[vis.length - 1];
          }
          if (target && safeToClick(target) && doClick(target)) { setCooldown(); return true; }
        }
      } catch (e) {}
      return false;
    }
    if (structClick()) return true;
    var sel = 'button, [role="button"]';
    function collectClickables(root, out) {
      if (!root || !root.querySelectorAll) return;
      try {
        var list = root.querySelectorAll(sel);
        for (var i = 0; i < list.length; i++) out.push(list[i]);
        var all = root.querySelectorAll('*');
        for (var j = 0; j < all.length; j++) {
          if (all[j].shadowRoot) collectClickables(all[j].shadowRoot, out);
        }
      } catch (e) {}
    }
    var nodes = [];
    try {
      if (doc.body) collectClickables(doc.body, nodes);
      if (doc.head) collectClickables(doc.head, nodes);
    } catch (e) { return false; }
    function docHasConsentText() {
      try {
        var containers = doc.body.querySelectorAll(CONTAINER_SEL);
        for (var dc = 0; dc < containers.length; dc++) {
          var bc = containers[dc];
          if (!bc.getBoundingClientRect) continue;
          var br = bc.getBoundingClientRect();
          if (br.width > 0 && br.height > 0) {
            var bbtns = bc.querySelectorAll('button, [role="button"]');
            var vc = 0;
            for (var bbi = 0; bbi < bbtns.length; bbi++) {
              if (bbtns[bbi].getBoundingClientRect && bbtns[bbi].getBoundingClientRect().width > 0) vc++;
            }
            if (vc >= 2) return true;
          }
        }
        var bodyText = (doc.body && doc.body.innerText || '');
        var headText = (doc.head && doc.head.innerText || '');
        var fullText = (bodyText + ' ' + headText).toLowerCase();
        return consentDetect.some(function (w) { return fullText.indexOf(w.toLowerCase()) !== -1; });
      } catch (e) { return false; }
    }
    var allowContext = docHasConsentText();
    var rejectTiedToSubscribe = /(reject|refuse|rechazar|rifiuta|refuser|ablehnen).*(subscribe|suscripción|suscripcion|suscriber|abonnement|s'abonner|abbonamento|pagar|pay|purchase|buy|comprar|abonnieren)/i.test(bodyText) ||
      /(subscribe|suscripción|suscripcion|abonnement|s'abonner|pagar|pay|comprar|buy).*(reject|refuse|rechazar|rifiuta|refuser|ablehnen)/i.test(bodyText) ||
      /obligatorisch|werbefrei|consent required|accéder gratuitement|free.*by accepting/i.test(bodyText);
    var noRejectOption = /(accepter|accept|subscribe|suscripción|suscripcion|s'abonner|abonnement)/i.test(bodyText) && !/(refuser|reject|refuse|ablehnen|rechazar)/i.test(bodyText);
    var forceAccept = essential && (rejectTiedToSubscribe || noRejectOption);
    function shouldClickAccept(el) {
      var t = textOf(el);
      if (t.length > 60) return false;
      return acceptPhrases.some(function (p) { return t.indexOf(p) !== -1 || t === p.trim(); });
    }
    function shouldClickReject(el) {
      var t = textOf(el);
      if (/purchase|subscribe|buy|pay|suscripción|suscripcion|suscriber|s'abonner|abonnement|abonnieren|abbonamento|pagar|comprar/i.test(t)) return false;
      return rejectPhrases.some(function (p) { return t.indexOf(p) !== -1; });
    }
    if (essential && !forceAccept) {
      for (var i = 0; i < nodes.length; i++) {
        if (shouldClickReject(nodes[i]) && (inConsentContext(nodes[i]) || allowContext) && doClick(nodes[i])) { setCooldown(); return true; }
      }
      for (var j = 0; j < nodes.length; j++) {
        var t2 = textOf(nodes[j]);
        if (savePhrases.some(function (p) { return t2.indexOf(p) !== -1; }) && (inConsentContext(nodes[j]) || allowContext) && doClick(nodes[j])) { setCooldown(); return true; }
      }
    }
    if (forceAccept || !essential) {
      for (var k = 0; k < nodes.length; k++) {
        if (!shouldClickAccept(nodes[k])) continue;
        if (inConsentContext(nodes[k]) || allowContext) {
          if (doClick(nodes[k])) { setCooldown(); return true; }
        }
      }
    }
    return false;
  } catch (e) {
    return false;
  }
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message && message.type === 'cookieControl_runAllFramesAccept') {
    var tabId = sender.tab && sender.tab.id;
    if (!tabId) {
      sendResponse({ ok: false, clicked: false });
      return true;
    }
    var essential = message.essential === true;
    var P = null; /* importScripts disabled to avoid status 15; content scripts have full phrases */
    var ap = P ? P.ACCEPT_PHRASES : null;
    var rp = P ? P.REJECT_PHRASES : null;
    var sp = P ? P.SAVE_PHRASES : null;
    var hp = P ? P.HINTS : null;
    var cd = P ? P.CONSENT_DETECT : null;
    chrome.scripting.executeScript({
      target: { tabId: tabId, allFrames: true },
      func: clickConsentInFrame,
      args: [essential, ap, rp, sp, hp, cd],
      world: 'MAIN',
    }).then(function (results) {
      var clicked = !!(results && results.length && results.some(function (r) { return r.result === true; }));
      sendResponse({ ok: true, clicked: clicked });
    }).catch(function () {
      sendResponse({ ok: false, clicked: false });
    });
    return true;
  }
  if (message && message.type === 'cookieControl_applyIubenda') {
    var tabId = sender.tab && sender.tab.id;
    if (!tabId) {
      sendResponse({ ok: false });
      return true;
    }
    var essential = message.essential === true;
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: iubendaApplyInPage,
      args: [essential],
      world: 'MAIN',
    }).then(function () {
      sendResponse({ ok: true });
    }).catch(function () {
      sendResponse({ ok: false });
    });
    return true;
  }
  if (message && message.type === 'cookieControl_applySourcePoint') {
    var tabId = sender.tab && sender.tab.id;
    if (!tabId) {
      sendResponse({ ok: false });
      return true;
    }
    var essential = message.essential === true;
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: sourcePointApplyInPage,
      args: [essential],
      world: 'MAIN',
    }).then(function (results) {
      var ok = !!(results && results[0] && results[0].result === true);
      sendResponse({ ok: ok });
    }).catch(function () {
      sendResponse({ ok: false });
    });
    return true;
  }
  if (message && message.type === 'cookieControl_applyDidomi') {
    var tabId = sender.tab && sender.tab.id;
    if (!tabId) {
      sendResponse({ ok: false });
      return true;
    }
    var essential = message.essential === true;
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: didomiApplyInPage,
      args: [essential],
      world: 'MAIN',
    }).then(function () {
      sendResponse({ ok: true });
    }).catch(function () {
      sendResponse({ ok: false });
    });
    return true;
  }
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
