import { describe, expect, it } from "vitest";
import { fromNominatim } from "@/lib/accounts/geocode-parse";

describe("géocodage Belgique (Nominatim)", () => {
  it("lit les coordonnées et la ville du premier résultat", () => {
    const r = fromNominatim([
      { lat: "50.4542", lon: "3.9567", address: { city: "Mons" } },
      { lat: "1", lon: "1", address: { city: "Ailleurs" } },
    ]);
    expect(r).toEqual({ lat: 50.4542, lng: 3.9567, city: "Mons" });
  });

  it("garde le nom français de Bruxelles", () => {
    const r = fromNominatim([{ lat: "50.8467", lon: "4.3525", address: { city: "Bruxelles - Brussel" } }]);
    expect(r?.city).toBe("Bruxelles");
  });

  it("se rabat sur la commune ou le village", () => {
    expect(fromNominatim([{ lat: "50.1", lon: "4.1", address: { town: "Waterloo" } }])?.city).toBe("Waterloo");
    expect(fromNominatim([{ lat: "50.1", lon: "4.1", address: { village: "Durbuy" } }])?.city).toBe("Durbuy");
  });

  it("renvoie null sans résultat exploitable", () => {
    expect(fromNominatim([])).toBeNull();
    expect(fromNominatim(null)).toBeNull();
    expect(fromNominatim([{ lat: "abc", lon: "4.1" }])).toBeNull();
    expect(fromNominatim([{ address: { city: "Liège" } }])).toBeNull();
  });
});
