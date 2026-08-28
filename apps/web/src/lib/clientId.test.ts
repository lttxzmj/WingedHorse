import { afterEach, describe, expect, it, vi } from "vitest";
import { createClientId } from "./clientId";

describe("createClientId", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses randomUUID when the browser provides it", () => {
    vi.stubGlobal("crypto", { randomUUID: () => "native-id" });
    expect(createClientId()).toBe("native-id");
  });

  it("works when randomUUID is unavailable in an insecure context", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.fill(1);
        return bytes;
      }
    });

    expect(createClientId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });
});
