# Chrome Web Store Submission Notes

## Suggested listing title

ScrollCapture — Full Page Screenshot

## Short description

Capture complete webpages as clean PNG screenshots, including lazy-loaded, sticky, and scroll-driven content.

## Detailed description

ScrollCapture is a focused full-page screenshot tool built for modern websites.

It automatically scrolls the page, gives lazy-loaded images, fonts, and scroll-driven sections time to render, captures the visible page in multiple passes, and stitches those captures into one high-quality PNG.

Smart Capture is designed to avoid a common problem with screenshot extensions: repeating fixed navigation bars and floating widgets while accidentally hiding real sticky content. Sticky sections remain active, while likely persistent overlays can be suppressed between stitched segments.

Everything is processed locally in Chrome. Screenshots and webpage data are not uploaded to a server.

Features:
- One-click full-page PNG capture
- Smart rendering pass for lazy-loaded content
- Better handling of sticky and scroll-driven sections
- Reduced repetition of fixed headers and floating overlays
- Fast and Exact capture modes
- Adjustable render delay for complex pages
- Automatic restoration of the original scroll position
- No analytics, accounts, cloud processing, or remote code
- Open-source and Manifest V3

## Single purpose statement

ScrollCapture's single purpose is to let users capture the complete contents of the currently selected webpage as an image file.

## Permission justifications

### activeTab
Required to temporarily access only the webpage on which the user explicitly invokes ScrollCapture. It is used to inspect and capture that selected tab. No persistent host access is requested.

### scripting
Required to read the selected page's dimensions, automatically scroll it, allow lazy/scroll-driven content to render, and temporarily adjust capture-related page behavior before restoring the original state.

### downloads
Required to save the locally generated PNG screenshot to the user's device using Chrome's download flow.

## Data-use answers

The extension does not collect or transmit user data. Screenshot pixels and webpage information are processed locally for the user-requested capture and are not sent to the developer or any third party.

## Store assets still required before publication

Prepare these final marketing assets using the production branding:

- 128 × 128 extension icon (included in package; review branding before publishing)
- At least one Chrome Web Store screenshot, ideally 1280 × 800 or 640 × 400
- Optional promotional tile(s) if you want richer Store presentation
- Public support contact
- Public privacy policy URL if requested by the Store form
- Source repository URL (recommended for an open-source project)

## Review checklist

- Replace the placeholder contact section in `PRIVACY.md`.
- Confirm the package contains no test pages, secrets, API keys, or unused permissions.
- Test on static, lazy-loaded, sticky-section, long article, ecommerce, and SPA pages.
- Verify the Store privacy declarations match the actual code.
- Zip the extension files themselves, with `manifest.json` at the ZIP root.
