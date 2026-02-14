/**
 * CookieControl — Popup UI. Shows default consent, current site, last action, Re-apply button, Pro CTA (placeholder).
 */

const LAST_ACTION_PREFIX = 'cookieControl_lastAction_';
const GLOBAL_RULES_KEY = 'cookieControl_globalRules';
const DOMAIN_RULES_KEY = 'cookieControl_domainRules';
const LOG_KEY = 'cookieControl_actionLog';
const PRO_KEY = 'cookieControl_pro';

const RULE_SETS = {
  essential: { essential: true, functional: false, analytics: false, marketing: false },
  'accept-all': { essential: true, functional: true, analytics: true, marketing: true },
};

const extpay = (typeof ExtPay !== 'undefined' && typeof EXTPAY_EXTENSION_ID !== 'undefined')
  ? ExtPay(EXTPAY_EXTENSION_ID)
  : null;

function showView(viewId) {
  const main = document.getElementById('main-view');
  const upgrade = document.getElementById('upgrade-view');
  if (!main || !upgrade) return;
  const isUpgrade = viewId === 'upgrade-view';
  main.classList.toggle('hidden', isUpgrade);
  upgrade.classList.toggle('hidden', !isUpgrade);
  if (isUpgrade) renderUpgradeView();
}

function updatePlanBadge() {
  const badge = document.getElementById('plan-badge');
  if (!badge) return;
  chrome.storage.local.get([PRO_KEY], (result) => {
    const isPro = !!result[PRO_KEY];
    badge.textContent = isPro ? 'Pro' : 'Free';
    badge.className = 'badge ' + (isPro ? 'badge-pro' : 'badge-free');
    const upgradeBtn = document.getElementById('upgrade');
    if (upgradeBtn) upgradeBtn.textContent = isPro ? 'Manage Pro' : 'Upgrade';
    const freeSection = document.getElementById('free-consent-section');
    const proSettings = document.getElementById('pro-settings');
    if (freeSection) freeSection.classList.toggle('hidden', isPro);
    if (proSettings) proSettings.classList.toggle('hidden', !isPro);
    if (isPro) {
      loadProCategoryToggles();
      loadThisSiteRule();
      loadRecentActivity();
    }
  });
}

function syncProFromPayments(callback) {
  if (!extpay || typeof extpay.getUser !== 'function') {
    if (callback) callback(null);
    return;
  }
  extpay.getUser()
    .then((user) => {
      const paid = !!(user && user.paid);
      chrome.storage.local.set({ [PRO_KEY]: paid }, () => {
        updatePlanBadge();
        if (callback) callback(paid);
      });
    })
    .catch(() => {
      if (callback) callback(null);
    });
}

function renderUpgradeView() {
  syncProFromPayments((paid) => {
    chrome.storage.local.get([PRO_KEY], (result) => {
      const isPro = !!result[PRO_KEY];
      const msg = document.getElementById('pro-status-msg');
      const buyBtn = document.getElementById('buy-pro');
      const unlockBtn = document.getElementById('unlock-pro');
      const loginHint = document.getElementById('pro-login-hint');
      if (msg) msg.textContent = isPro ? 'You have Pro.' : '';
      if (buyBtn) buyBtn.classList.toggle('hidden', isPro);
      if (unlockBtn) unlockBtn.classList.toggle('hidden', isPro);
      if (loginHint) loginHint.classList.toggle('hidden', isPro);
    });
  });
}

function setupUpgrade() {
  document.getElementById('upgrade').addEventListener('click', () => showView('upgrade-view'));
  document.getElementById('upgrade-back').addEventListener('click', () => showView('main-view'));
  const buyBtn = document.getElementById('buy-pro');
  if (buyBtn) {
    buyBtn.addEventListener('click', () => {
      const statusEl = document.getElementById('pro-status-msg');
      if (extpay && typeof extpay.openPaymentPage === 'function') {
        if (statusEl) statusEl.textContent = 'Opening…';
        extpay.openPaymentPage()
          .then(() => { window.close(); })
          .catch(() => {
            if (statusEl) statusEl.textContent = 'Could not open. Check lib/ExtPay.js is the real file from npm.';
          });
      } else {
        if (statusEl) statusEl.textContent = 'ExtPay not loaded. Replace lib/ExtPay.js with the real file from the extpay npm package.';
      }
    });
  }
  const loginBtn = document.getElementById('open-login');
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      if (extpay && typeof extpay.openLoginPage === 'function') {
        extpay.openLoginPage().then(() => window.close()).catch(() => {});
      } else {
        window.close();
      }
    });
  }
  const unlockBtn = document.getElementById('unlock-pro');
  if (unlockBtn) {
    unlockBtn.addEventListener('click', () => {
      chrome.storage.local.set({ [PRO_KEY]: true }, () => {
        updatePlanBadge();
        renderUpgradeView();
      });
    });
  }
}

function getHostname(url) {
  try {
    const u = new URL(url);
    return u.hostname || '';
  } catch {
    return '';
  }
}

function getLastActionKey(hostname) {
  return LAST_ACTION_PREFIX + hostname;
}

function renderLastAction(hostname, data) {
  const el = document.getElementById('last-action');
  if (!el) return;
  if (!hostname) {
    el.textContent = '—';
    return;
  }
  if (!data || !data.ruleSet) {
    el.textContent = 'No action recorded';
    return;
  }
  const r = data.ruleSet;
  const essentialOnly = r.essential && !r.functional && !r.analytics && !r.marketing;
  const acceptAll = r.essential && r.functional && r.analytics && r.marketing;
  const at = data.at ? new Date(data.at).toLocaleString() : '';
  if (essentialOnly) el.textContent = `Essential only${at ? ' · ' + at : ''}`;
  else if (acceptAll) el.textContent = `Accept all${at ? ' · ' + at : ''}`;
  else el.textContent = `Custom · ${at}`;
}

