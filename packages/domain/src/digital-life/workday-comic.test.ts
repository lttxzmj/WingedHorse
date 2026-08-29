import { describe, expect, it } from "vitest";
import { CHARACTER_NAME, PRODUCT_SLOGAN } from "../branding.js";
import { comicPunchline, createWorkdayComic } from "./workday-comic.js";

describe("workday comic", () => {
  it("builds a four-panel share comic with short punchlines", () => {
    const comic = createWorkdayComic({
      dateLabel: "8月29日",
      clockedIn: true,
      gamesPlayed: 2,
      caughtCount: 9,
      momentLine: "它把毯子叠好，等你下班。",
      typeId: "chosen"
    });
    expect(comic.characterName).toBe(CHARACTER_NAME);
    expect(comic.slogan).toBe(PRODUCT_SLOGAN);
    expect(comic.characterSrc).toBe("/characters/types/chosen.webp");
    expect(comic.panels).toHaveLength(4);
    expect(comic.panels[0]?.body).toBe("开机。");
    expect(comic.panels[1]?.body).toBe("接住 9 件。");
    expect(comic.panels[2]?.body).toBe("它把毯子叠好。");
    expect(comic.panels[3]?.body).toBe("收工。");
  });

  it("clips long moment lines without leftover clauses", () => {
    expect(comicPunchline("今天风有点大，可是毯子还在。", "风很小。")).toBe("今天风有点大。");
    expect(comicPunchline(null, "风很小。")).toBe("风很小。");
  });
});
