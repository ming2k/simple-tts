type PlaybackState = "idle" | "loading" | "playing" | "paused" | "ended" | "error";

interface SavedPosition {
  bottom?: string;
  right?: string;
  transform?: string;
  xOffset?: number;
  yOffset?: number;
}

export interface MiniWindowStatusArgs {
  state?: PlaybackState;
  hasAudio: boolean;
  hasCachedAudio: boolean;
  hasRequest: boolean;
}

export interface MiniWindowControls {
  container: HTMLDivElement;
  logoContainer: HTMLDivElement;
  replayButton: HTMLButtonElement;
  closeButton: HTMLButtonElement;
  updateStatus(args: MiniWindowStatusArgs): void;
  destroy(): void;
}

const STYLE_ID = "simple-tts-mini-window-style";
const STORAGE_KEY = "tts-window-position";
const CONTAINER_STATES: PlaybackState[] = ["idle", "loading", "playing", "paused", "ended", "error"];

const ICONS = {
  play: `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 3l14 9-14 9V3z" fill="currentColor"/>
    </svg>
  `,
  pause: `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/>
      <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>
    </svg>
  `,
  replay: `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,
  spinner: `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="tts-spinner" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="56" stroke-dashoffset="20" fill="none"/>
    </svg>
  `,
  error: `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" fill="none"/>
      <path d="M12 7v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <circle cx="12" cy="16.5" r="1.2" fill="currentColor"/>
    </svg>
  `
} as const;

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    :root {
      --tts-bg-primary: #ffffff;
      --tts-bg-secondary: #f8fafc;
      --tts-bg-hover: #e2e8f0;
      --tts-text-primary: #1e293b;
      --tts-text-secondary: #64748b;
      --tts-text-accent: #3b82f6;
      --tts-text-danger: #dc2626;
      --tts-border: rgba(0,0,0,0.08);
      --tts-shadow: rgba(0,0,0,0.12);
      --tts-shadow-active: rgba(0,0,0,0.2);
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --tts-bg-primary: #0f172a;
        --tts-bg-secondary: #1e293b;
        --tts-bg-hover: #334155;
        --tts-text-primary: #f1f5f9;
        --tts-text-secondary: #94a3b8;
        --tts-text-accent: #60a5fa;
        --tts-text-danger: #f87171;
        --tts-border: rgba(255,255,255,0.08);
        --tts-shadow: rgba(0,0,0,0.4);
        --tts-shadow-active: rgba(0,0,0,0.6);
      }
    }

    #tts-mini-window, #tts-mini-window * {
      box-sizing: border-box;
    }

    #tts-mini-window {
      position: fixed;
      background: var(--tts-bg-primary);
      padding: 3px 5px;
      border-radius: 15px;
      box-shadow: 0 4px 16px var(--tts-shadow);
      display: none;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, system-ui, sans-serif;
      cursor: move;
      user-select: none;
      -webkit-user-select: none;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      min-height: 30px;
      min-width: 62px;
      max-width: 110px;
      border: 1px solid transparent;
      transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
      contain: layout style paint;
      isolation: isolate;
      touch-action: none;
    }

    #tts-mini-window.is-loading,
    #tts-mini-window.is-playing {
      background: var(--tts-bg-secondary);
      box-shadow: 0 6px 20px var(--tts-shadow-active);
    }

    #tts-mini-window.is-error {
      border-color: var(--tts-text-danger);
      box-shadow: 0 6px 20px rgba(220,38,38,0.35);
    }

    @media (max-width: 768px) {
      #tts-mini-window {
        padding: 2px 4px;
        min-width: 45px;
        max-width: 75px;
        gap: 4px;
        border-radius: 10px;
      }
    }

    @media (max-width: 480px) {
      #tts-mini-window {
        padding: 1px 3px;
        min-width: 40px;
        max-width: 70px;
        gap: 2px;
        border-radius: 8px;
        min-height: 22px;
      }
    }

    #tts-mini-window button {
      width: 25px;
      height: 25px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: transparent;
      border-radius: 50%;
      cursor: pointer;
      transition: transform 0.15s ease, background 0.15s ease, opacity 0.15s ease, color 0.15s ease;
      color: var(--tts-text-primary);
      outline: none;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }

    #tts-mini-window .tts-logo {
      width: 25px;
      height: 25px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      user-select: none;
      -webkit-user-select: none;
    }

    #tts-mini-window button svg {
      width: 20px;
      height: 20px;
      display: block;
    }

    #tts-mini-window button:hover:not(:disabled),
    #tts-mini-window button:focus-visible:not(:disabled) {
      background: var(--tts-bg-hover);
      transform: scale(1.05);
    }

    #tts-mini-window button:active:not(:disabled) {
      transform: scale(0.95);
    }

    #tts-mini-window button.is-accent {
      color: var(--tts-text-accent);
    }

    #tts-mini-window button.is-error {
      color: var(--tts-text-danger);
    }

    #tts-mini-window button.is-disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    #tts-mini-window button.tts-loading {
      cursor: progress;
    }

    #tts-mini-window button.tts-loading svg {
      animation: tts-spin 1s linear infinite;
    }

    @keyframes tts-spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }

    #tts-mini-window button.tts-close {
      color: var(--tts-text-secondary);
    }

    #tts-mini-window button.tts-close:hover:not(:disabled),
    #tts-mini-window button.tts-close:focus-visible:not(:disabled) {
      color: var(--tts-text-primary);
    }

    #tts-mini-window.is-dragging {
      cursor: grabbing;
    }
  `;

  document.head.appendChild(style);
}

