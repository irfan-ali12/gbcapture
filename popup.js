const $ = (id) => document.getElementById(id);

const captureBtn = $("captureBtn");
const cancelBtn = $("cancelBtn");
const buttonText = $("buttonText");
const progressWrap = $("progressWrap");
const progressBar = $("progressBar");
const progressTrack = progressWrap.querySelector(".progress-track");
const statusEl = $("status");
const percentEl = $("percent");
const detailEl = $("detail");
const messageEl = $("message");
const modeEl = $("mode");
const delayEl = $("delay");
const modeHelp = $("modeHelp");

const MODE_HELP = {
  smart: "Preloads the page and handles persistent overlays while preserving sticky content.",
  fast: "Best for static pages. Uses fewer captures and a shorter preparation pass.",
  exact: "Keeps fixed and sticky elements exactly as the browser renders them while scrolling."
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let cancelled = false;

modeEl.addEventListener("change", () => {
  modeHelp.textContent = MODE_HELP[modeEl.value] || MODE_HELP.smart;
});

cancelBtn.addEventListener("click", () => {
  cancelled = true;
  cancelBtn.disabled = true;
  cancelBtn.textContent = "Cancelling…";
});

function assertNotCancelled() {
  if (cancelled) throw new Error("Capture cancelled.");
}

function setProgress(percent, status, detail = "") {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  progressBar.style.width = `${value}%`;
  percentEl.textContent = `${value}%`;
  progressTrack.setAttribute("aria-valuenow", String(value));
  statusEl.textContent = status;
  if (detail) detailEl.textContent = detail;
}

function showMessage(text, type) {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
}

function clearMessage() {
  messageEl.className = "message hidden";
  messageEl.textContent = "";
}

async function execute(tabId, func, args = []) {
  const result = await chrome.scripting.executeScript({
    target: { tabId },
    func,
    args
  });
  return result[0]?.result;
}

async function readPageInfo(tabId) {
  return execute(tabId, () => {
    const doc = document.documentElement;
    const body = document.body;
    const values = [
      doc.scrollWidth, doc.offsetWidth, doc.clientWidth,
      doc.scrollHeight, doc.offsetHeight, doc.clientHeight,
      body?.scrollWidth || 0, body?.offsetWidth || 0,
      body?.scrollHeight || 0, body?.offsetHeight || 0
    ];

    return {
      pageWidth: Math.max(values[0], values[1], values[2], values[6], values[7]),
      pageHeight: Math.max(values[3], values[4], values[5], values[8], values[9]),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      originalX: window.scrollX,
      originalY: window.scrollY,
      title: document.title || "page",
      dpr: window.devicePixelRatio || 1,
      url: location.href
    };
  });
}

async function preparePage(tabId, smartMode) {
  return execute(tabId, (useSmartMode) => {
    const ROOT_KEY = "data-scrollcapture-root-state";
    const FIXED_KEY = "data-scrollcapture-fixed-state";
    const root = document.documentElement;
    const body = document.body;

    const preserveStyle = (el, property) => ({
      value: el.style.getPropertyValue(property),
      priority: el.style.getPropertyPriority(property)
    });

    if (!root.hasAttribute(ROOT_KEY)) {
      root.setAttribute(ROOT_KEY, JSON.stringify({
        htmlScrollBehavior: preserveStyle(root, "scroll-behavior"),
        htmlScrollSnap: preserveStyle(root, "scroll-snap-type"),
        bodyScrollBehavior: body ? preserveStyle(body, "scroll-behavior") : null,
        bodyScrollSnap: body ? preserveStyle(body, "scroll-snap-type") : null
      }));
    }

    root.style.setProperty("scroll-behavior", "auto", "important");
    root.style.setProperty("scroll-snap-type", "none", "important");
    if (body) {
      body.style.setProperty("scroll-behavior", "auto", "important");
      body.style.setProperty("scroll-snap-type", "none", "important");
    }

    let marked = 0;
    if (useSmartMode) {
      document.querySelectorAll("*").forEach((el) => {
        if (el.hasAttribute(FIXED_KEY)) return;
        const cs = getComputedStyle(el);

        // Important: sticky content is deliberately NOT hidden. Modern sites
        // often use sticky sections as primary content / scroll storytelling.
        if (cs.position !== "fixed") return;

        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) return;

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const areaRatio = (r.width * r.height) / Math.max(1, vw * vh);
        const nearTop = r.top <= 6 && r.bottom > 0;
        const nearBottom = r.bottom >= vh - 6 && r.top < vh;
        const wideBar = r.width >= vw * 0.55 && r.height <= vh * 0.38;
        const smallFloating = areaRatio <= 0.18 && (
          r.left <= 24 || r.right >= vw - 24 || r.top <= 24 || r.bottom >= vh - 24
        );

        // Full-screen fixed layers (modals, lightboxes, app shells) are not
        // automatically suppressed because they may be the content the user wants.
        const isLikelyPersistentOverlay = (wideBar && (nearTop || nearBottom)) || smallFloating;
        if (!isLikelyPersistentOverlay) return;

        el.setAttribute(FIXED_KEY, JSON.stringify({
          visibility: preserveStyle(el, "visibility")
        }));
        marked++;
      });
    }

    return { marked };
  }, [smartMode]);
}

