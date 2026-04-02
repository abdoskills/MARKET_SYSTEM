type BarcodeListenerOptions = {
  minLength?: number;
  maxDelayMs?: number;
  onScan: (value: string) => void;
};

export function registerBarcodeListener(options: BarcodeListenerOptions) {
  const minLength = options.minLength ?? 6;
  const maxDelayMs = options.maxDelayMs ?? 40;

  let buffer = "";
  let lastTime = 0;

  function onKeydown(event: KeyboardEvent) {
    const now = Date.now();
    const delta = now - lastTime;

    if (delta > maxDelayMs) {
      buffer = "";
    }

    if (event.key === "Enter") {
      if (buffer.length >= minLength) {
        options.onScan(buffer);
      }
      buffer = "";
      return;
    }

    if (event.key.length === 1) {
      buffer += event.key;
      lastTime = now;
    }
  }

  window.addEventListener("keydown", onKeydown);

  return () => window.removeEventListener("keydown", onKeydown);
}
