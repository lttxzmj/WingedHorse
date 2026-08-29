import "@testing-library/jest-dom/vitest";

Object.defineProperty(window, "scrollTo", { value: () => undefined, writable: true });

if (!window.localStorage) {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, String(value)),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    get length() {
      return values.size;
    }
  };
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: storage
  });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
}
