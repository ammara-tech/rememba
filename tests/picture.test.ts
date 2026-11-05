import { describe, expect, it } from "vitest";
import { MAX_PICTURE_CHARS, MAX_PICTURE_SIDE, fitWithin, isPicture } from "@/lib/picture";

describe("card pictures", () => {
  it("shrink the longest side to fit, keeping the shape", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: MAX_PICTURE_SIDE, height: 675 });
    expect(fitWithin(1000, 2000, 500)).toEqual({ width: 250, height: 500 });
  });

  it("are never made bigger", () => {
    expect(fitWithin(300, 200)).toEqual({ width: 300, height: 200 });
  });

  it("cope with an image that has no size", () => {
    expect(fitWithin(0, 100)).toEqual({ width: 0, height: 0 });
  });

  it("are only accepted as a small JPEG", () => {
    expect(isPicture("data:image/jpeg;base64,AAAA")).toBe(true);
    expect(isPicture("data:image/png;base64,AAAA")).toBe(false);
    expect(isPicture("data:image/jpeg;base64," + "A".repeat(MAX_PICTURE_CHARS))).toBe(false);
    expect(isPicture(42)).toBe(false);
  });
});