async function setPersistentOverlaysHidden(tabId, hidden) {
  return execute(tabId, (shouldHide) => {
    document.querySelectorAll("[data-scrollcapture-fixed-state]").forEach((el) => {
      if (shouldHide) {
        el.style.setProperty("visibility", "hidden", "important");
      } else {
        el.style.removeProperty("visibility");
      }
    });
  }, [hidden]);
}

async function restorePage(tabId, x, y) {
  try {
    await execute(tabId, (sx, sy) => {
      const ROOT_KEY = "data-scrollcapture-root-state";
      const FIXED_KEY = "data-scrollcapture-fixed-state";
      const root = document.documentElement;
      const body = document.body;

      const restoreProp = (el, property, state) => {
        if (!el || !state) return;
        if (state.value) el.style.setProperty(property, state.value, state.priority || "");
        else el.style.removeProperty(property);
      };

      document.querySelectorAll(`[${FIXED_KEY}]`).forEach((el) => {
        try {
          const state = JSON.parse(el.getAttribute(FIXED_KEY) || "{}");
          restoreProp(el, "visibility", state.visibility);
        } catch (_) {
          el.style.removeProperty("visibility");
        }
        el.removeAttribute(FIXED_KEY);
      });

      try {
        const rootState = JSON.parse(root.getAttribute(ROOT_KEY) || "{}");
        restoreProp(root, "scroll-behavior", rootState.htmlScrollBehavior);
        restoreProp(root, "scroll-snap-type", rootState.htmlScrollSnap);
        restoreProp(body, "scroll-behavior", rootState.bodyScrollBehavior);
        restoreProp(body, "scroll-snap-type", rootState.bodyScrollSnap);
      } catch (_) {
        root.style.removeProperty("scroll-behavior");
        root.style.removeProperty("scroll-snap-type");
      }
      root.removeAttribute(ROOT_KEY);
      window.scrollTo(sx, sy);
    }, [x, y]);
  } catch (_) {
    // Best-effort cleanup if the tab navigated or was closed during capture.
  }
}

async function scrollToPosition(tabId, y) {
  return execute(tabId, (top) => {
    window.scrollTo(0, top);
    return new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        resolve({ x: window.scrollX, y: window.scrollY });
      }));
    });
  }, [y]);
}

async function waitForPageAssets(tabId, timeoutMs) {
  return execute(tabId, async (timeout) => {
    const timeoutPromise = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const fontsPromise = document.fonts?.ready?.catch?.(() => {}) || Promise.resolve();
    const imagePromises = [...document.images]
      .filter((img) => !img.complete)
      .slice(0, 300)
      .map((img) => new Promise((resolve) => {
        const done = () => resolve();
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      }));

    await Promise.race([
      Promise.allSettled([fontsPromise, ...imagePromises]),
      timeoutPromise(timeout)
    ]);

    return {
      images: document.images.length,
      incomplete: [...document.images].filter((img) => !img.complete).length
    };
  }, [timeoutMs]);
}

