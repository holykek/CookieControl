/**
 * CookieControl — Universal fallback. Runs on every page/frame.
 * Polls for consent buttons when page has consent-like text. Catches Privacy Manager, etc.
 */
(function () {
  let clicked = false;
  const MAX_ATTEMPTS = 150;
  let attempts = 0;

  function hasConsentLikeText(doc) {
    if (!doc || !doc.body) return false;
    var t = (doc.body.innerText || '').toLowerCase();
    if (t.length > 50000) t = t.slice(0, 50000);
    var strongConsent = /\b(cookie|cookies|consent|gdpr|kakor|eväste|evasteet|ciasteczka|koekjes|galletas|biscotti|slapukai|sīkdatnes|integritet|samtycke|onetrust|cookiebot|didomi|termly|cookieyes)\b/i.test(t);
    if (!strongConsent) {
      var dialogs = doc.body.querySelectorAll('[role="dialog"], [role="alertdialog"]');
      for (var d = 0; d < dialogs.length; d++) {
        var dialog = dialogs[d];
        if (!dialog.querySelectorAll) continue;
        var btns = dialog.querySelectorAll('button, [role="button"]');
        var hasAccept = false, hasReject = false, hasSave = false;
        for (var b = 0; b < btns.length; b++) {
          var lbl = (btns[b].textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
          if (/^(agree|accept|allow|ok|yes|consent)$/.test(lbl) || /\b(agree|accept|allow|accept all)\b/.test(lbl) && lbl.length < 35) hasAccept = true;
          if (/^(reject|decline|refuse|deny|no)$/.test(lbl) || /\b(reject|decline|refuse|do not consent)\b/.test(lbl) && lbl.length < 35) hasReject = true;
          if (/^(confirm|save)$/.test(lbl) || /\b(confirm|save preferences|save choices)\b/.test(lbl) && lbl.length < 35) hasSave = true;
        }
        if ((hasAccept && (hasReject || hasSave)) || (hasAccept && btns.length >= 2)) return true;
      }
      var dataChoice = /\b(your data\b.*\byour choice\b|\bdata privacy\s*settings\b|\bpersonal data\b.*\bpartners\b)/i.test(t);
      if (dataChoice) return true;
      if (/\bpersonal data\b/i.test(t) && /\b(essential|accept|confirm|functionality|analytics|advertising)\b/i.test(t)) return true;
    }
    var U = (typeof window !== 'undefined' && window.CookieControlUniversal) || (typeof self !== 'undefined' && self.CookieControlUniversal);
    if (U && U.CONTAINER_SELECTORS) {
      try {
        var containers = doc.body.querySelectorAll(U.CONTAINER_SELECTORS);
        for (var i = 0; i < containers.length; i++) {
          var c = containers[i];
          if (!c || !c.getBoundingClientRect) continue;
          var r = c.getBoundingClientRect();
          if (r.width <= 0 || r.height <= 0) continue;
          var btns = c.querySelectorAll('button, [role="button"]');
          var vis = [];
          for (var j = 0; j < btns.length; j++) {
            var b = btns[j];
            if (b.getBoundingClientRect && b.getBoundingClientRect().width > 0 && b.getBoundingClientRect().height > 0) vis.push(b);
          }
          if (vis.length >= 2) return true;
          if (vis.length >= 1 && U.isAcceptByAttributes && U.isRejectByAttributes) {
            if (U.isAcceptByAttributes(vis[0]) || U.isRejectByAttributes(vis[0])) return true;
          }
        }
      } catch (e) {}
    }
    return strongConsent;
  }

  function getPreference(cb) {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
        cb(true);
        return;
      }
      chrome.storage.local.get(['cookieControl_globalRules'], function (r) {
        const rules = r && r.cookieControl_globalRules;
        const essential = !rules || (rules.essential === true && !rules.functional && !rules.analytics && !rules.marketing);
        cb(essential);
      });
    } catch (e) {
      cb(true);
    }
  }

  function inReloadCooldown() {
    try {
      var raw = sessionStorage.getItem('CookieControl_cooldown');
      if (!raw) return false;
      var parts = raw.split('|');
      var ts = parseInt(parts[0], 10);
      var origin = parts[1] || '';
      var key = (typeof location !== 'undefined' && (location.origin || location.hostname)) || '';
      return key && origin === key && !isNaN(ts) && (Date.now() - ts) < 12000;
    } catch (e) { return false; }
  }

  function setCooldown() {
    try {
      var key = (typeof location !== 'undefined' && (location.origin || location.hostname)) || '';
      if (key) sessionStorage.setItem('CookieControl_cooldown', Date.now() + '|' + key);
    } catch (e) {}
  }

  function tryClick(essential) {
    if (clicked) return true;
    if (inReloadCooldown()) return false;
    const doc = document;
    if (!doc || !doc.body) return false;

    const bodyText = (doc.body.innerText || '').toLowerCase();
    var url = (typeof location !== 'undefined' && location.href) || '';

    var isSubscriptionPaywall = /suscripcion|subscription|abonnement|abbonamento|subscribe|inscrição|inscricao|suscribete|abonnieren|€|\$\d|choose.*plan|elige.*modelo|paywall|plan mensual|plan anual|monthly|annual|abonneer|prenumerera|tilaa|inscreva|inscription|abo|会员|구독|สมัครสมาชิก|đăng ký|berlangganan/i.test(bodyText + ' ' + url) &&
      /cookie|accept|aceptar|accepter|akzeptieren|continúa|continue|continuer|fortfahren|accetta|aceitar|수락|接受|同意|ยอมรับ|chấp nhận|terima|स्वीकार|قبول|קיבלתי/i.test(bodyText);

    if (isSubscriptionPaywall) {
      function linkHrefSafe(el) {
        if ((el.tagName || '').toUpperCase() !== 'A') return true;
        var h = ((el.getAttribute && el.getAttribute('href')) || '').trim();
        if (!h || h === '#' || h === '') return true;
        if (/^javascript\s*:/i.test(h)) return true;
        if (h.charAt(0) === '#') return true;
        return false;
      }
      var P = (typeof window !== 'undefined' && window.CookieControlPhrases) || (typeof self !== 'undefined' && self.CookieControlPhrases);
      var paywallAcceptPhrases = (P && P.PAYWALL_ACCEPT_PHRASES) ? P.PAYWALL_ACCEPT_PHRASES : [
        'continúa aceptando las cookies', 'continua aceptando', 'continue accepting cookies',
        'accept cookies', 'aceptar cookies', 'aceptar las cookies', 'accepter les cookies',
        'o continúa aceptando', 'o continua aceptando', 'continue with cookies',
        'continuer avec les cookies', 'fortfahren mit cookies', 'accetta i cookie',
        'aceitar cookies', 'cookies accepteren', 'akzeptiere cookies'
      ];
      var candidates = doc.body ? doc.body.querySelectorAll('button, [role="button"]') : [];
      for (var i = 0; i < candidates.length; i++) {
        var el = candidates[i];
        if (!el || !el.getBoundingClientRect) continue;
        var r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) continue;
        if (!linkHrefSafe(el)) continue;
        var t = ((el.textContent || '') + ' ' + (el.getAttribute && (el.getAttribute('aria-label') || el.getAttribute('title') || ''))).replace(/\s+/g, ' ').trim().toLowerCase();
        if (t.length < 10 || t.length > 120) continue;
        if (paywallAcceptPhrases.some(function (p) { return t.indexOf(p) !== -1; })) {
          try {
            el.click();
            el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
            setCooldown();
            clicked = true;
            return true;
          } catch (e) {}
        }
      }
    }

    if (!hasConsentLikeText(doc)) return false;
    var rejectTiedToSubscribe = /(reject|refuse|rechazar|rifiuta|refuser|ablehnen|odmítnout).*(subscribe|suscripción|suscripcion|suscriber|abonnement|s'abonner|abbonamento|inscrição|inscricao|pagar|pay|purchase|buy|comprar|abonnieren|订阅|訂閱)/i.test(bodyText) ||
      /(subscribe|suscripción|suscripcion|suscriber|abonnement|s'abonner|abbonamento|pagar|pay|comprar|buy).*(reject|refuse|rechazar|rifiuta|refuser|ablehnen)/i.test(bodyText) ||
      /obligatorisch|werbefrei|consent required|consent requried|zwingend zustimmen|accéder gratuitement|free.*by accepting|accept.*data use/i.test(bodyText);
    var noRejectOption = /(accepter|accept|subscribe|suscripción|suscripcion|s'abonner|abonnement)/i.test(bodyText) && !/(refuser|reject|refuse|ablehnen|rechazar|rifiuta|decline|odbij)/i.test(bodyText);
    var forceAccept = essential && (rejectTiedToSubscribe || noRejectOption);

    function walk(rootEl, out) {
      if (!rootEl) return;
      try {
        const sel = 'button, [role="button"]';
        const list = (rootEl.querySelectorAll && rootEl.querySelectorAll(sel)) || [];
        for (let i = 0; i < list.length; i++) out.push(list[i]);
        const all = rootEl.querySelectorAll ? rootEl.querySelectorAll('*') : [];
        for (let j = 0; j < all.length; j++) {
          if (all[j].shadowRoot) walk(all[j].shadowRoot, out);
        }
      } catch (e) {}
    }
    const nodes = [];
    walk(doc.body, nodes);
    if (doc.head) walk(doc.head, nodes);

    function textOf(el) {
      if (!el) return '';
      return ((el.textContent || '') + ' ' + (el.getAttribute && (el.getAttribute('aria-label') || el.getAttribute('title') || ''))).replace(/\s+/g, ' ').trim().toLowerCase();
    }

    function visible(el) {
      if (!el || !el.getBoundingClientRect) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
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

    var consentHints = ['cookie', 'consent', 'gdpr', 'truste', 'onetrust', 'iubenda', 'didomi', 'sp_cc', 'sp-cc', 'cookiebot', 'termly', 'cookieyes', 'datenschutz', 'galletas', 'biscotti', 'kakor', 'integritet', 'samtycke', 'eväste', 'evasteet', 'ciasteczka', 'koekjes', 'çerez', 'slapukai', 'sīkdatnes', 'küpsised', 'piškotki', 'kolačići', 'biskotat', 'sourcepoint', 'dialog', 'modal', 'banner', 'privacy', 'preference', 'personal', 'overlay', 'popup', 'complydog'];
    function inConsentContext(el) {
      var node = el;
      for (var u = 0; u < 15 && node && node !== doc.body; u++) {
        var c = (node.className && String(node.className)) || '';
        var id = (node.id || '');
        var role = (node.getAttribute && node.getAttribute('role')) || '';
        var s = (c + ' ' + id + ' ' + role).toLowerCase();
        if (consentHints.some(function (h) { return s.indexOf(h) !== -1; })) return true;
        var txt = (node.textContent || '').toLowerCase();
        if (txt.length > 0 && txt.length < 4000 && /\bpersonal data\b/.test(txt) && /\b(essential|accept|confirm|functionality|analytics|advertising)\b/.test(txt)) return true;
        if (txt.length > 0 && txt.length < 4000 && /\bwe use personal data\b/.test(txt)) return true;
        if (txt.length > 0 && txt.length < 2000 && /\buses cookies\b/.test(txt) && /\b(allow all|accept|essential|website)\b/.test(txt)) return true;
        node = node.parentElement;
      }
      return false;
    }

    function safeToClick(el) {
      var tag = (el.tagName || '').toUpperCase();
      if (tag === 'A') return false;
      var target = el.getAttribute && el.getAttribute('target');
      if (target === '_blank' || (target && target.toLowerCase() === '_blank')) return false;
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
      } catch (e) {
        return false;
      }
    }

    var P = (typeof window !== 'undefined' && window.CookieControlPhrases) || (typeof self !== 'undefined' && self.CookieControlPhrases);
    var rejectPhrases = (P && P.REJECT_PHRASES) ? P.REJECT_PHRASES : ['do not consent', 'don\'t consent', 'reject all', 'refuse all', 'reject', 'decline', 'essential only', 'tout refuser', 'ablehnen', 'rechazar', 'rifiuta', 'odmítnout', 'hylkää', 'avvisa', '거부', '拒绝', '拒否', 'رفض'];
    var acceptAllPhrases = (P && P.ACCEPT_PHRASES) ? P.ACCEPT_PHRASES.filter(function (p) { return /all|tous|alle|tutti|todo|todos|vše|όλων|全部|모두|ทั้งหมด|tất cả|semua|सभी|הכל|الكل|kaikki/i.test(p); }) : ['accept all', 'allow all', 'alle akzeptieren', 'tout accepter', 'aceptar todo', 'accetta tutti', 'godkänn allt', 'hyväksy kaikki', 'přijmout vše', '모두 수락', '接受全部', 'すべて受け入れる', 'tümünü kabul et', 'قبول الكل'];
    if (!acceptAllPhrases.length) acceptAllPhrases = ['accept all', 'allow all', 'tout accepter', 'aceptar todo', 'hyväksy kaikki', '모두 수락', '接受全部'];
    var acceptPhrases = (P && P.ACCEPT_PHRASES) ? P.ACCEPT_PHRASES : ['accept all', 'allow all', 'accept', 'agree', 'consent', 'akzeptieren', 'tout accepter', 'accepter', 'aceptar todo', 'aceptar', 'accetta', 'hyväksy', 'godkänn', 'accepteer', 'přijmout', 'souhlasím', '수락', '接受', '同意', '受け入れる', 'قبول', 'kabul'];

    function findByText(phraseList, excludeIfReject, nodesList) {
      var list = (nodesList && nodesList.length) ? nodesList : (doc.body ? doc.body.querySelectorAll('button, [role="button"]') : []);
      for (let i = 0; i < list.length; i++) {
        const el = list[i];
        if (!el) continue;
        if (!inConsentContext(el)) continue;
        const t = textOf(el);
        if (t.length < 3 || t.length > 80) continue;
        if (excludeIfReject && rejectPhrases.some(function (p) { return t.indexOf(p) !== -1; })) continue;
        if (phraseList.some(function (p) { return t.indexOf(p) !== -1; })) {
          if (doClick(el)) return true;
        }
      }
      return false;
    }

    var U = (typeof window !== 'undefined' && window.CookieControlUniversal) || (typeof self !== 'undefined' && self.CookieControlUniversal);
    if (U && U.CONTAINER_SELECTORS && U.isAcceptByAttributes && U.isRejectByAttributes) {
      try {
        var structContainers = doc.body.querySelectorAll(U.CONTAINER_SELECTORS);
        for (var sc = 0; sc < structContainers.length; sc++) {
          var scope = structContainers[sc];
          if (!visible(scope)) continue;
          var btns = scope.querySelectorAll('button, [role="button"]');
          var target = null;
          for (var bi = 0; bi < btns.length; bi++) {
            if (!visible(btns[bi])) continue;
            if (essential && !forceAccept && U.isRejectByAttributes(btns[bi])) { target = btns[bi]; break; }
            if ((forceAccept || !essential) && U.isAcceptByAttributes(btns[bi])) { target = btns[bi]; break; }
          }
          if (target && doClick(target)) {
            setCooldown();
            clicked = true;
            return true;
          }
        }
      } catch (e) {}
    }

    for (let pass = 0; pass < 2; pass++) {
      const useAcceptAllOnly = (pass === 0) && (forceAccept || !essential);
    for (let i = 0; i < nodes.length; i++) {
      if (!inConsentContext(nodes[i])) continue;
      const t = textOf(nodes[i]);
      if (forceAccept || !essential) {
        const matchesAccept = acceptPhrases.some(function (p) { return t.indexOf(p) !== -1; });
        const matchesReject = rejectPhrases.some(function (p) { return t.indexOf(p) !== -1; });
        const matchesAcceptAll = acceptAllPhrases.some(function (p) { return t.indexOf(p) !== -1; });
        if (matchesAccept && !matchesReject && t.length < 80 && (!useAcceptAllOnly || matchesAcceptAll)) {
          if (doClick(nodes[i])) {
            setCooldown();
            clicked = true;
            return true;
          }
        }
      } else {
        const isSubscribe = /subscribe|suscripción|suscripcion|suscriber|s'abonner|abonnement|abonnieren|abbonamento|inscrição|pagar|pay|purchase|buy|comprar|订阅|訂閱/i.test(t);
        if (rejectPhrases.some(function (p) { return t.indexOf(p) !== -1; }) && !isSubscribe) {
          if (doClick(nodes[i])) {
            setCooldown();
            clicked = true;
            return true;
          }
        }
      }
    }
    }
    if (forceAccept || !essential) {
      if (findByText(acceptPhrases.slice(0, 25), true, nodes)) {
        setCooldown();
        clicked = true;
        return true;
      }
    } else {
      if (findByText(rejectPhrases.slice(0, 25), false, nodes)) {
        setCooldown();
        clicked = true;
        return true;
      }
      var savePhrases = (P && P.SAVE_PHRASES) ? P.SAVE_PHRASES : ['save', 'confirm', 'save preferences', 'save choices', 'save settings', 'confirm choices', 'bekräfta', 'bevestigen', 'conferma', 'guardar', 'enregistrer', 'valider'];
      if (findByText(savePhrases, false, nodes)) {
        setCooldown();
        clicked = true;
        return true;
      }
    }
    return false;
  }

  function shouldSkipHost() {
    try {
      var h = (typeof location !== 'undefined' && (location.hostname || '')) || '';
      h = h.toLowerCase();
      return /^(.+\.)?google\.(com|co\.\w{2,})$/.test(h) || /^(.+\.)?bing\.com$/.test(h) || /^(.+\.)?duckduckgo\.com$/.test(h);
    } catch (e) { return false; }
  }

  function run() {
    if (clicked || attempts >= MAX_ATTEMPTS || shouldSkipHost()) return;
    attempts++;
    getPreference(function (essential) {
      if (tryClick(essential)) clearInterval(interval);
    });
  }

  const interval = setInterval(run, 500);
  run();
})();