function loadConsentMode() {
  chrome.storage.local.get([GLOBAL_RULES_KEY], (result) => {
    const rules = result[GLOBAL_RULES_KEY];
    const isAcceptAll = rules && rules.functional && rules.analytics && rules.marketing;
    const radio = document.querySelector(`input[name="consent-mode"][value="${isAcceptAll ? 'accept-all' : 'essential'}"]`);
    if (radio) radio.checked = true;
  });
}

function setupConsentMode() {
  const radios = document.querySelectorAll('input[name="consent-mode"]');
  radios.forEach((radio) => {
    radio.addEventListener('change', () => {
      const rules = RULE_SETS[radio.value];
      if (rules) chrome.storage.local.set({ [GLOBAL_RULES_KEY]: rules });
    });
  });
}

function loadCurrentTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs && tabs[0];
    const siteEl = document.getElementById('current-site');
    if (!siteEl) return;
    if (!tab || !tab.url) {
      siteEl.textContent = '—';
      document.getElementById('last-action').textContent = '—';
      return;
    }
    const hostname = getHostname(tab.url);
    siteEl.textContent = hostname || tab.url;

    const key = getLastActionKey(hostname);
    chrome.storage.local.get([key], (result) => {
      renderLastAction(hostname, result[key]);
    });
  });
}

function setupReapply() {
  document.getElementById('reapply').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'cookieControl_reapply' }, (res) => {
      if (res && res.ok) {
        loadCurrentTab();
      }
    });
  });
}

function loadProCategoryToggles() {
  chrome.storage.local.get([GLOBAL_RULES_KEY], (result) => {
    const r = result[GLOBAL_RULES_KEY] || {};
    const essential = document.getElementById('pro-essential');
    const functional = document.getElementById('pro-functional');
    const analytics = document.getElementById('pro-analytics');
    const marketing = document.getElementById('pro-marketing');
    if (essential) essential.checked = true;
    if (functional) functional.checked = !!r.functional;
    if (analytics) analytics.checked = !!r.analytics;
    if (marketing) marketing.checked = !!r.marketing;
  });
}

function saveProCategoryToggles() {
  const functional = document.getElementById('pro-functional');
  const analytics = document.getElementById('pro-analytics');
  const marketing = document.getElementById('pro-marketing');
  const rules = {
    essential: true,
    functional: !!(functional && functional.checked),
    analytics: !!(analytics && analytics.checked),
    marketing: !!(marketing && marketing.checked),
  };
  chrome.storage.local.set({ [GLOBAL_RULES_KEY]: rules });
}

function loadThisSiteRule() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const hostname = tabs && tabs[0] && tabs[0].url ? getHostname(tabs[0].url) : '';
    const siteNameEl = document.getElementById('this-site-name');
    const ruleSelect = document.getElementById('this-site-rule');
    if (!siteNameEl || !ruleSelect) return;
    siteNameEl.textContent = hostname || '—';
    chrome.storage.local.get([DOMAIN_RULES_KEY], (result) => {
      const domainRules = result[DOMAIN_RULES_KEY] || {};
      const override = hostname ? domainRules[hostname] : null;
      if (!override) {
        ruleSelect.value = 'default';
      } else if (override.functional && override.analytics && override.marketing) {
        ruleSelect.value = 'accept-all';
      } else {
        ruleSelect.value = 'essential';
      }
    });
  });
}

function saveThisSiteRule() {
  const ruleSelect = document.getElementById('this-site-rule');
  if (!ruleSelect) return;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const hostname = tabs && tabs[0] && tabs[0].url ? getHostname(tabs[0].url) : '';
    if (!hostname) return;
    chrome.storage.local.get([DOMAIN_RULES_KEY], (result) => {
      const domainRules = result[DOMAIN_RULES_KEY] || {};
      if (ruleSelect.value === 'default') {
        delete domainRules[hostname];
      } else {
        domainRules[hostname] = RULE_SETS[ruleSelect.value] || RULE_SETS.essential;
      }
      chrome.storage.local.set({ [DOMAIN_RULES_KEY]: domainRules });
    });
  });
}

function loadRecentActivity() {
  const container = document.getElementById('recent-activity');
  if (!container) return;
  chrome.storage.local.get([LOG_KEY], (result) => {
    const list = Array.isArray(result[LOG_KEY]) ? result[LOG_KEY] : [];
    const recent = list.slice(-15).reverse();
    container.innerHTML = '';
    if (recent.length === 0) {
      container.innerHTML = '<p class="recent-activity-empty">No activity yet. Visit a site with a cookie banner.</p>';
      return;
    }
    recent.forEach((entry) => {
      const div = document.createElement('div');
      div.className = 'recent-activity-item';
      const label = entry.ruleApplied && entry.ruleApplied.functional && entry.ruleApplied.marketing ? 'Accept all' : 'Essential only';
      const time = entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '';
      div.textContent = `${entry.domain || '?'} — ${label}${time ? ' · ' + time : ''}`;
      container.appendChild(div);
    });
  });
}

function setupProSettings() {
  ['pro-functional', 'pro-analytics', 'pro-marketing'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', saveProCategoryToggles);
  });
  const ruleSelect = document.getElementById('this-site-rule');
  if (ruleSelect) ruleSelect.addEventListener('change', saveThisSiteRule);
}

document.addEventListener('DOMContentLoaded', () => {
  updatePlanBadge();
  syncProFromPayments(() => {
    updatePlanBadge();
  });
  loadConsentMode();
  setupConsentMode();
  loadCurrentTab();
  setupReapply();
  setupUpgrade();
  setupProSettings();
});
