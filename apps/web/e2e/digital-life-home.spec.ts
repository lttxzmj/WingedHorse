import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem(
      "wingedhorse-local-state-v2-1",
      JSON.stringify({
        version: 5,
        state: {
          assessmentOptionSeed: "digital-life-home-e2e",
          result: {
            questionSetId: "wingedhorse-v2-1",
            questionSetVersion: "2.1.0",
            rawScores: { energy: 0, engine: 0, chaos: 0, direction: 0 },
            normalizedScores: { energy: 50, engine: 50, chaos: 50, direction: 50 },
            typeId: "chosen",
            edgeDimensions: [],
            easterEggs: [],
            bloodline: { purity: 100, hidden: [] },
            directionHint: "clear-direction"
          },
          inventory: { "iced-americano": 2 },
          petVitals: { energy: 40, engine: 50, chaos: 50, direction: 50 },
          gamesPlayed: 1,
          relationshipXp: 10,
          lifeEvents: [],
          settledGameIds: []
        }
      })
    );
  });
  await page.goto("/home");
});

test("digital life home keeps companionship primary and care functional", async ({
  page
}, testInfo) => {
  await expect(page.getByRole("heading", { name: "熟悉阶段" })).toBeVisible();
  await expect(page.getByRole("link", { name: "进入飞马对话" })).toBeVisible();
  await expect(page.getByRole("button", { name: "照顾" })).toBeVisible();
  await expect(page.getByRole("link", { name: "打开共同生活簿" })).toBeVisible();
  await expect(
    page.locator(".digital-life-stage").getByRole("link", { name: /开始游戏/ })
  ).toHaveCount(0);

  await page.screenshot({
    path: `/private/tmp/wingedhorse-digital-life-home-${testInfo.project.name}.png`,
    fullPage: true
  });

  await page.getByRole("button", { name: "照顾" }).click();
  await expect(page.getByRole("dialog", { name: "陪它做一件小事" })).toBeVisible();
  await page.screenshot({
    path: `/private/tmp/wingedhorse-cultivation-sheet-${testInfo.project.name}.png`,
    fullPage: true
  });

  await page.getByRole("button", { name: /给它冰美式/ }).click();
  await expect(page.getByText(/它收下了冰美式补给/)).toBeVisible();
  await expect(page.getByRole("button", { name: "照顾" })).toBeFocused();

  const inventoryCount = await page.evaluate(() => {
    const raw = localStorage.getItem("wingedhorse-local-state-v2-1") ?? "{}";
    const persisted = JSON.parse(raw) as {
      state: { inventory: Record<string, number> };
    };
    return persisted.state.inventory["iced-americano"];
  });
  expect(inventoryCount).toBe(1);
});
