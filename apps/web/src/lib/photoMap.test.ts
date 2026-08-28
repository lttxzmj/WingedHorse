import { describe, expect, it } from "vitest";
import { normalizePhotoMoment } from "./photoMap";

const baseMoment = {
  id: "photo-1",
  caption: "今天的风很轻",
  createdAt: "2026-08-28T08:00:00.000Z",
  image: new Blob(["photo"], { type: "image/webp" })
};

describe("photo map migration", () => {
  it("keeps a valid province-level region", () => {
    expect(normalizePhotoMoment({ ...baseMoment, regionId: "zhejiang" }).regionId).toBe("zhejiang");
  });

  it("moves legacy fictional landmarks into the private grassland pocket", () => {
    expect(normalizePhotoMoment({ ...baseMoment, landmarkId: "tent" }).regionId).toBe("grassland");
  });

  it("does not trust an unknown stored region", () => {
    expect(normalizePhotoMoment({ ...baseMoment, regionId: "precise-home-address" }).regionId).toBe(
      "grassland"
    );
  });
});