async function preRenderPass(tabId, initialInfo, mode, delay) {
  if (mode === "fast") return initialInfo;

  let info = initialInfo;
  let previousHeight = 0;

  // Up to three passes handles pages that append lazy content while scrolling
  // without turning ordinary infinite-scroll feeds into an endless capture.
  for (let pass = 0; pass < 3; pass++) {
    assertNotCancelled();
    const maxScroll = Math.max(0, info.pageHeight - info.viewportHeight);
    const step = Math.max(360, Math.round(info.viewportHeight * 0.78));

    for (let y = 0; y < maxScroll; y += step) {
      assertNotCancelled();
      await scrollToPosition(tabId, y);
      await sleep(Math.min(180, Math.max(70, delay * 0.18)));
    }

    await scrollToPosition(tabId, maxScroll);
    await sleep(Math.min(850, Math.max(300, delay * 0.65)));
    await waitForPageAssets(tabId, Math.max(1800, delay * 3));

    const refreshed = await readPageInfo(tabId);
    if (!refreshed) break;

    previousHeight = info.pageHeight;
    info = { ...refreshed, originalX: initialInfo.originalX, originalY: initialInfo.originalY };

    const growth = info.pageHeight - previousHeight;
    if (growth < Math.max(120, info.viewportHeight * 0.18)) break;
  }

  await scrollToPosition(tabId, 0);
  await sleep(Math.min(700, Math.max(250, delay * 0.55)));
  return info;
}

function makeCapturePositions(info, mode) {
  const maxScroll = Math.max(0, info.pageHeight - info.viewportHeight);
  if (maxScroll === 0) return [0];

  // Smart/Exact use overlapping viewports but stitch only the newly revealed
  // strip. This gives scroll-driven sections more intermediate render states.
  const ratio = mode === "fast" ? 0.98 : 0.72;
  const step = Math.max(280, Math.floor(info.viewportHeight * ratio));
  const positions = [];

  for (let y = 0; y < maxScroll; y += step) positions.push(y);
  if (positions[positions.length - 1] !== maxScroll) positions.push(maxScroll);
  return positions;
}

function imageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("A captured image could not be decoded."));
    img.src = dataUrl;
  });
}

function safeFilename(title) {
  return (title || "page")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100) || "page";
}

async function stitchShots(shots, info) {
  const first = await imageFromDataUrl(shots[0].dataUrl);
  const scaleX = first.width / info.viewportWidth;
  const scaleY = first.height / info.viewportHeight;
  const outWidth = Math.max(1, Math.round(info.pageWidth * scaleX));
  const outHeight = Math.max(1, Math.round(info.pageHeight * scaleY));

  if (outWidth > 32760 || outHeight > 32760 || outWidth * outHeight > 260_000_000) {
    throw new Error(
      `This page is too large for one PNG (${Math.round(info.pageWidth)} × ${Math.round(info.pageHeight)} CSS px).`
    );
  }

  const canvas = document.createElement("canvas");
  canvas.width = outWidth;
  canvas.height = outHeight;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Could not initialize the image canvas.");

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, outWidth, outHeight);

  for (let i = 0; i < shots.length; i++) {
    assertNotCancelled();
    const img = i === 0 ? first : await imageFromDataUrl(shots[i].dataUrl);
    const currentY = shots[i].y;
    const isLast = i === shots.length - 1;
    const nextY = isLast ? info.pageHeight : shots[i + 1].y;
    const cssSliceHeight = isLast
      ? Math.min(info.viewportHeight, info.pageHeight - currentY)
      : Math.max(1, Math.min(info.viewportHeight, nextY - currentY));

    const srcHeight = Math.min(img.height, Math.round(cssSliceHeight * scaleY));
    const destY = Math.round(currentY * scaleY);
    const available = outHeight - destY;
    const drawHeight = Math.min(srcHeight, available);
    if (drawHeight <= 0) continue;

    // Capture is viewport width. If the document is horizontally larger than
    // the viewport, we intentionally capture the currently visible page width.
    const drawWidth = Math.min(img.width, outWidth);
    ctx.drawImage(img, 0, 0, drawWidth, drawHeight, 0, destY, drawWidth, drawHeight);
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Could not encode the final PNG.");
  return blob;
}

