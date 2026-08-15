# GBCapture

**Capture the web the way it was designed.**

GBCapture is an open-source Chrome extension for capturing complete webpages as high-quality PNG screenshots.

Unlike basic full-page screenshot tools, GBCapture is designed with modern websites in mind — including sticky sections, lazy-loaded content, fixed elements, scroll-triggered layouts, and dynamically rendered sections.

Built and maintained by **GBCodies**.

---

## Why GBCapture?

Modern websites are rarely simple static documents.

They often include:

* Sticky sections
* Fixed navigation
* Lazy-loaded images
* Scroll-triggered animations
* IntersectionObserver content
* Dynamic page heights
* Floating UI elements
* Parallax sections
* Pinned storytelling sections

Traditional screenshot extensions can duplicate fixed elements, miss unloaded content, or capture sections before they have fully rendered.

GBCapture uses a preparation and capture process designed to reduce these problems and produce cleaner full-page screenshots.

---

## Features

* Full-page webpage screenshots
* Automatic page scrolling
* High-quality PNG output
* Smart handling of modern layouts
* Lazy-content preparation before capture
* Sticky-section support
* Fixed-element deduplication
* Scroll-driven page support
* Automatic restoration of the original scroll position
* Capture progress indicator
* Multiple capture modes
* Adjustable rendering delay
* Local image stitching
* No external screenshot service
* No account required
* No analytics
* No tracking
* No screenshot uploads
* Manifest V3 compatible
* Open source under the MIT License

---

## Capture Modes

GBCapture provides multiple capture strategies for different types of webpages.

### Smart

Recommended for most websites.

Smart mode prepares the webpage before capture by scrolling through it so that lazy-loaded and scroll-triggered content has time to render.

It also attempts to prevent persistent fixed interface elements from appearing repeatedly throughout the final screenshot.

Best for:

* Modern landing pages
* Ecommerce websites
* Agency websites
* Portfolio sites
* Scroll-driven layouts
* Long-form webpages

---

### Fast

Designed for simpler webpages where advanced rendering preparation is not required.

Fast mode minimizes preparation time and uses fewer capture steps.

Best for:

* Blogs
* Documentation
* Articles
* Static pages
* Simple websites

---

### Exact

Preserves the webpage as closely as possible without attempting to remove fixed elements.

Use Exact mode when fixed-position content is an intentional part of the design and should remain visible.

Best for:

* Web applications
* Dashboards
* Pages with intentionally fixed interface elements
* Troubleshooting Smart mode

---

## How GBCapture Works

GBCapture captures webpages entirely inside your browser.

The basic process is:

```text
Current Webpage
      ↓
Page Preparation
      ↓
Automatic Scrolling
      ↓
Chrome Screenshot API
      ↓
Individual Viewport Captures
      ↓
Local Canvas Stitching
      ↓
Complete PNG Screenshot
      ↓
Saved to Your Device
```

Before the final capture, Smart mode performs a rendering pass through the webpage.

This helps trigger:

* Lazy-loaded images
* Web fonts
* IntersectionObserver elements
* Scroll-triggered sections
* Content that appears when entering the viewport

Once preparation is complete, GBCapture captures the page in multiple segments and combines them into a single image.

---

## Privacy

### Private by design

GBCapture processes screenshots entirely on your device.

Your webpage content and screenshots are **never uploaded to GBCodies or any third-party server**.

GBCapture does not:

* Collect browsing history
* Upload screenshots
* Track visited websites
* Use analytics
* Store webpage content remotely
* Require an account
* Sell user data
* Send captured content to external APIs

Screenshot generation and image stitching happen locally inside Chrome.

---

## Permissions

GBCapture intentionally uses a minimal permission set.

### `activeTab`

Provides temporary access to the webpage only when the user explicitly activates GBCapture.

It does not provide permanent access to every website you visit.

### `scripting`

Allows GBCapture to inspect webpage dimensions, control scrolling, and prepare the active webpage for capture.

### `downloads`

Allows the generated PNG screenshot to be saved to your device.

GBCapture does not request broad website access such as:

```text
<all_urls>
```

and does not require access to browsing history, cookies, passwords, or authentication data.

---

## Installation

### Chrome Web Store

Once the public version is available:

1. Open the GBCapture listing in the Chrome Web Store.
2. Click **Add to Chrome**.
3. Pin GBCapture to your Chrome toolbar.
4. Open the webpage you want to capture.
5. Click **GBCapture**.
6. Select your capture mode.
7. Click **Capture Full Page**.

---

## Install Manually

You can also install the development version directly from this repository.

### 1. Clone the repository

```bash
git clone https://github.com/irfan-ali12/gbcapture.git
```

### 2. Open Chrome Extensions

Navigate to:

```text
chrome://extensions/
```

### 3. Enable Developer Mode

Turn on **Developer mode** in the upper-right corner.

### 4. Load the extension

Click:

```text
Load unpacked
```

Select the GBCapture extension directory.

The extension should now appear in Chrome.

