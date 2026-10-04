import { describe, expect, it } from "vitest";
import { formatDistance, haversineKm, inBBox, parseBBox, roundLatLng } from "@/lib/geo";

describe("geo", () => {
  it("distance Paris → Nantes ≈ 343 km", () => {
    const d = haversineKm({ lat: 48.8566, lng: 2.3522 }, { lat: 47.2184, lng: -1.5536 });
    expect(d).toBeGreaterThan(335);
    expect(d).toBeLessThan(350);
  });

  it("arrondit la position (confidentialité)", () => {
    expect(roundLatLng({ lat: 47.218371, lng: -1.553621 })).toEqual({ lat: 47.22, lng: -1.55 });
  });

  it("parse et teste une bbox", () => {
    const b = parseBBox("-1.7,47.1,-1.4,47.3");
    expect(b).toEqual([-1.7, 47.1, -1.4, 47.3]);
    expect(inBBox({ lat: 47.2, lng: -1.55 }, b!)).toBe(true);
    expect(inBBox({ lat: 48, lng: -1.55 }, b!)).toBe(false);
    expect(parseBBox("1,2,0,3")).toBeNull();
    expect(parseBBox("nope")).toBeNull();
  });

  it("formate les distances en français", () => {
    expect(formatDistance(0.42)).toBe("400 m");
    expect(formatDistance(2.44)).toBe("2,4 km");
    expect(formatDistance(23.6)).toBe("24 km");
    expect(formatDistance(null)).toBeNull();
  });
});
