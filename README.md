# CookieControl

**CookieControl** is a Chrome extension that automatically applies your cookie preference on websites. Choose once—e.g. “reject non-essential cookies” or “accept all”—and the extension will click the right option on cookie banners so you don’t have to do it on every site.

It only interacts with the consent popups you see on each site. It does **not** bypass consent, block cookies at the network level, or change how sites work.

---

## How to get it

Install **CookieControl** from the [Chrome Web Store](https://chrome.google.com/webstore) (search for “CookieControl” or use the link from the project’s release notes).

---

## How to use it

1. **Click the CookieControl icon** in your Chrome toolbar to open the popup.
2. **Choose your preference** under “On all websites”:
   - **Auto-deny non-essential** — only essential/necessary cookies (recommended if you want to limit tracking).
   - **Auto-accept all cookies** — accept all cookies on every site.
3. Visit any website. If it shows a cookie banner that CookieControl supports, the extension will automatically click the option that matches your choice.
4. **Current site** and **Last action** in the popup show the site you’re on and what was applied there. Use **Re-apply consent** to run your choice again on the current page.

CookieControl works on many sites that use common consent banners (e.g. OneTrust, Cookiebot, CookieYes, and others). Support for more banner types is added over time.

---

## Free vs Pro

- **Free:** Set one global preference (reject non-essential or accept all), see last action per site, and re-apply consent from the popup.
- **Pro:** Extra features such as per-site rules and finer control over cookie categories. Pro is optional; you can upgrade from the popup. Payments are handled via [ExtensionPay](https://extensionpay.com) (Stripe). The Chrome Web Store no longer supports in-app purchases, so Pro uses this method instead.

---

## Privacy and data

- Your preference and per-site “last action” are stored **only on your device** (Chrome’s local storage). Nothing is sent to our servers.
- The extension needs permission to run on web pages so it can find and click cookie banners. It does not collect your browsing history or the content of pages you visit.

For full details, see the [Privacy Policy](https://holykek.github.io/CookieControl/privacy.html) (also linked from the Chrome Web Store listing).

---

## Permissions (why we need them)

- **Storage** — to save your preference and last action per site, only on your device.
- **Active tab** — used when you click “Re-apply consent” so the extension can run on the current tab.
- **Access to sites you visit** — so the extension can detect cookie banners and click the right button. It only looks for consent UI; it does not read or send page content.

---

## For developers

If you want to run CookieControl from source (e.g. to contribute or modify):

1. Clone or download this repository.
2. Open `chrome://extensions/`, turn on **Developer mode**, and click **Load unpacked**.
3. Select the folder that contains `manifest.json`.

See **ARCHITECTURE.md** for project structure, CMP handlers, and feature flags. Pro payments use ExtensionPay; setup for real payments is documented in the repo and on [extensionpay.com](https://extensionpay.com).
