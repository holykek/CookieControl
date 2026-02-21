/**
 * CookieControl — Multilingual phrases for consent detection and button matching.
 * Works in content scripts (window) and service worker (self) via importScripts.
 */
(function (global) {
  if (!global) global = typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : this;

  /** Words that indicate a cookie/consent page — 60+ languages. */
  var CONSENT_DETECT = [
    'cookie', 'cookies', 'privacy', 'consent', 'gdpr', 'ccpa',
    'datenschutz', 'einstellungen', 'akzeptieren', 'ablehnen', 'personalisierte',
    'données', 'donnees', 'témoins', 'temoins', 'choix', 'partenaires', 'paramètres', 'parametres',
    'galletas', 'aceptar', 'rechazar', 'privacidad', 'consentimiento',
    'biscotti', 'accetta', 'rifiuta', 'privacy', 'consenso', 'impostazioni',
    'aceitar', 'recusar', 'privacidade', 'consentimento',
    'koekjes', 'accepteer', 'weiger', 'toestemming', 'voorkeuren',
    'kakor', 'godkänn', 'avvisa', 'integritet', 'samtycke', 'inställningar',
    'du väljer kakor', 'godkänn alla', 'godkänn endast', 'välj nivå', 'hantera kakor', 'cookiepolicy',
    'godta', 'avvis', 'personvern', 'samtykke',
    'evästeet', 'evasteet', 'hyväksy', 'hylkää', 'yksityisyys', 'suostumus',
    'ciasteczka', 'plik cookie', 'akceptuj', 'odrzuc', 'prywatność', 'zgoda',
    'přijmout', 'odmítnout', 'souhlas', 'nastavení', 'soubor',
    'súbory cookie', 'prijať', 'odmietnuť', 'súhlas',
    'sütik', 'elfogad', 'elutasít', 'adatvédelem', 'hozzájárulás',
    'cookie-uri', 'refuz', 'confidențialitate', 'consimțământ',
    'kolačići', 'prihvati', 'odbij', 'privatnost', 'pristanak',
    'бисквитки', 'куки', 'приемам', 'отказ', 'поверителност', 'съгласие',
    'печенье', 'принять', 'отклонить', 'приватность', 'согласие',
    'прийняти', 'відхилити', 'приватність', 'згода',
    'τραγανίτες', 'αποδοχή', 'άρνηση', 'ιδιωτικότητα', 'συναίνεση',
    'çerez', 'çerezler', 'kabul', 'reddet', 'gizlilik', 'onay',
    'كوكي', 'كوكيز', 'قبول', 'رفض', 'خصوصية', 'موافقة', 'ملفات',
    'クッキー', '同意', '拒否', 'プライバシー', '承諾',
    '饼干', '接受', '拒绝', '隐私', '同意', '曲奇',
    '쿠키', '수락', '거부', '개인정보', '동의',
    'คุกกี้', 'ยอมรับ', 'ปฏิเสธ', 'ความเป็นส่วนตัว', 'ความยินยอม',
    'chấp nhận', 'từ chối', 'quyền riêng tư', 'đồng ý',
    'terima', 'tolak', 'privasi', 'persetujuan', 'setuju',
    'स्वीकार', 'अस्वीकार', 'गोपनीयता', 'सहमति', 'कुकी',
    'מקבל', 'דוחה', 'פרטיות', 'הסכמה', 'עוגיות',
    'راضی', 'موافق', 'قبول کردن', 'کوکی',
    'راضی', 'قبول', 'کوکیز', 'پرائیویسی',
    'tinatanggap', 'tanggi', 'pagsang-ayon', 'privacy',
    'zvana', 'kubvuma', 'privacy', 'cookies',
    'sutikti', 'atmeskite', 'privatumas', 'slapukai',
    'piekrīt', 'noraidīt', 'privātums', 'sīkdatnes',
    'nõustu', 'keelduda', 'privaatsus', 'küpsised',
    'souhlasím', 'souhlasiť', 'súhlasím', 'privacy',
    'strinjam', 'zavrnem', 'zasebnost', 'piškotki',
    'pristajem', 'odbijam', 'privatnost', 'kolačići',
    'согласен', 'приватност', 'колачиња',
    'pranoj', 'refuzoj', 'privatësia', 'biskotat',
    'accept all', 'reject all', 'allow all', 'refuse all', 'essential only',
    'manage', 'save & exit', 'make a choice', 'personalised', 'truste', 'onetrust',
    'iubenda', 'didomi', 'cookiebot', 'quantcast', 'sourcepoint', 'sp_cc', 'sp-cc',
    'value your privacy', 'technology partner', 'you\'re in control', 'purposes', 'vendors'
  ];

  /** Accept/agree button text — many languages. */
  var ACCEPT_PHRASES = [
    'accept all', 'allow all', 'accept', 'agree', 'allow', 'ok', 'yes', 'continue',
    'i accept', 'i agree', 'accept all cookies', 'accept cookies', 'allow all cookies',
    'alle akzeptieren', 'akzeptieren', 'zustimmen', 'alle zustimmen',
    'tout accepter', 'accepter tout', 'j\'accepte', 'accepter', 'j’accepte',
    'aceptar todo', 'aceptar', 'acepto', 'consiento',
    'accetta tutti', 'accetta', 'accetto', 'consenti',
    'aceitar todos', 'aceitar', 'concordo', 'permitir',
    'accepteer alle', 'accepteer', 'akkoord', 'ga door', 'toestaan',
    'godkänn allt', 'godkänn alla', 'godkänn', 'acceptera', 'tillåt alla', 'acceptera alla',
    'godta alle', 'aksepter alle', 'tillat alle',
    'hyväksy kaikki', 'hyväksy', 'salli kaikki',
    'accetta', 'ok', 'continua', 'okej', 'okay',
    'přijmout vše', 'souhlasím', 'přijmout',
    'prijať všetko', 'súhlasím', 'prijať',
    'elöljáró beleegyezés', 'elfogadom', 'elfogad', 'mindent elfogad',
    'acceptez', 'totul', 'accept', 'sunt de acord',
    'prihvati sve', 'prihvati', 'slažem se',
    'приемам всички', 'приемам', 'съгласен съм',
    'принять все', 'принять', 'принимаю', 'согласен',
    'прийняти всі', 'прийняти', 'згоден',
    'αποδοχή όλων', 'αποδοχή', 'συμφωνώ',
    'tümünü kabul et', 'kabul et', 'kabul ediyorum', 'onayla',
    'قبول الكل', 'قبول', 'موافق',
    'すべて受け入れる', '受け入れる', '同意する', 'OK',
    '接受全部', '接受', '同意',
    '모두 수락', '수락', '동의',
    'ยอมรับทั้งหมด', 'ยอมรับ', 'ตกลง',
    'chấp nhận tất cả', 'chấp nhận', 'đồng ý',
    'terima semua', 'terima', 'setuju',
    'स्वीकार', 'मैं सहमत', 'सभी स्वीकार',
    'מאשר', 'מסכים', 'אני מסכים',
    'موافقم', 'قبول میکنم', 'پذیرش',
    'ہاں', 'قبول', 'میں راضی',
    'tinatanggap', 'sumasang-ayon', 'pumapayag',
    'ndapagura', 'ndabvuma', 'sutinku', 'piekrītu', 'nõustun',
    'strinjam', 'pristajem', 'pranoj',
    'got it', 'i understand', 'yes, i agree', 'continue to site',
    'accept and close', 'accept and continue', 'agree and continue',
    'accepter et continuer', 'accept and proceed', 'continue'
  ];

  /** Reject/refuse/essential-only button text — 60+ languages. */
  var REJECT_PHRASES = [
    'reject all', 'refuse all', 'decline all', 'essential only', 'necessary only',
    'essential cookies only', 'reject', 'refuse', 'decline', 'no thanks', 'deny',
    'alle ablehnen', 'ablehnen', 'nur notwendige',
    'tout refuser', 'refuser tout', 'refuser', 'continuer sans accepter', 'seulement essentiels',
    'rechazar todo', 'rechazar', 'solo necesarios', 'solo los necesarios',
    'rifiuta tutti', 'rifiuta', 'solo necessari', 'no grazie',
    'recusar todos', 'recusar', 'apenas necessários', 'não obrigado',
    'weiger alle', 'afwijzen', 'alleen noodzakelijk', 'nee bedankt',
    'avvisa alla', 'neka allt', 'godkänn endast nödvändiga', 'endast nödvändiga', 'nej tack', 'avvisa',
    'avvis alle', 'nei takk', 'kun nødvendige', 'avvis',
    'afvis alle', 'nej tak',
    'hylkää kaikki', 'vain välttämättömät', 'ei kiitos',
    'odmítnout vše', 'odmítnout', 'pouze nezbytné', 'ne díky',
    'odmietnuť', 'iba nevyhnutné', 'nie ďakujem',
    'elutasít mindent', 'elutasít', 'csak szükséges',
    'refuz tot', 'refuz', 'doar esențiale',
    'odbij sve', 'odbij', 'samo potrebni',
    'отклонявам', 'отказ', 'само необходими',
    'отклонить', 'только необходимые',
    'відхилити', 'тільки необхідні',
    'απόρριψη', 'άρνηση', 'μόνο απαραίτητα',
    'tümünü reddet', 'reddet', 'sadece gerekli',
    'رفض', 'رفض الكل', 'لا أوافق',
    '拒否', '拒绝', '全部拒绝',
    '거부', '모두 거부', '필수만',
    'ปฏิเสธ', 'ปฏิเสธทั้งหมด',
    'từ chối', 'từ chối tất cả',
    'tolak', 'tolak semua', 'enggan',
    'अस्वीकार', 'स्वीकार नहीं',
    'דוחה', 'מסרב',
    'رد', 'نمی‌پذیرم',
    'tanggi', 'tinanggihan'
  ];

  /** Save / confirm / validate button text. */
  var SAVE_PHRASES = [
    'save', 'confirm', 'save preferences', 'save choices', 'save settings',
    'spara', 'spara val', 'bekräfta', 'bekräfta val',
    'lagre', 'gem', 'bekræft',
    'tallenna', 'vahvista', 'tallenna valinnat',
    'opslaan', 'opslaan', 'bevestigen',
    'salva', 'conferma', 'salva e chiudi', 'conferma e chiudi',
    'guardar', 'confirmar', 'guardar preferencias',
    'enregistrer', 'valider', 'enregistrer les préférences',
    'ulozit', 'uložiť', 'uložit nastavení',
    'zapisz', 'zapisz ustawienia', 'potwierdź',
    'mentés', 'mentés és bezárás',
    'salvează', 'confirmă',
    'запази', 'потвърди',
    'сохранить', 'подтвердить',
    'αποθήκευση', 'επιβεβαίωση',
    'kaydet', 'onayla',
    '保存', '確認', '儲存',
    '저장', '확인',
    'บันทึก', 'ยืนยัน',
    'lưu', 'xác nhận',
    'simpan', 'konfirmasi',
    'सहेजें', 'पुष्टि',
    'שמור', 'אישור',
    'sutinku', 'patvirtinti', 'išsaugoti',
    'saglabāt', 'apstiprināt'
  ];

  /** Paywall "accept cookies" / "continue with cookies" — many languages. */
  var PAYWALL_ACCEPT_PHRASES = [
    'continúa aceptando las cookies', 'continua aceptando', 'continue accepting cookies',
    'accept cookies', 'aceptar cookies', 'aceptar las cookies', 'accepter les cookies',
    'o continúa aceptando', 'o continua aceptando', 'or accept cookies',
    'continue with cookies', 'continuer avec les cookies', 'fortfahren mit cookies',
    'accept and continue', 'aceptar y continuar', 'accepter et continuer',
    'accetta i cookie', 'continua con i cookie', 'aceitar cookies', 'continuar com cookies',
    'cookies accepteren', 'doorgaan met cookies', 'godkänn cookies', 'fortsätt med kakor',
    'hyväksy evästeet', 'jatka evästeillä', 'akzeptiere cookies', 'cookies akzeptieren',
    'akceptuj wszystkie', 'přijmout vše', 'akceptovať všetko',
    'accepta cookies', 'continuă cu cookie-urile',
    'приемам бисквитките', 'принять cookies', 'прийняти cookies',
    'αποδοχή cookies', 'sutinku su slapukais',
    'cookies kabul et', 'cookies onayla',
    'قبول الكوكيز', 'موافق على الكوكيز',
    'クッキーを受け入れる', '同意して続行',
    '接受cookie', '同意并继续',
    '쿠키 수락', '동의하고 계속'
  ];

  /** Settings/manage button text — many languages. */
  var SETTINGS_PHRASES = [
    'välj nivå', 'hantera cookies', 'hantera kakor', 'manage cookies', 'manage preferences',
    'inställningar', 'preferenser', 'settings', 'customize', 'valinnat', 'asetukset',
    'voorkeuren', 'impostazioni', 'preferenze', 'paramètres', 'gérer les cookies'
  ];

  /** DOM hints (class/id/role) for consent containers. */
  var HINTS = [
    'cookie', 'consent', 'privacy', 'gdpr', 'banner', 'notice', 'preference',
    'truste', 'onetrust', 'iubenda', 'iab', 'sourcepoint', 'sp_cc', 'sp-cc',
    'value', 'sp_message', 'choose', 'personalised', 'essential', 'reject', 'accept',
    'einstellungen', 'spiegel', 'figaro', 'partenaires', 'données',
    'kakor', 'integritet', 'samtycke', 'inställningar', 'voorkeuren', 'välj nivå',
    'cookies', 'galletas', 'biscotti', 'ciasteczka', 'evästeet', 'evasteet',
    'koekjes', 'sütik', 'soubory', 'cookie-uri', 'çerez',
    'cookiepolicy', 'cookie-policy', 'cookieyes', 'cookiebot', 'termly', 'didomi',
    'civic', 'osano', 'klaro', 'cookie-law', 'gdpr-cookie', 'ccpa'
  ];

    global.CookieControlPhrases = {
    CONSENT_DETECT: CONSENT_DETECT,
    ACCEPT_PHRASES: ACCEPT_PHRASES,
    REJECT_PHRASES: REJECT_PHRASES,
    SAVE_PHRASES: SAVE_PHRASES,
    SETTINGS_PHRASES: SETTINGS_PHRASES,
    PAYWALL_ACCEPT_PHRASES: PAYWALL_ACCEPT_PHRASES,
    HINTS: HINTS,
    /** True if page text suggests a consent banner (cookie/privacy in any language). */
    hasConsentLikeText: function (text) {
      if (!text || typeof text !== 'string') return false;
      var t = text.toLowerCase();
      return CONSENT_DETECT.some(function (p) { return t.indexOf(p) !== -1; });
    },
    /** Build regex for fast consent detection (single pass). */
    getConsentDetectRegex: function () {
      if (global.__CookieControlConsentRegex) return global.__CookieControlConsentRegex;
      global.__CookieControlConsentRegex = new RegExp(CONSENT_DETECT.map(function (p) {
        return p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }).join('|'), 'i');
      return global.__CookieControlConsentRegex;
    }
  };
})(typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : this);
