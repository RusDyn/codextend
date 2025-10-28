import { describe, expect, it, beforeEach } from "vitest";

import { DEFAULT_MATCH_KEYWORDS } from "../src/config";
import { isNerch } from "../src/lib/match";
import {
  clearAllStorage,
  loadMatchSettings,
  saveMatchSettings
} from "../src/lib/storage";

const DEFAULT_KEYWORD = DEFAULT_MATCH_KEYWORDS[0];

describe("isNerch", () => {
  beforeEach(async () => {
    await clearAllStorage();
  });

  it("detects Nerch threads by title", () => {
    expect(isNerch("The Great Nerch Gathering", [])).toBe(true);
  });

  it("detects Nerch threads via tags", () => {
    expect(isNerch("General Discussion", ["Community", DEFAULT_KEYWORD.toUpperCase()])).toBe(true);
  });

  it("persists custom keywords", async () => {
    const keywords = ["Space Wizards", "Galactic Nerch"]; // duplicates, weird casing
    await saveMatchSettings({ keywords });

    const { keywords: persisted } = await loadMatchSettings();
    expect(persisted).toEqual(["space wizards", "galactic nerch"]);

    expect(isNerch("Space Wizards Meetup", [], persisted)).toBe(true);
    expect(isNerch("Casual chat", ["galactic nerch"], persisted)).toBe(true);
  });

  it("returns false when no keywords match", () => {
    expect(isNerch("Random Q&A", ["community", "meetup"])).toBe(false);
  });
});
