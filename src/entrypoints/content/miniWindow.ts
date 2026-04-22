type PlaybackState = "idle" | "loading" | "playing" | "paused" | "ended" | "error";

interface SavedPosition {
  bottom?: string;
  right?: string;
  transform?: string;
  xOffset?: number;
  yOffset?: number;
}

export interface MiniWindowStatusArgs {
  state: PlaybackState;
  canReplay: boolean;
}

export interface MiniWindowControls {
  container: HTMLDivElement;
  logoContainer: HTMLDivElement;
  replayButton: HTMLButtonElement;
  closeButton: HTMLButtonElement;
  updateStatus(args: MiniWindowStatusArgs): void;
  destroy(): void;
}

const STYLE_ID = "narravo-mini-window-style";
const STORAGE_KEY = "tts-window-position";

const ICONS = {
  play: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 4l14 8-14 8V4z" fill="currentColor"/></svg>`,
  pause: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/></svg>`,
  replay: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5a7 7 0 1 1-6.63 9.12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5 5v4h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  spinner: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="tts-spinner"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" stroke-dasharray="56" stroke-dashoffset="20" fill="none"/></svg>`,
  error: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" fill="none"/><path d="M12 8v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="16" r="1" fill="currentColor"/></svg>`,
  close: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`
};

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    :root {
      --tts-bg: #ffffff;
      --tts-bg-hover: #f3f4f6;
      --tts-text: #111827;
      --tts-text-muted: #6b7280;
      --tts-accent: #6366f1;
      --tts-error: #ef4444;
      --tts-border: #e5e7eb;
      --tts-radius: 20px;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --tts-bg: #1f2937;
        --tts-bg-hover: #374151;
        --tts-text: #f9fafb;
        --tts-text-muted: #9ca3af;
        --tts-accent: #818cf8;
        --tts-error: #f87171;
        --tts-border: #374151;
      }
    }

    #tts-mini-window {
      position: fixed;
      z-index: 2147483647;
      background: var(--tts-bg);
      padding: 4px;
      border-radius: 20px;
      border: 1px solid var(--tts-border);
      display: none;
      align-items: center;
      gap: 2px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      cursor: move;
      user-select: none;
      touch-action: none;
    }

    #tts-mini-window.is-active {
      border-color: var(--tts-accent);
    }

    #tts-mini-window.is-error {
      border-color: var(--tts-error);
    }

    #tts-mini-window.is-dragging {
      cursor: grabbing;
    }

    #tts-mini-window * {
      box-sizing: border-box;
    }

    #tts-mini-window .tts-logo {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: var(--tts-accent);
      font-weight: 700;
      font-size: 14px;
    }

    #tts-mini-window button {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: transparent;
      border-radius: 50%;
      cursor: pointer;
      color: var(--tts-text-muted);
      transition: color 0.15s, background 0.15s;
      outline: none;
      -webkit-tap-highlight-color: transparent;
      padding: 0;
    }

    #tts-mini-window button:hover:not(:disabled) {
      background: var(--tts-bg-hover);
      color: var(--tts-text);
    }

    #tts-mini-window button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    #tts-mini-window button.is-accent {
      color: var(--tts-accent);
    }

    #tts-mini-window button.is-accent:hover:not(:disabled) {
      color: var(--tts-accent);
      background: var(--tts-bg-hover);
    }

    #tts-mini-window button.is-error {
      color: var(--tts-error);
    }

    #tts-mini-window button.is-loading svg {
      animation: tts-spin 1s linear infinite;
    }

    @keyframes tts-spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

function loadPosition(): SavedPosition {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePosition(pos: SavedPosition): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } catch {
    // Ignore
  }
}

interface ButtonConfig {
  icon: string;
  title: string;
  disabled: boolean;
  loading: boolean;
  accent: boolean;
  error: boolean;
}

