# CookieControl — Architecture

## Folder Structure

```
CookieControl/
├── manifest.json                 # MV3 manifest, minimal permissions
├── ARCHITECTURE.md               # This file
│
├── background/
│   └── serviceWorker.js          # Extension lifecycle, messaging
│
├── content/
│   ├── cmpDetector.js            # CMP detection on load + DOM/SPA
│   ├── cmpRegistry.js            # Register handlers, select CMP
│   ├── oneTrustHandler.js        # OneTrust CMP (full impl)
│   ├── cookiebotHandler.js       # Cookiebot CMP (stub → full later)
│   └── quantcastHandler.js       # Quantcast Choice CMP (stub)
│
├── engine/
│   ├── ruleEvaluator.js          # Global + per-site rules → consent ruleSet
│   ├── consentExecutor.js        # detect → decision → execution pipeline
│   └── darkPatternNavigator.js   # PRO: hidden reject, secondary layers
│
├── ui/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
│
├── storage/
│   ├── preferences.js            # Global + domain rules, defaults
│   └── logs.js                   # Action log (domain, CMP, rule, timestamp)
│
├── config/
│   └── features.js               # Free vs Pro feature flags
│
└── utils/
    ├── domHelpers.js             # Safe DOM queries, visibility checks
    └── timing.js                 # Retries, timeouts, no infinite loops
```

## Free vs Pro Feature Flags

Defined in `config/features.js`. All PRO features are gated; stubs exist but do nothing when Pro is false.

| Feature                      | Free | Pro |
|-----------------------------|------|-----|
| Global "reject non-essential"| ✓   | ✓   |
| Auto-detect CMPs             | ✓   | ✓   |
| Auto-enforce on load         | ✓   | ✓   |
| Manual "Re-apply consent"    | ✓   | ✓   |
| Per-site remember last       | ✓ (basic) | ✓ |
| OneTrust / Cookiebot / Quantcast | ✓ (3 CMPs) | ✓ |
| Category-based rules         | —   | ✓   |
| Per-site custom rules        | —   | ✓   |
| Dark-pattern navigation      | —   | ✓   |
| Consent history log (popup)  | —   | ✓   |
| More CMPs (behind flag)      | —   | ✓   |
| Re-consent on policy change  | —   | ✓   |
| Priority rule execution      | —   | ✓   |

## Data Flow

1. **Page load** → Content script runs → `cmpDetector` observes DOM.
2. **CMP detected** → `cmpRegistry` picks handler → `ruleEvaluator` gets rule set (global or per-site).
3. **consentExecutor** runs: handler.detect() → getCategories() → applyConsent(ruleSet).
4. **Result** logged via `storage/logs.js`; popup reads last action + history (Pro).

## Principles (Reminder)

- Only interact with visible, user-facing consent UI.
- No cookie injection/modification; no paywall bypass.
- Fail safely; log every automated action locally.
