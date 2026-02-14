# CookieControl

Chrome-compatible browser extension that enforces your cookie consent preferences by interacting with consent banners (CMPs). It does **not** bypass consent, block cookies at the network level, or break site functionality.

## Load in Chrome (development)

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `CookieControl` folder

## MVP contents

- **Popup**: Free badge, current site, last action, “Re-apply consent” button, Pro CTA (placeholder)
- **CMP detection**: On load, DOM mutations, bounded retry
- **OneTrust**: Full implementation (detect + reject non-essential)
- **Cookiebot & Quantcast**: Stubs (same interface, no action yet)
- **Pro features**: Stubbed and gated by `config/features.js` and `isPro()`

See **ARCHITECTURE.md** for folder structure and feature flags.

## Pro payments (ExtensionPay)

Google **discontinued Chrome Web Store in-app purchases** in 2021. CookieControl uses [ExtensionPay](https://extensionpay.com) (Stripe) for Pro payments.

**Out of the box:** The extension ships with a **stub** so it runs without payment setup. "Buy Pro" and "Log in" use that stub until you enable real payments.

**To enable real payments:**

1. Sign up at [extensionpay.com](https://extensionpay.com) and register your extension. You’ll get an **extension ID** (e.g. `cookiecontrol`).
2. Set that ID in **config/extpay.js**: change `EXTPAY_EXTENSION_ID` to your ID.
3. Replace the stub with the real library:
   ```bash
   npm install extpay
   cp node_modules/extpay/dist/ExtPay.js lib/ExtPay.js
   ```
4. Reload the extension. Configure your plans and Stripe in the ExtensionPay dashboard.

**Popup flow:** **Buy Pro** opens the ExtensionPay payment page; **Log in** lets users who already paid restore Pro on this device. **Unlock Pro (dev)** is for local testing without paying.

## Permissions

- `storage` — local preferences and action log
- `activeTab` — re-apply consent in current tab from popup
- Host access — content scripts on http(s) pages to detect and interact with CMP UI only