function getButtonConfig(state: PlaybackState, canReplay: boolean): ButtonConfig {
  switch (state) {
    case "loading":
      return { icon: ICONS.spinner, title: "Loading...", disabled: true, loading: true, accent: true, error: false };
    case "playing":
      return { icon: ICONS.pause, title: "Pause", disabled: false, loading: false, accent: true, error: false };
    case "paused":
      return { icon: ICONS.play, title: "Resume", disabled: false, loading: false, accent: true, error: false };
    case "ended":
      return { icon: canReplay ? ICONS.replay : ICONS.play, title: canReplay ? "Replay" : "Play", disabled: !canReplay, loading: false, accent: canReplay, error: false };
    case "error":
      return { icon: ICONS.error, title: "Error", disabled: !canReplay, loading: false, accent: false, error: true };
    default: // idle
      return { icon: ICONS.play, title: "Play", disabled: !canReplay, loading: false, accent: false, error: false };
  }
}

export function createMiniWindow(): MiniWindowControls {
  injectStyles();

  const saved = loadPosition();
  let offsetX = saved.xOffset ?? 0;
  let offsetY = saved.yOffset ?? 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;

  // Container
  const container = document.createElement("div");
  container.id = "tts-mini-window";
  container.style.bottom = saved.bottom ?? "20px";
  container.style.right = saved.right ?? "20px";
  container.style.transform = `translate(${offsetX}px, ${offsetY}px)`;

  // Logo
  const logoContainer = document.createElement("div");
  logoContainer.className = "tts-logo";
  logoContainer.textContent = "N";
  logoContainer.title = "Narravo";

  // Control button
  const replayButton = document.createElement("button");
  replayButton.type = "button";
  replayButton.className = "tts-control";
  replayButton.innerHTML = ICONS.play;
  replayButton.title = "Play";

  // Close button
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "tts-close";
  closeButton.innerHTML = ICONS.close;
  closeButton.title = "Close";

  container.append(logoContainer, replayButton, closeButton);

  // Dragging
  const applyTransform = () => {
    container.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
  };

  const handlePointerDown = (e: PointerEvent) => {
    if ((e.target as Element)?.closest("button")) return;
    isDragging = true;
    dragStartX = e.clientX - offsetX;
    dragStartY = e.clientY - offsetY;
    container.classList.add("is-dragging");
    container.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!isDragging) return;
    offsetX = e.clientX - dragStartX;
    offsetY = e.clientY - dragStartY;
    requestAnimationFrame(applyTransform);
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (!isDragging) return;
    isDragging = false;
    container.classList.remove("is-dragging");
    try { container.releasePointerCapture(e.pointerId); } catch {}
    savePosition({
      bottom: container.style.bottom,
      right: container.style.right,
      transform: container.style.transform,
      xOffset: offsetX,
      yOffset: offsetY
    });
  };

  container.addEventListener("pointerdown", handlePointerDown);
  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp);
  window.addEventListener("pointercancel", handlePointerUp);

  // Prevent button clicks from triggering drag
  const stopProp = (e: Event) => e.stopPropagation();
  replayButton.addEventListener("pointerdown", stopProp);
  closeButton.addEventListener("pointerdown", stopProp);

  // Update UI
  const updateStatus = ({ state, canReplay }: MiniWindowStatusArgs) => {
    const config = getButtonConfig(state, canReplay);

    replayButton.innerHTML = config.icon;
    replayButton.title = config.title;
    replayButton.disabled = config.disabled;
    replayButton.classList.toggle("is-accent", config.accent && !config.disabled);
    replayButton.classList.toggle("is-error", config.error);
    replayButton.classList.toggle("is-loading", config.loading);

    container.classList.toggle("is-active", state === "loading" || state === "playing");
    container.classList.toggle("is-error", state === "error");
  };

  // Cleanup
  const destroy = () => {
    container.removeEventListener("pointerdown", handlePointerDown);
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
    window.removeEventListener("pointercancel", handlePointerUp);
    replayButton.removeEventListener("pointerdown", stopProp);
    closeButton.removeEventListener("pointerdown", stopProp);
  };

  return { container, logoContainer, replayButton, closeButton, updateStatus, destroy };
}
