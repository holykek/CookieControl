/**
 * CookieControl — Generic consent banner handler (fallback).
 * Looks for any visible consent-like bar/modal with Accept / Reject-style buttons.
 * Catches many custom and smaller CMPs (e.g. redis.io, Termly-like, custom banners).
 */

(function () {
  const ns = window.CookieControl || {};
  const qAll = ns.queryAll;
  const visible = ns.isVisible;
  const click = ns.safeClick;
  const text = ns.normalizedText;

  const NAME = 'Generic';

  var P = (typeof window !== 'undefined' && window.CookieControlPhrases) || (typeof self !== 'undefined' && self.CookieControlPhrases);
  var U = (typeof window !== 'undefined' && window.CookieControlUniversal) || (typeof self !== 'undefined' && self.CookieControlUniversal);

  const BANNER_HINTS_BASE = [
    'cookie', 'consent', 'gdpr', 'privacy', 'ccpa', 'banner', 'cookie-banner',
    'cookie_notice', 'cookie-notice', 'cookieconsent', 'cookie-consent',
    'accept-cookies', 'cookie-policy', 'termly', 'cookieyes', 'cookie-info',
    'kakor', 'cookies', 'integritet', 'personuppgifter', 'samtycke',
    'cookies-accept', 'cookie-widget', 'cookie-notice', 'cc-banner',
    'didomi', 'didomi-popup', 'didomi-panel', 'inställningar',
    'we use cookies', 'this site uses cookies', 'cookie settings', 'cookie choices',
    'privacy notice', 'privacy and cookies', 'manage cookies', 'bbccookies',
    'lemonde', 'repubblica', 'telegraph', 'independent', 'gedi', 'truste', 'one-trust',
    'cookie-preferences', 'cookiepreferences', 'consent-modal', 'consent-banner',
    'reuters', 'iab', 'value your privacy', 'sp-cc', 'sp_cc', 'onetrust', 'trustarc', 'sourcepoint', 'sp_message',
    'choose', 'personalised', 'dailymail', 'telegraph', 'technology partner', 'you\'re in control', 'in control',
  ];
  const BANNER_HINTS = P && P.HINTS ? BANNER_HINTS_BASE.concat(P.HINTS) : BANNER_HINTS_BASE;

  const REJECT_PHRASES_BASE = [
    'i do not agree', 'do not agree', 'non accetto', 'non sono d\'accordo', 'non agree',
    'neka allt', 'godkänn endast nödvändiga', 'reject all', 'decline all', 'avvisa alla', 'deny all', 'refuse all',
    'reject and purchase', 'reject', 'decline', 'essential cookies only', 'only essential', 'essential only', 'necessary only',
    'strictly necessary', 'no thanks', 'deny', 'refuse', 'alle ablehnen',
    'tout refuser', 'refuser tout', 'refuser', 'je refuse', 'rechazar', 'only required', 'accept necessary only',
    'avvisa', 'endast nödvändiga', 'nej tack', 'neka',
    'godta ikke', 'kun nødvendige', 'nei takk', 'avvis',
    'afvis', 'nej tak', 'accepter ikke',
    'hylkää', 'vain välttämättömät', 'ei kiitos', 'älä hyväksy',
    'weiger', 'alleen noodzakelijk', 'nee bedankt', 'afwijzen',
    'rifiuta', 'solo necessari', 'no grazie', 'accetta solo', 'rifiuta tutti',
    'rejeitar', 'apenas necessários', 'não obrigado', 'recusar',
    'odmítnout', 'pouze nezbytné', 'ne díky', 'odmítnout vše', 'odmítnout všechny',
    'odmietnuť', 'iba nevyhnutné', 'nie ďakujem',
  ];
  const REJECT_PHRASES = P && P.REJECT_PHRASES ? REJECT_PHRASES_BASE.concat(P.REJECT_PHRASES) : REJECT_PHRASES_BASE;

  const SAVE_PHRASES_BASE = [
    'spara val', 'spara', 'save preferences', 'save choices', 'save settings', 'save', 'confirm',
    'lagre', 'gem', 'tallenna', 'opslaan', 'salva', 'guardar', 'ulozit', 'uložiť',
    'enregistrer', 'valider', 'conferma', 'salva e chiudi',
  ];
  const SAVE_PHRASES = P && P.SAVE_PHRASES ? SAVE_PHRASES_BASE.concat(P.SAVE_PHRASES) : SAVE_PHRASES_BASE;

  const SETTINGS_PHRASES_BASE = [
    'välj nivå', 'hantera cookies', 'hantera kakor', 'inställningar', 'preferenser',
    'settings', 'customize', 'anpassa', 'manage cookies', 'manage preferences',
    'cookie preferences', 'preferences', 'gestion des cookies',
    'valinnat', 'asetukset', 'voorkeuren', 'impostazioni', 'preferenze', 'impostazioni cookie',
    'definições', 'preferências', 'nastavení', 'välj cookies',
    'gestisci', 'personalizza', 'scelte', 'opzioni cookie',
    'personnaliser', 'gérer les cookies', 'paramètres', 'charte cookies',
    'show purposes', 'manage your privacy choices',
  ];
  const SETTINGS_PHRASES = P && P.SETTINGS_PHRASES ? SETTINGS_PHRASES_BASE.concat(P.SETTINGS_PHRASES) : SETTINGS_PHRASES_BASE;

  const ACCEPT_PHRASES_BASE = [
    'godkänn allt', 'accept all', 'allow all', 'acceptera alla', 'agree to all',
    'i accept', 'accept', 'agree', 'allow', 'accept all cookies', 'accept cookies',
    'alle akzeptieren', 'akzeptieren', 'zustimmen',
    'i agree', 'tout accepter', 'aceptar todo', 'accept and close',
    'okej', 'okay', 'acceptera', 'godkänn alla', 'godkänn', 'tillåt alla',
    'godta alle', 'aksepter alle', 'tillat alle',
    'accepter alle', 'accepter', 'tillad alle',
    'hyväksy kaikki', 'hyväksy', 'salli kaikki',
    'accepteer alle', 'accepteer', 'akkoord', 'ga door',
    'accetta tutti', 'accetta', 'accetto', 'consenti',
    'aceitar todos', 'aceitar', 'concordo', 'permitir',
    'přijmout vše', 'souhlasím', 'přijmout',
    'prijať všetko', 'súhlasím',
    'accept and continue', 'agree and continue', 'yes, i agree',
    'got it', 'i understand', 'allow all cookies',
    'accetta', 'accetta tutti', 'accetto', 'consenti tutti', 'ok', 'continua',
    'tout accepter', 'accepter tout', 'j\'accepte', 'j’accepte', 'accepter', 'continuer', 'fermer',
    'accepter et continuer', 'accept all and close', 'continue to site', 'yes, continue',
    'accept and proceed', 'i\'m happy', 'that\'s ok', 'that\'s okay',
    'i\'m okay with this', 'accept recommended', 'allow recommended', 'ok, continue',
  ];
  const ACCEPT_PHRASES = P && P.ACCEPT_PHRASES ? ACCEPT_PHRASES_BASE.concat(P.ACCEPT_PHRASES) : ACCEPT_PHRASES_BASE;

  /** Match short "No" / "Yes" buttons (e.g. redis.io, Swedish Nej/Ja) in many languages. */
  function isNoButton(t) {
    if (!t || t.length > 25) return false;
    return t === 'no' || t === 'no.' || t === 'no,' || t === 'no!' || /^no[\s,.]/.test(t) || t === 'no thanks' ||
      t === 'nej' || t === 'nej.' || /^nej[\s,.]/.test(t) || t === 'nei' || /^nei[\s,.]/.test(t) ||
      t === 'ne' || t === 'ne.' || t === 'nie' || t === 'нет' || t === 'не' || t === 'nah' ||
      t === 'hayır' || t === 'la' || t === 'لا' || t === 'いいえ' || t === '不' || t === '아니요';
  }
  function isYesButton(t) {
    if (!t || t.length > 35) return false;
    return t === 'yes' || t === 'yes.' || t === 'yes,' || t === 'yes!' || /^yes[\s,.]/i.test(t) || t === 'yes please' ||
      t === 'ja' || t === 'ja.' || /^ja[\s,.]/i.test(t) || t === 'jo' || t === 'ok' || t === 'okej' ||
      t === 'sí' || t === 'si' || t === 'oui' || t === 'da' || t === 'continuer' || t === 'continua' ||
      t === 'evet' || t === 'ναι' || t === 'да' || t === 'ναι' || t === 'ใช่' || t === 'có' ||
      t === 'نعم' || t === 'はい' || t === '是' || t === '예' || t === 'ya' || t === 'saja';
  }

  function isLikelyConsentContainer(el) {
    if (!el) return false;
    const str = ((el.className && el.className.toString()) + ' ' + (el.id || '')).toLowerCase();
    return BANNER_HINTS.some((h) => str.includes(h));
  }

  /** Main document body + same-origin iframe bodies (Didomi etc. often load UI in iframe). */
  function getConsentRoots() {
    const roots = [];
    try {
      const doc = document;
      if (doc && doc.body) roots.push(doc.body);
      const iframes = doc.querySelectorAll ? doc.querySelectorAll('iframe') : [];
      for (const frame of iframes) {
        try {
          if (frame.contentDocument && frame.contentDocument.body) roots.push(frame.contentDocument.body);
        } catch (_) {}
      }
    } catch (_) {}
    return roots;
  }

  /** Collect buttons from root and shadow roots (language-agnostic). */
  function getAllButtons(root) {
    const list = [];
    const sel = 'button, [role="button"]';
    try {
      list.push(...qAll(root, sel));
      const all = root.querySelectorAll('*');
      for (const el of all) {
        if (el.shadowRoot) {
          list.push(...qAll(el.shadowRoot, sel));
          const deep = el.shadowRoot.querySelectorAll('*');
          for (const sub of deep) {
            if (sub.shadowRoot) list.push(...qAll(sub.shadowRoot, sel));
          }
        }
      }
    } catch (_) {}
    return list;
  }

  /** Language-agnostic: find Accept button by data-action, ID, class, or position. */
  function findAcceptByStructure(scope) {
    if (!scope) return null;
    const btns = getAllButtons(scope);
    for (const el of btns) {
      if (!visible(el)) continue;
      if (U && U.isAcceptByAttributes && U.isAcceptByAttributes(el)) return el;
    }
    if (U && U.getButtonsByPosition && btns.length >= 2) {
      const pair = U.getButtonsByPosition(btns.filter(visible));
      return pair.accept || null;
    }
    return null;
  }

  /** Language-agnostic: find Reject button by data-action, ID, class, or position. */
  function findRejectByStructure(scope) {
    if (!scope) return null;
    const btns = getAllButtons(scope);
    for (const el of btns) {
      if (!visible(el)) continue;
      if (U && U.isRejectByAttributes && U.isRejectByAttributes(el)) return el;
    }
    if (U && U.getButtonsByPosition && btns.length >= 2) {
      const pair = U.getButtonsByPosition(btns.filter(visible));
      return pair.reject || null;
    }
    return null;
  }

  const MAX_BANNER_HEIGHT = typeof window !== 'undefined' && window.innerHeight
    ? Math.min(1200, Math.round(window.innerHeight * 0.95)) : 1200;

  function getBannerContainer(btn) {
    if (!btn || !btn.closest) return null;
    let container = btn.closest('div, section, aside, [role="dialog"], [role="alertdialog"]');
    if (!container || container === document.body || !visible(container)) return null;
    if (container.clientHeight <= MAX_BANNER_HEIGHT && container.clientWidth > 100) return container;
    let parent = btn.parentElement;
    for (let i = 0; i < 8 && parent && parent !== document.body; i++) {
      if (visible(parent) && parent.clientHeight <= MAX_BANNER_HEIGHT && parent.clientWidth > 100) return parent;
      parent = parent.parentElement;
    }
    return container;
  }

  function findBannerRoot() {
    const roots = getConsentRoots();
    for (const root of roots) {
      const banner = findBannerRootIn(root);
      if (banner) return banner;
    }
    return null;
  }

  function findBannerRootIn(root) {
    if (!root) return null;
    if (U && U.CONTAINER_SELECTORS) {
      try {
        const struct = root.querySelectorAll(U.CONTAINER_SELECTORS);
        for (const c of struct) {
          if (!visible(c)) continue;
          const btns = getAllButtons(c);
          const vis = btns.filter(visible);
          if (vis.length >= 2) return c;
          if (vis.length >= 1 && ((U.isAcceptByAttributes && U.isAcceptByAttributes(vis[0])) || (U.isRejectByAttributes && U.isRejectByAttributes(vis[0])))) return c;
        }
      } catch (_) {}
    }
    const candidates = root.querySelectorAll(
      '[class*="cookie"], [id*="cookie"], [class*="consent"], [id*="consent"], ' +
      '[class*="gdpr"], [role="dialog"], [role="alertdialog"], [class*="banner"], [class*="cookie-notice"], ' +
      '[class*="termly"], [class*="cookieyes"], [class*="cookiebot"], [class*="cookie-law"], [data-testid*="cookie"], ' +
      '[class*="kakor"], [id*="kakor"], [class*="integritet"], [class*="samtycke"], ' +
      '[class*="cookie-widget"], [class*="cc-banner"], [class*="cookie-banner"], [class*="gdpr-cookie"], ' +
      '[class*="didomi"], [id*="didomi"], [class*="privacy"], [id*="privacy"], [class*="bbccookies"], [class*="consent-modal"], [class*="truste"], [id*="truste"], [class*="onetrust"], ' +
      '[class*="choose"], [class*="personalised"], [class*="essential"], [class*="civic"], [class*="osano"], [class*="klaro"]'
    );
    for (const el of candidates) {
      if (!visible(el)) continue;
      if (isLikelyConsentContainer(el)) return el;
      const parent = el.closest && el.closest('[class*="cookie"], [class*="consent"], [role="dialog"]');
      if (parent && visible(parent)) return parent;
    }
    const allButtons = getAllButtons(root);
    for (const btn of allButtons) {
      const t = text(btn);
      if (REJECT_PHRASES.some((p) => t.includes(p)) || ACCEPT_PHRASES.some((p) => t.includes(p)) ||
          SETTINGS_PHRASES.some((p) => t.includes(p)) || isYesButton(t)) {
        const container = getBannerContainer(btn);
        if (container) return container;
      }
    }
    let noBtn = null, yesBtn = null;
    for (const btn of allButtons) {
      if (!visible(btn)) continue;
      const t = text(btn);
      if (isNoButton(t)) noBtn = btn;
      if (isYesButton(t)) yesBtn = btn;
    }
    if (noBtn && yesBtn) {
      let container = noBtn.parentElement;
      while (container && container !== root && !container.contains(yesBtn)) container = container.parentElement;
      if (container && container !== root && visible(container)) return container;
      container = yesBtn.parentElement;
      while (container && container !== root && !container.contains(noBtn)) container = container.parentElement;
      if (container && container !== root && visible(container)) return container;
    }
    /** First-step banner: text hints (any language) + consent buttons. */
    const firstBannerHints = [
      'du väljer kakor', 'vi använder kakor', 'we use cookies', 'this site uses', 'cookie', 'consent', 'privacy', 'données', 'donnees', 'partenaires', 'accepter',
      'utilizziamo cookie', 'questo sito utilizza', 'informativa cookie', 'cookie policy',
      'kakor', 'samtycke', 'preferenze cookie', 'gestione cookie',
      'nous utilisons', 'ce site utilise', 'charte cookies', 'données personnelles',
      'cookie policy', 'politique de confidentialité', 'accept our use', 'accept cookies',
      'we value your privacy', 'how and why we process', 'iab partners', 'manage cookies',
      'choose how to use', 'personalised ads', 'dailymail', 'reject and purchase',
    ];
    const clickables = 'button, a, [role="button"], [class*="didomi-button"], [class*="didomi-cta"], [class*="button"]';
    for (const el of root.querySelectorAll('*')) {
      if (!visible(el) || !el.textContent) continue;
      const t = text(el);
      if (!firstBannerHints.some((h) => t.includes(h))) continue;
      if (t.length > 2000) continue;
      const buttons = qAll(el, clickables);
      const hasSettings = buttons.some((b) => SETTINGS_PHRASES.some((p) => text(b).includes(p)));
      const hasAccept = buttons.some((b) => ACCEPT_PHRASES.some((p) => text(b).includes(p)) || isYesButton(text(b)));
      const hasReject = buttons.some((b) => REJECT_PHRASES.some((p) => text(b).includes(p)) || isNoButton(text(b)));
      const hasSubscribeOnly = buttons.some((b) => /subscribe|suscripción|suscripcion|s'abonner|abonnement|abbonamento|pagar|comprar/i.test(text(b)));
      if ((hasSettings && hasAccept) || (hasAccept && hasReject) || (hasAccept && hasSubscribeOnly)) return el;
    }
    /** Last resort: any visible container with both accept-like and reject/settings-like button, banner-sized. */
    const allBtns = getAllButtons(root);
    for (const btn of allBtns) {
      if (!visible(btn)) continue;
      const t = text(btn);
      const isAccept = ACCEPT_PHRASES.some((p) => t.includes(p)) || isYesButton(t);
      const isRejectOrSettings = REJECT_PHRASES.some((p) => t.includes(p)) || SETTINGS_PHRASES.some((p) => t.includes(p)) || isNoButton(t);
      if (!isAccept && !isRejectOrSettings) continue;
      let container = btn.parentElement;
      for (let i = 0; i < 12 && container && container !== root; i++) {
        if (container.clientHeight > 600 || container.clientWidth < 150) { container = container.parentElement; continue; }
        const inContainer = allBtns.filter((b) => visible(b) && container.contains(b));
        const hasA = inContainer.some((b) => ACCEPT_PHRASES.some((p) => text(b).includes(p)) || isYesButton(text(b)));
        const hasR = inContainer.some((b) => REJECT_PHRASES.some((p) => text(b).includes(p)) || SETTINGS_PHRASES.some((p) => text(b).includes(p)) || isNoButton(text(b)));
        if (hasA && hasR) return container;
        container = container.parentElement;
      }
    }
    return null;
  }

  function detect() {
    var banner = findBannerRoot();
    if (banner) return true;
    if (U && U.CONTAINER_SELECTORS) {
      const roots = getConsentRoots();
      for (const root of roots) {
        try {
          const containers = root.querySelectorAll(U.CONTAINER_SELECTORS);
          for (const c of containers) {
            if (!visible(c)) continue;
            const btns = getAllButtons(c);
            const vis = btns.filter(visible);
            if (vis.length < 2) continue;
            var hasAcceptAttr = U.isAcceptByAttributes && vis.some(function (b) { return U.isAcceptByAttributes(b); });
            var hasRejectAttr = U.isRejectByAttributes && vis.some(function (b) { return U.isRejectByAttributes(b); });
            if (hasAcceptAttr || hasRejectAttr) return true;
            if (vis.length >= 2) return true;
          }
        } catch (_) {}
      }
    }
    const roots = getConsentRoots();
    for (const root of roots) {
      const candidates = getButtonsInScope(root).length ? getButtonsInScope(root) : getAllButtons(root);
      let hasSettings = false;
      let hasAcceptOrOkej = false;
      let hasReject = false;
      for (const el of candidates) {
        if (!visible(el)) continue;
        const t = text(el);
        if (REJECT_ALL_PHRASES.some((p) => t.includes(p)) || SAVE_PHRASES.some((p) => t.includes(p))) return true;
        if (SETTINGS_PHRASES.some((p) => t.includes(p))) hasSettings = true;
        if (REJECT_PHRASES.some((p) => t.includes(p)) || isNoButton(t)) hasReject = true;
        if ((ACCEPT_PHRASES.some((p) => t.includes(p)) || isYesButton(t)) && t.length < 50) hasAcceptOrOkej = true;
      }
      if ((hasSettings && hasAcceptOrOkej) || (hasReject && hasAcceptOrOkej)) return true;
    }
    return false;
  }

  const BUTTON_SEL = 'button, a[role="button"], a[href="#"], a[href="javascript:void(0)"], a[href="javascript:;"], [role="button"], [onclick], [class*="didomi-button"], [class*="didomi-cta"], [class*="didomi-continue"], [class*="didomi-preferences"], [class*="didomi-preview"], [class*="button"], [class*="btn"]';

  function getButtonsInScope(scope) {
    const list = [];
    try {
      if (scope) list.push(...qAll(scope, BUTTON_SEL));
      if (scope && scope.shadowRoot) {
        list.push(...qAll(scope.shadowRoot, BUTTON_SEL));
        scope.shadowRoot.querySelectorAll('*').forEach((el) => {
          if (el.shadowRoot) list.push(...qAll(el.shadowRoot, BUTTON_SEL));
        });
      }
    } catch (_) {}
    return list;
  }

  const REJECT_ALL_PHRASES = ['neka allt', 'reject all', 'decline all', 'avvisa alla', 'deny all', 'refuse all', 'essential cookies only', 'i do not agree', 'do not agree', 'alle ablehnen', 'tout refuser', 'refuser tout', 'rechazar todo', 'odmítnout vše'];

  /** Find smallest visible container that has both an accept-like and a reject-like button (the actual banner). */
  function findContainerWithAcceptAndReject(root) {
    if (!root) return null;
    const allBtns = getAllButtons(root);
    const acceptBtns = [];
    const rejectBtns = [];
    for (const el of allBtns) {
      if (!visible(el)) continue;
      const t = text(el);
      if (ACCEPT_PHRASES.some((p) => t.includes(p)) || isYesButton(t)) acceptBtns.push(el);
      if (REJECT_PHRASES.some((p) => t.includes(p)) || isNoButton(t)) rejectBtns.push(el);
    }
    for (const rejectBtn of rejectBtns) {
      let container = rejectBtn.parentElement;
      for (let i = 0; i < 15 && container && container !== root; i++) {
        if (container.clientHeight > 800 || container.clientWidth < 150) { container = container.parentElement; continue; }
        const hasAccept = acceptBtns.some((b) => container.contains(b));
        const hasReject = rejectBtns.some((b) => container.contains(b));
        if (hasAccept && hasReject) return container;
        container = container.parentElement;
      }
    }
    return null;
  }

  function findRejectButton(root) {
    const scope = root || document.body;
    var byStructure = findRejectByStructure(scope);
    if (byStructure) return byStructure;
    const candidates = scope ? getButtonsInScope(scope) : getAllButtons(document.body);
    let rejectAllBtn = null;
    for (const el of candidates) {
      if (!visible(el)) continue;
      const t = text(el);
      if (REJECT_ALL_PHRASES.some((p) => t.includes(p))) return el;
      if (!rejectAllBtn && (REJECT_PHRASES.some((p) => t.includes(p)) || isNoButton(t))) rejectAllBtn = el;
    }
    return rejectAllBtn;
  }

  /** Prefer buttons that are clearly the main "dismiss" CTA (e.g. "OK", "Accept all") over "Continue" etc. */
  function acceptButtonScore(t) {
    if (!t || t.length > 40) return 0;
    var lower = t.toLowerCase().trim();
    if (/^(ok|okay|accept|agree|yes|i agree)$/.test(lower)) return 10;
    if (/accept all|allow all|accept all cookies|i agree|agree and continue/.test(lower)) return 9;
    if (/accept and close|got it|allow all cookies/.test(lower)) return 8;
    if (/continue|proceed/.test(lower)) return 3;
    return 5;
  }

  /** Exact primary accept labels (fallback for phrase matching). */
  var ACCEPT_EXACT = ['yes, i agree', 'i agree', 'i accept', 'accetta', 'accept all', 'allow all'];
  function findAcceptButton(root) {
    const scope = root || document.body;
    var byStructure = findAcceptByStructure(scope);
    if (byStructure) return byStructure;
    var candidates = scope ? getButtonsInScope(scope) : getAllButtons(document.body);
    var best = null;
    var bestScore = 0;
    for (const el of candidates) {
      if (!visible(el)) continue;
      const t = text(el);
      if (!ACCEPT_PHRASES.some((p) => t.includes(p)) && !isYesButton(t)) continue;
      // Strong boost for exact primary labels so we click the real CTA
      var exactMatch = ACCEPT_EXACT.some(function (phrase) {
        return t === phrase || t.replace(/\s+/g, ' ').trim() === phrase || t.indexOf(phrase) === 0 && t.length < 25;
      });
      var score = acceptButtonScore(t) + (exactMatch ? 20 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    }
    return best;
  }

  /** True if el or an ancestor (up to body) has cookie/consent/privacy in class, id, or text. */
  function isInConsentContext(el, maxAncestors) {
    if (!el) return false;
    const hints = ['cookie', 'consent', 'privacy', 'gdpr', 'banner', 'notice', 'preference', 'truste', 'onetrust', 'iab', 'reuters', 'value'];
    let node = el;
    let up = (maxAncestors || 15);
    while (node && up-- > 0) {
      const str = ((node.className && node.className.toString()) + ' ' + (node.id || '') + ' ' + (node.textContent || '').slice(0, 400)).toLowerCase();
      if (hints.some((h) => str.includes(h))) return true;
      node = node.parentElement;
    }
    return false;
  }

  function findSettingsButton(root) {
    const scope = root || document.body;
    const candidates = scope ? getButtonsInScope(scope) : getAllButtons(document.body);
    for (const el of candidates) {
      if (!visible(el)) continue;
      const t = text(el);
      if (SETTINGS_PHRASES.some((p) => t.includes(p))) return el;
    }
    return null;
  }

  function findSaveButton(root) {
    const scope = root || document.body;
    const candidates = scope ? getButtonsInScope(scope) : getAllButtons(document.body);
    for (const el of candidates) {
      if (!visible(el)) continue;
      const t = text(el);
      if (SAVE_PHRASES.some((p) => t.includes(p))) return el;
    }
    return null;
  }

  /** After a click, only report success if the consent banner is actually gone (not still visible). */
  function verifyBannerGone() {
    return new Promise(function (resolve) {
      setTimeout(function () {
        var root = findBannerRoot();
        if (root && visible(root)) {
          resolve(false);
          return;
        }
        var roots = getConsentRoots();
        for (var i = 0; i < roots.length; i++) {
          var pair = findContainerWithAcceptAndReject(roots[i]);
          if (pair && visible(pair)) {
            resolve(false);
            return;
          }
        }
        resolve(true);
      }, 500);
    });
  }

  function applyConsent(ruleSet) {
    const banner = findBannerRoot();
    const essentialOnly = ruleSet && ruleSet.essential === true &&
      (ruleSet.functional !== true && ruleSet.analytics !== true && ruleSet.marketing !== true);

    const bodyText = (document.body && document.body.innerText || '').toLowerCase();
    var rejectTiedToSubscribe = /(reject|refuse|rechazar|rifiuta|refuser|ablehnen).*(subscribe|suscripción|suscripcion|abonnement|s'abonner|abbonamento|pagar|pay|purchase|buy|comprar|abonnieren)/i.test(bodyText) ||
      /(subscribe|suscripción|suscripcion|abonnement|s'abonner|pagar|pay|comprar|buy).*(reject|refuse|rechazar|rifiuta|refuser|ablehnen)/i.test(bodyText) ||
      /obligatorisch|werbefrei|consent required|accéder gratuitement|free.*by accepting/i.test(bodyText);
    var noRejectOption = /(accepter|accept|subscribe|suscripción|suscripcion|s'abonner|abonnement)/i.test(bodyText) && !/(refuser|reject|refuse|ablehnen|rechazar)/i.test(bodyText);
    var forceAccept = essentialOnly && (rejectTiedToSubscribe || noRejectOption);

    /** Prefer container that has both "I agree" and "I do not agree" so we don't click a random link elsewhere. */
    let pairRoot = null;
    const allRoots = getConsentRoots();
    for (const r of allRoots) {
      pairRoot = findContainerWithAcceptAndReject(r);
      if (pairRoot) break;
    }
    const roots = [banner, pairRoot, document.body].filter(Boolean);
    for (const r of allRoots) { if (!roots.includes(r)) roots.push(r); }

    if (essentialOnly && !forceAccept) {
      for (const scope of roots) {
        const btn = findRejectButton(scope);
        if (btn && !/purchase|subscribe|buy|pay|suscripción|suscripcion|suscriber|abonnement|s'abonner|abbonamento|pagar|comprar|abonnieren|inscrição|inscricao|会员|구독|สมัคร|đăng ký|berlangganan/i.test(text(btn)) && click(btn)) return verifyBannerGone();
      }
      for (const scope of roots) {
        const saveBtn = findSaveButton(scope);
        if (saveBtn && click(saveBtn)) return verifyBannerGone();
      }
      for (const scope of roots) {
        const settingsBtn = findSettingsButton(scope);
        if (settingsBtn && click(settingsBtn)) return verifyBannerGone();
      }
    }
    if (forceAccept || !essentialOnly) {
      for (const scope of roots) {
        const btn = findAcceptButton(scope);
        if (btn && click(btn)) return verifyBannerGone();
      }
      /** Last resort: accept-like button anywhere, but only if inside consent-like container. */
      const bodyCandidates = getButtonsInScope(document.body);
      const shortContinue = /^(continue|proceed|ok|accept)$/i;
      for (const el of bodyCandidates) {
        if (!visible(el)) continue;
        const t = (text(el) || '').trim();
        if (t.length > 50) continue;
        const isAccept = ACCEPT_PHRASES.some((p) => t.includes(p)) || isYesButton(t) || shortContinue.test(t);
        if (isAccept && isInConsentContext(el) && click(el)) return verifyBannerGone();
      }
    }
    return false;
  }

  const handler = { name: NAME, detect, applyConsent };
  if (ns.registerCMP) ns.registerCMP(handler);
  window.CookieControl = ns;
})();