captureBtn.addEventListener("click", async () => {
  cancelled = false;
  captureBtn.disabled = true;
  modeEl.disabled = true;
  delayEl.disabled = true;
  buttonText.textContent = "Capturing…";
  cancelBtn.classList.remove("hidden");
  cancelBtn.disabled = false;
  cancelBtn.textContent = "Cancel capture";
  progressWrap.classList.remove("hidden");
  clearMessage();
  setProgress(2, "Inspecting page…", "Checking dimensions and preparing a safe capture session.");

  let tab;
  let initialInfo;
  let pagePrepared = false;

  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url) throw new Error("No active webpage was found.");

    if (/^(chrome|edge|about|view-source|devtools):/i.test(tab.url) || tab.url.startsWith("https://chromewebstore.google.com/")) {
      throw new Error("Chrome does not allow extensions to capture this protected page. Open a regular website and try again.");
    }

    const mode = modeEl.value;
    const delay = Number(delayEl.value) || 700;
    initialInfo = await readPageInfo(tab.id);
    if (!initialInfo?.viewportHeight || !initialInfo?.pageHeight) {
      throw new Error("Could not read this page's dimensions.");
    }

    await preparePage(tab.id, mode === "smart");
    pagePrepared = true;

    setProgress(8, "Rendering page…", "Triggering lazy-loaded media, fonts, and scroll-based sections before capture.");
    const info = await preRenderPass(tab.id, initialInfo, mode, delay);
    assertNotCancelled();

    if (info.pageWidth * info.dpr > 32760 || info.pageHeight * info.dpr > 32760) {
      throw new Error(
        `The rendered page is too large for one browser canvas (${Math.round(info.pageWidth)} × ${Math.round(info.pageHeight)} CSS px).`
      );
    }

    const positions = makeCapturePositions(info, mode);
    const shots = [];

    setProgress(15, "Capturing…", `${positions.length} viewport${positions.length === 1 ? "" : "s"} will be captured and stitched locally.`);

    for (let i = 0; i < positions.length; i++) {
      assertNotCancelled();

      // In Smart mode, keep fixed UI on the opening frame, suppress it in the
      // middle strips, and let the last frame naturally include bottom UI once.
      if (mode === "smart") {
        await setPersistentOverlaysHidden(tab.id, i > 0 && i < positions.length - 1);
      }

      const actual = await scrollToPosition(tab.id, positions[i]);
      await sleep(delay);
      assertNotCancelled();

      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
      shots.push({ dataUrl, y: actual?.y ?? positions[i] });

      const p = 15 + ((i + 1) / positions.length) * 68;
      setProgress(p, `Capturing ${i + 1} of ${positions.length}…`, "Scroll-driven and sticky content is kept active during the capture.");
    }

    if (mode === "smart") await setPersistentOverlaysHidden(tab.id, false);
    await restorePage(tab.id, initialInfo.originalX, initialInfo.originalY);
    pagePrepared = false;

    assertNotCancelled();
    setProgress(88, "Building screenshot…", "Stitching the captured strips into a single PNG on your device.");
    const blob = await stitchShots(shots, info);
    assertNotCancelled();

    const blobUrl = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${safeFilename(info.title)} - full-page - ${timestamp}.png`;

    setProgress(96, "Saving…", "Opening Chrome's save dialog for the completed image.");
    await chrome.downloads.download({ url: blobUrl, filename, saveAs: true });
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);

    setProgress(100, "Capture complete", "Your original scroll position has been restored.");
    showMessage("Full-page screenshot created successfully. Nothing was uploaded or sent off-device.", "success");
  } catch (err) {
    if (tab?.id && initialInfo && pagePrepared) {
      await restorePage(tab.id, initialInfo.originalX, initialInfo.originalY);
    }

    const text = err?.message || "The capture could not be completed.";
    if (text === "Capture cancelled.") {
      setProgress(0, "Capture cancelled", "The page was restored to its original position.");
      showMessage("Capture cancelled. No image was saved.", "error");
    } else {
      console.error("ScrollCapture error:", err);
      setProgress(0, "Capture failed", "The page was restored when possible. Try Smart mode with Extra time for complex pages.");
      showMessage(text, "error");
    }
  } finally {
    captureBtn.disabled = false;
    modeEl.disabled = false;
    delayEl.disabled = false;
    buttonText.textContent = "Capture full page";
    cancelBtn.classList.add("hidden");
    cancelBtn.disabled = false;
    cancelBtn.textContent = "Cancel capture";
  }
});