function loadSavedPosition(): SavedPosition {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as SavedPosition;
  } catch (error) {
    console.warn("[Simple TTS] Failed to parse saved mini-window position:", error);
    return {};
  }
}

function persistPosition(position: SavedPosition): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
  } catch (error) {
    console.warn("[Simple TTS] Failed to persist mini-window position:", error);
  }
}

interface UIConfig {
  icon: string;
  title: string;
  disabled: boolean;
  busy: boolean;
  accent: boolean;
  isError: boolean;
  containerState: PlaybackState;
}

function resolveUIConfig(state: PlaybackState, context: MiniWindowStatusArgs): UIConfig {
  const { hasAudio, hasCachedAudio, hasRequest } = context;
  const config: UIConfig = {
    icon: ICONS.play,
    title: "Play",
    disabled: false,
    busy: false,
    accent: false,
    isError: false,
    containerState: state
  };

  switch (state) {
    case "loading": {
      config.icon = ICONS.spinner;
      config.title = "Loading audio...";
      config.disabled = true;
      config.busy = true;
      config.accent = true;
      break;
    }
    case "playing": {
      config.icon = ICONS.pause;
      config.title = "Pause";
      config.accent = true;
      break;
    }
    case "paused": {
      config.icon = ICONS.play;
      config.title = hasAudio ? "Resume" : "Play";
      config.accent = hasAudio;
      break;
    }
    case "ended": {
      const canReplay = hasCachedAudio;
      config.icon = canReplay ? ICONS.replay : ICONS.play;
      config.title = canReplay ? "Replay" : "Play";
      config.accent = canReplay;
      break;
    }
    case "error": {
      config.icon = ICONS.error;
      config.title = "Playback error";
      config.isError = true;
      config.accent = false;
      break;
    }
    default: {
      const canReplay = hasCachedAudio;
      config.icon = canReplay ? ICONS.replay : ICONS.play;
      config.title = "Play";
      config.accent = canReplay;
    }
  }

  const noSourceAvailable = !hasAudio && !hasCachedAudio && !hasRequest;
  if (noSourceAvailable && (state === "idle" || state === "error" || state === "paused" || state === "ended")) {
    config.disabled = true;
    config.accent = false;
  }

  return config;
}

function applyContainerState(container: HTMLElement, state: PlaybackState): void {
  CONTAINER_STATES.forEach(storedState => {
    container.classList.toggle(`is-${storedState}`, storedState === state);
  });
}

function applyButtonState(button: HTMLButtonElement, config: UIConfig): void {
  button.disabled = config.disabled;
  button.classList.toggle("is-disabled", config.disabled);
  button.classList.toggle("tts-loading", config.busy);
  button.classList.toggle("is-accent", config.accent && !config.disabled && !config.isError);
  button.classList.toggle("is-error", config.isError);
}

function stopPropagation(event: Event): void {
  event.stopPropagation();
}