---

## Usage

1. Open a regular webpage.
2. Click the GBCapture extension icon.
3. Select a capture mode.
4. Choose the rendering delay if required.
5. Click **Capture Full Page**.
6. Keep the page active while the capture is running.
7. GBCapture will automatically scroll through the webpage.
8. The final PNG will be generated and saved to your device.

For complex websites, use:

```text
Smart + Extra Render Time
```

for the highest capture reliability.

---

## Project Structure

```text
gbcapture/
│
├── src/
│   ├── popup.html
│   ├── popup.css
│   ├── popup.js
│   │
│   └── icons/
│       ├── icon16.png
│       ├── icon32.png
│       ├── icon48.png
│       └── icon128.png
│
├── store-assets/
│   ├── screenshots/
│   └── promotional/
│
├── docs/
│   ├── PRIVACY.md
│   ├── SECURITY.md
│   └── WEB_STORE.md
│
├── manifest.json
├── README.md
├── CONTRIBUTING.md
├── CHANGELOG.md
├── CODE_OF_CONDUCT.md
├── LICENSE
└── .gitignore
```

The exact project structure may evolve as GBCapture grows.

---

## Technical Overview

GBCapture is built using:

* JavaScript
* HTML
* CSS
* Chrome Extensions API
* Manifest V3
* Canvas API
* Chrome `captureVisibleTab()`
* Chrome Scripting API
* Chrome Downloads API

There are currently no external runtime dependencies.

No remote JavaScript is loaded.

---

## Known Limitations

Full-page screenshot capture is affected by how individual websites implement scrolling and rendering.

Some scenarios may require additional handling.

### Chrome protected pages

Chrome does not allow normal extensions to capture or inject scripts into protected pages such as:

```text
chrome://extensions/
chrome://settings/
```

and certain Chrome Web Store pages.

---

### Extremely large webpages

Browsers impose maximum Canvas dimensions.

Exceptionally wide or extremely tall webpages may exceed these limits and cannot always be represented as a single PNG.

---

### Continuous animations

Content that continuously changes while the page is being captured may appear at different animation states between screenshot segments.

Examples include:

* Videos
* Animated backgrounds
* Carousels
* Timers
* Live dashboards

---

### Complex scroll experiences

Some websites use custom scrolling engines or animation frameworks that fundamentally alter normal browser scrolling.

Examples may include:

* GSAP ScrollTrigger
* Lenis
* Locomotive Scroll
* Virtualized lists
* Canvas-based websites
* WebGL experiences

GBCapture aims to improve compatibility with these layouts over time.

---

## Reporting Capture Problems

Different websites can implement scrolling in very different ways.

If GBCapture produces an incorrect screenshot, please create a GitHub Issue with as much information as possible.

Include:

```text
Website URL:
Browser version:
GBCapture version:
Capture mode:
Render delay:
Expected result:
Actual result:
```

Screenshots or short recordings are extremely useful when diagnosing compatibility issues.

Please do not include private URLs, passwords, personal information, or confidential client data in public issues.

---

## Roadmap

Potential future improvements include:

* Improved custom-scroll detection
* Better GSAP ScrollTrigger support
* Smarter fixed-element detection
* Capture selected page regions
* Copy screenshot directly to clipboard
* JPEG/WebP export
* Screenshot quality controls
* Full-page PDF export
* Filename templates
* Keyboard shortcuts
* Capture history stored locally
* Developer capture diagnostics
* Firefox support
* Microsoft Edge optimization

Feature development will be based on real-world usage and community feedback.

---

## Contributing

Contributions are welcome.

You can contribute by:

* Reporting bugs
* Testing unusual websites
* Improving capture compatibility
* Improving documentation
* Suggesting features
* Submitting pull requests
* Improving accessibility
* Reviewing code

Before submitting major changes, consider opening an Issue first so the implementation can be discussed.

See:

```text
CONTRIBUTING.md
```

for contribution guidelines.

---

## Security

If you discover a security vulnerability, please do **not** publish sensitive details in a public GitHub Issue.

Follow the responsible disclosure process described in:

```text
SECURITY.md
```

---

## Open Source

GBCapture is open-source software released under the **MIT License**.

You are free to:

* Use it
* Modify it
* Fork it
* Distribute it
* Contribute improvements
* Use it in commercial projects

subject to the terms of the MIT License.

See:

```text
LICENSE
```

for the complete license text.

---

## Support the Project

If GBCapture is useful to you:

* Star the repository
* Report bugs
* Suggest improvements
* Share it with other developers
* Contribute fixes
* Test it on complex websites

Community feedback helps make GBCapture more reliable across the modern web.

---

## Built by GBCodies

GBCapture is designed and maintained by **GBCodies**.

GBCodies builds websites, ecommerce experiences, web applications, SaaS products, and digital solutions for businesses and agencies.

**Website:** https://gbcodies.com

---

## License

MIT License

Copyright © 2026 GBCodies

---

**GBCapture — Full-page screenshots built for the modern web.**
