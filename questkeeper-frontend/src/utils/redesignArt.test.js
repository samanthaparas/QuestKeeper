import { describe, it, expect } from "vitest";
import { BANNER_NAMES, BANNERS, CAMPAIGN_ART, getBanner, getBannerInfo, getCampaignArt, getCampaignArtForList } from "./redesignArt";

describe("redesignArt", () => {
  it("has a banner for every page it names", () => {
    BANNER_NAMES.forEach((name) => expect(getBanner(name)).toBeTruthy());
    expect(getBanner("nope")).toBeUndefined();
  });

  it("gives a table the same picture every time, from its id alone", () => {
    expect(getCampaignArt("a1b2")).toBe(getCampaignArt("a1b2"));
    expect(getCampaignArt("a1b2")).toBeTruthy();
  });

  it("spreads different tables across the sample pictures", () => {
    const seen = new Set(Array.from({ length: 40 }, (_, i) => getCampaignArt(`table-${i}`)));
    expect(seen.size).toBe(CAMPAIGN_ART.length);
  });

  it("never gives two neighbouring tables the same picture", () => {
    const ids = Array.from({ length: 60 }, (_, i) => `same-${i % 3}-${i}`);
    const pictures = getCampaignArtForList(ids);
    pictures.forEach((picture, i) => i > 0 && expect(picture).not.toBe(pictures[i - 1]));
  });

  it("gives every banner its own focal point and its real pixel size", () => {
    BANNER_NAMES.forEach((name) => {
      const info = getBannerInfo(name);
      expect(info.focus).toMatch(/^right \d+%$/);
      expect(info.width).toBe(2172);
      expect(info.height).toBe(724);
      // Drawn no wider than the picture's own pixels allow on a 2x screen (never stretched).
      expect(info.artWidth * 2).toBeLessThanOrEqual(info.width);
      expect(info.src).toBeTruthy();
      expect(info.srcSet).toMatch(/1086w, .* 2172w$/);
      expect(info.full).toBeTruthy();
    });
    expect(Object.keys(BANNERS)).toHaveLength(7);
  });
});
