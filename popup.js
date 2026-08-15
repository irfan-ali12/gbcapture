
const captureBtn = document.getElementById("captureBtn");
const buttonText = document.getElementById("buttonText");
const progressWrap = document.getElementById("progressWrap");
const progressBar = document.getElementById("progressBar");
const statusEl = document.getElementById("status");
const percentEl = document.getElementById("percent");
const messageEl = document.getElementById("message");
const stickyToggle = document.getElementById("stickyToggle");

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function setProgress(current, total, text) {
  const pct = total ? Math.round((current / total) * 100) : 0;
  progressBar.style.width = pct + "%";
  percentEl.textContent = pct + "%";
  statusEl.textContent = text;
}

function showMessage(text, type) {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
}

async function execute(tabId, func, args = []) {
  const result = await chrome.scripting.executeScript({
    target: { tabId },
    func,
    args
  });
  return result[0]?.result;
}

async function getPageInfo(tabId) {
  return execute(tabId, () => {
    const doc = document.documentElement;
    const body = document.body;
    const width = Math.max(
      doc.scrollWidth, doc.offsetWidth, doc.clientWidth,
      body ? body.scrollWidth : 0,
      body ? body.offsetWidth : 0
    );
    const height = Math.max(
      doc.scrollHeight, doc.offsetHeight, doc.clientHeight,
      body ? body.scrollHeight : 0,
      body ? body.offsetHeight : 0
    );
    return {
      pageWidth: width,
      pageHeight: height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      originalX: window.scrollX,
      originalY: window.scrollY,
      title: document.title || "page",
      dpr: window.devicePixelRatio || 1
    };
  });
}

async function installCaptureStyles(tabId) {
  return execute(tabId, () => {
    const key = "data-fullpage-shot-state";
    const changed = [];
    document.querySelectorAll("*").forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.position === "fixed" || cs.position === "sticky") {
        el.setAttribute(key, JSON.stringify({
          visibility: el.style.visibility || "",
          transition: el.style.transition || ""
        }));
        el.style.transition = "none";
        changed.push(true);
      }
    });
    document.documentElement.style.scrollBehavior = "auto";
    return changed.length;
  });
}

async function hideSticky(tabId, hide) {
  return execute(tabId, (shouldHide) => {
    document.querySelectorAll("[data-fullpage-shot-state]").forEach((el) => {
      el.style.visibility = shouldHide ? "hidden" : "";
    });
  }, [hide]);
}

async function restorePage(tabId, x, y) {
  try {
    await execute(tabId, (sx, sy) => {
      const key = "data-fullpage-shot-state";
      document.querySelectorAll(`[${key}]`).forEach((el) => {
        try {
          const state = JSON.parse(el.getAttribute(key) || "{}");
          el.style.visibility = state.visibility || "";
          el.style.transition = state.transition || "";
        } catch (_) {
          el.style.visibility = "";
          el.style.transition = "";
        }
        el.removeAttribute(key);
      });
      document.documentElement.style.scrollBehavior = "";
      window.scrollTo(sx, sy);
    }, [x, y]);
  } catch (_) {}
}

async function scrollToPosition(tabId, y) {
  return execute(tabId, (top) => {
    window.scrollTo(0, top);
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve({ x: window.scrollX, y: window.scrollY });
        });
      });
    });
  }, [y]);
}

function imageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function safeFilename(title) {
  return (title || "page")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90) || "page";
}

captureBtn.addEventListener("click", async () => {
  captureBtn.disabled = true;
  buttonText.textContent = "Capturing…";
  progressWrap.classList.remove("hidden");
  messageEl.className = "message hidden";
  setProgress(0, 1, "Inspecting page…");

  let tab;
  let info;

  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id || !tab.url || /^(chrome|edge|about|view-source):/i.test(tab.url)) {
      throw new Error("This page cannot be captured. Open a normal website tab and try again.");
    }

    info = await getPageInfo(tab.id);

    if (!info || !info.viewportHeight || !info.pageHeight) {
      throw new Error("Could not read the dimensions of this page.");
    }

    // Chrome canvases have practical dimension limits. Refuse clearly rather
    // than producing a corrupted/blank image on extraordinarily tall pages.
    const estimatedScale = info.dpr || 1;
    if (info.pageHeight * estimatedScale > 32000 || info.pageWidth * estimatedScale > 32000) {
      throw new Error(
        `This page is too large for a single browser canvas (${Math.round(info.pageWidth)} × ${Math.round(info.pageHeight)} CSS px).`
      );
    }

    const maxScroll = Math.max(0, info.pageHeight - info.viewportHeight);
    const positions = [];
    for (let y = 0; y < maxScroll; y += info.viewportHeight) positions.push(y);
    if (!positions.length || positions[positions.length - 1] !== maxScroll) positions.push(maxScroll);

    if (stickyToggle.checked) {
      await installCaptureStyles(tab.id);
    }

    const shots = [];

    for (let i = 0; i < positions.length; i++) {
      const requestedY = positions[i];

      // Show fixed/sticky content in the first viewport, hide it afterward
      // so headers, chat bubbles, cookie bars, etc. do not repeat.
      if (stickyToggle.checked) {
        await hideSticky(tab.id, i > 0);
      }

      const actual = await scrollToPosition(tab.id, requestedY);
      // Allow images/lazy content and compositing to settle.
      await sleep(650);

      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
      shots.push({ dataUrl, y: actual?.y ?? requestedY });

      setProgress(i + 1, positions.length, `Captured ${i + 1} of ${positions.length}`);
    }

    await restorePage(tab.id, info.originalX, info.originalY);

    setProgress(positions.length, positions.length, "Stitching image…");

    const firstImg = await imageFromDataUrl(shots[0].dataUrl);
    const scaleX = firstImg.width / info.viewportWidth;
    const scaleY = firstImg.height / info.viewportHeight;

    const outWidth = Math.max(1, Math.round(info.pageWidth * scaleX));
    const outHeight = Math.max(1, Math.round(info.pageHeight * scaleY));

    const canvas = document.createElement("canvas");
    canvas.width = outWidth;
    canvas.height = outHeight;
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, outWidth, outHeight);

    for (let i = 0; i < shots.length; i++) {
      const img = i === 0 ? firstImg : await imageFromDataUrl(shots[i].dataUrl);
      const destY = Math.round(shots[i].y * scaleY);
      const available = outHeight - destY;
      if (available <= 0) continue;

      const drawHeight = Math.min(img.height, available);
      ctx.drawImage(
        img,
        0, 0, img.width, drawHeight,
        0, destY, img.width, drawHeight
      );
    }

    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Could not encode the final screenshot.");

    const blobUrl = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${safeFilename(info.title)} - full-page - ${timestamp}.png`;

    await chrome.downloads.download({
      url: blobUrl,
      filename,
      saveAs: true
    });

    setProgress(1, 1, "Done");
    showMessage("Full-page screenshot created successfully.", "success");

    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  } catch (err) {
    if (tab?.id && info) {
      await restorePage(tab.id, info.originalX, info.originalY);
    }
    console.error(err);
    showMessage(err?.message || "Capture failed.", "error");
    statusEl.textContent = "Capture failed";
  } finally {
    captureBtn.disabled = false;
    buttonText.textContent = "Capture Full Page";
  }
});
