/** iOS Safari 在 input 聚焦时会滚动/缩放 layout viewport；键盘收起后必须主动回位。 */

export function restoreDocumentViewport() {
  if (typeof window === "undefined") return;
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

export function measureKeyboardInset(): number {
  if (typeof window === "undefined") return 0;
  const visualViewport = window.visualViewport;
  if (!visualViewport) return 0;
  return Math.max(
    0,
    Math.round(window.innerHeight - visualViewport.height - visualViewport.offsetTop)
  );
}

export function syncKeyboardInset(inset = measureKeyboardInset()) {
  if (typeof document === "undefined") return;
  const next = inset < 8 ? 0 : inset;
  document.documentElement.style.setProperty("--keyboard-inset", `${next}px`);
}

export function clearKeyboardInset() {
  if (typeof document === "undefined") return;
  document.documentElement.style.removeProperty("--keyboard-inset");
}

export function subscribeVisualViewport(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const visualViewport = window.visualViewport;
  visualViewport?.addEventListener("resize", onChange);
  visualViewport?.addEventListener("scroll", onChange);
  window.addEventListener("orientationchange", onChange);
  return () => {
    visualViewport?.removeEventListener("resize", onChange);
    visualViewport?.removeEventListener("scroll", onChange);
    window.removeEventListener("orientationchange", onChange);
  };
}
