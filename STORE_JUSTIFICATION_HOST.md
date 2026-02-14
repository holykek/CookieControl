# Host permission justification (for Chrome Web Store review)

**Why we need broad host permissions (`http://*/*`, `https://*/*`)**

CookieControl applies the user’s cookie consent choice by finding and clicking the correct button on consent banners (e.g. “Reject non-essential” or “Accept all”). Those banners can appear on **any website**—we cannot know in advance which domains use OneTrust, Cookiebot, Quantcast, or other consent managers. Listing specific sites is not possible without breaking the extension’s purpose.

- **activeTab alone is not sufficient**: activeTab only grants access when the user explicitly invokes the extension (e.g. clicks the icon). Our extension must run when the user **loads a page** so it can detect the banner and apply the user’s saved preference without requiring a click on every site. That requires the content script to run on the pages the user visits.
- We do **not** read, collect, or transmit page content or browsing history. The content script only looks for known consent UI elements and simulates a click on the option that matches the user’s preference.
- This is the same pattern used by other consent/privacy helpers that work across the web.

We request the minimum host access needed for this single purpose and have completed the in-depth review questionnaire accordingly.
