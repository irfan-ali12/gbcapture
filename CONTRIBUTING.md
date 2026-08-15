# Contributing to ScrollCapture

Thanks for improving ScrollCapture.

## Principles

1. Keep the extension single-purpose: full-page screenshot capture.
2. Prefer native Chrome/Web Platform APIs over external dependencies.
3. Do not introduce analytics, telemetry, ads, trackers, or remote code.
4. Avoid broad host permissions. New permissions require a concrete product need and updated Store justification.
5. Always restore page state after a capture attempt, including errors and cancellation.

## Testing changes

Before opening a pull request, test at least:

- a static article page;
- a long ecommerce/product page;
- a page with lazy-loaded images;
- a page with a sticky header;
- a page with a content-bearing sticky section;
- a page with scroll-triggered animation;
- a SPA that changes content as it scrolls;
- capture cancellation midway through a long page.

Run a JavaScript syntax check on `popup.js` and validate `manifest.json` before release.