export function createMiniWindow(): MiniWindowControls {
  injectStyles();
  const saved = loadSavedPosition();

  let offsetX = saved.xOffset ?? 0;
  let offsetY = saved.yOffset ?? 0;
  let dragStartX = 0;
  let dragStartY = 0;
  let isDragging = false;
  let saveHandle: number | undefined;

  const container = document.createElement("div");
  container.id = "tts-mini-window";
  container.style.bottom = saved.bottom ?? "20px";
  container.style.right = saved.right ?? "20px";
  container.style.display = "none";
  container.style.zIndex = "2147483647";
  container.style.transform = saved.transform ?? `translate(${offsetX}px, ${offsetY}px)`;
  container.classList.add("is-idle");

  const logoContainer = document.createElement("div");
  logoContainer.classList.add("tts-logo");
  logoContainer.innerHTML = `
    <svg width="23" height="23" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <text x="24" y="32" font-family="Arial" font-size="32" fill="var(--tts-text-accent)" text-anchor="middle">T</text>
      <path d="M14,16 L34,16" stroke="var(--tts-text-accent)" stroke-width="2"/>
      <path d="M18,36 L30,36" stroke="var(--tts-text-accent)" stroke-width="2"/>
    </svg>
  `;
  logoContainer.title = "Simple TTS";

  const replayButton = document.createElement("button");
  replayButton.type = "button";
  replayButton.classList.add("tts-control");
  replayButton.innerHTML = ICONS.play;
  replayButton.title = "Play/Replay";
  replayButton.setAttribute("aria-label", "Play");
  replayButton.setAttribute("aria-busy", "false");

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.classList.add("tts-close");
  closeButton.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
  closeButton.title = "Close";
  closeButton.setAttribute("aria-label", "Close player");

  const applyTransform = (): void => {
    container.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
  };

  const scheduleSave = (): void => {
    if (saveHandle) return;
    saveHandle = window.setTimeout(() => {
      persistPosition({
        bottom: container.style.bottom,
        right: container.style.right,
        transform: container.style.transform,
        xOffset: offsetX,
        yOffset: offsetY
      });
      if (saveHandle) {
        clearTimeout(saveHandle);
        saveHandle = undefined;
      }
    }, 120);
  };

  const releasePointer = (event: PointerEvent): void => {
    try {
      container.releasePointerCapture(event.pointerId);
    } catch (_error) {
      // Ignore when pointer capture was not set.
    }
  };

  const handlePointerDown = (event: PointerEvent): void => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest("button")) return;

    isDragging = true;
    dragStartX = event.clientX - offsetX;
    dragStartY = event.clientY - offsetY;
    container.classList.add("is-dragging");
    container.style.transition = "none";
    container.setPointerCapture(event.pointerId);
    document.body.style.userSelect = "none";
    event.preventDefault();
  };

  const handlePointerMove = (event: PointerEvent): void => {
    if (!isDragging) return;
    offsetX = event.clientX - dragStartX;
    offsetY = event.clientY - dragStartY;
    window.requestAnimationFrame(applyTransform);
    scheduleSave();
  };

  const handlePointerUp = (event: PointerEvent): void => {
    if (!isDragging) return;
    isDragging = false;
    container.classList.remove("is-dragging");
    container.style.transition = "";
    releasePointer(event);
    document.body.style.userSelect = "";
    applyTransform();
    persistPosition({
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

  ["pointerdown", "mousedown", "touchstart"].forEach(eventName => {
    replayButton.addEventListener(eventName, stopPropagation);
    closeButton.addEventListener(eventName, stopPropagation);
  });

  container.append(logoContainer, replayButton, closeButton);

  const updateStatus = (args: MiniWindowStatusArgs): void => {
    const effectiveState: PlaybackState = args.state ?? "idle";
    const config = resolveUIConfig(effectiveState, args);

    replayButton.innerHTML = config.icon;
    replayButton.title = config.title;
    replayButton.setAttribute("aria-label", config.title);
    replayButton.setAttribute("aria-busy", config.busy ? "true" : "false");

    applyButtonState(replayButton, config);
    applyContainerState(container, config.containerState);
  };

  const destroy = (): void => {
    if (saveHandle) {
      clearTimeout(saveHandle);
      saveHandle = undefined;
    }
    isDragging = false;
    document.body.style.userSelect = "";
    container.removeEventListener("pointerdown", handlePointerDown);
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
    window.removeEventListener("pointercancel", handlePointerUp);
    ["pointerdown", "mousedown", "touchstart"].forEach(eventName => {
      replayButton.removeEventListener(eventName, stopPropagation);
      closeButton.removeEventListener(eventName, stopPropagation);
    });
  };

  return {
    container,
    logoContainer,
    replayButton,
    closeButton,
    updateStatus,
    destroy
  };
}
