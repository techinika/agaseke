/**
 * Global ref-backed media playback registry and DOM fallback so starting any
 * video or audio stream immediately pauses any currently playing media element.
 */

type MediaListener = (activeId: string | null) => void;

const registeredElements = new Map<string, HTMLMediaElement>();
const listeners = new Set<MediaListener>();
let activeMediaId: string | null = null;
let activeElementRef: HTMLMediaElement | null = null;

function emitActiveChange() {
  for (const listener of listeners) {
    try {
      listener(activeMediaId);
    } catch {
      // Ignore subscriber errors
    }
  }
}

export function getActiveMediaId(): string | null {
  return activeMediaId;
}

export function getActiveMediaElement(): HTMLMediaElement | null {
  return activeElementRef;
}

export function subscribeActiveMedia(listener: MediaListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function registerMediaRef(id: string, element: HTMLMediaElement | null): void {
  if (!id) return;
  if (element) {
    registeredElements.set(id, element);
  } else {
    const existing = registeredElements.get(id);
    if (existing && activeElementRef === existing) {
      activeElementRef = null;
      if (activeMediaId === id) {
        activeMediaId = null;
        emitActiveChange();
      }
    }
    registeredElements.delete(id);
  }
}

function safePause(media: HTMLMediaElement | null | undefined): void {
  if (!media) return;
  if (!media.paused && !media.ended) {
    try {
      media.pause();
    } catch {
      // Ignore browser media pause errors
    }
  }
}

/**
 * Marks `id` / `current` as the sole active media stream and pauses any
 * previously active ref, every other registered ref, and any standalone DOM
 * `<video>` / `<audio>` element.
 */
export function activateMediaRef(
  id: string,
  current: HTMLMediaElement | null,
): void {
  if (activeElementRef && activeElementRef !== current) {
    safePause(activeElementRef);
  }

  for (const [otherId, el] of registeredElements.entries()) {
    if (otherId === id || el === current) continue;
    safePause(el);
  }

  pauseOtherMediaElements(current);

  activeMediaId = id;
  activeElementRef = current;
  emitActiveChange();
}

export function notifyMediaPaused(id: string, element?: HTMLMediaElement | null): void {
  if (activeMediaId === id || (element && activeElementRef === element)) {
    activeMediaId = null;
    activeElementRef = null;
    emitActiveChange();
  }
}

export function pauseAllMediaRefs(exceptId?: string): void {
  for (const [id, el] of registeredElements.entries()) {
    if (exceptId && id === exceptId) continue;
    safePause(el);
  }
  const keepEl = exceptId ? registeredElements.get(exceptId) ?? null : null;
  pauseOtherMediaElements(keepEl);
  if (!exceptId) {
    activeMediaId = null;
    activeElementRef = null;
    emitActiveChange();
  }
}

/**
 * Pauses every playing `<video>` and `<audio>` element in the document other than
 * `current`, ensuring only one feed media stream plays at a time.
 */
export function pauseOtherMediaElements(current: HTMLMediaElement | null): void {
  if (typeof document === "undefined") return;
  const elements = document.querySelectorAll("video, audio");
  for (const el of elements) {
    if (el === current) continue;
    safePause(el as HTMLMediaElement);
  }
}
