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
  await expect(page.getByRole("heading", { name: "来来" })).toBeVisible();
  await expect(page.getByRole("link", { name: "打开朋友圈动态" })).toBeVisible();
  await expect(page.getByRole("button", { name: "摸摸鱼：去接补给" })).toBeVisible();
  await expect(page.getByLabel(/^心情 /)).toBeVisible();
  await expect(page.getByLabel("元气 40")).toBeVisible();
  await expect(page.getByLabel("草原正在掉落的补给").getByRole("button")).toHaveCount(3);
  await expect(page.getByRole("heading", { name: "熟悉阶段" })).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "和来来聊一聊" })).toBeVisible();

  await page.screenshot({
    path: `/private/tmp/wingedhorse-digital-life-home-${testInfo.project.name}.png`,
    fullPage: true
  });

  await page.locator(".character-hotspot").click();
  await expect(page.getByRole("dialog", { name: "家园养成" })).toBeVisible();
  await page.screenshot({
    path: `/private/tmp/wingedhorse-cultivation-sheet-${testInfo.project.name}.png`,
    fullPage: true
  });

  await page.getByRole("button", { name: /给它冰美式/ }).click();
  await expect(page.getByText(/它收下了冰美式补给/)).toBeVisible();
  await expect(page.locator(".character-hotspot")).toBeFocused();

  await page.getByRole("textbox", { name: "和来来聊一聊" }).fill("今天有点累");
  await page.getByRole("button", { name: "进入来来对话" }).click();
  await expect(page.locator("#chat-message")).toHaveValue("今天有点累");

  const inventoryCount = await page.evaluate(() => {
    const raw = localStorage.getItem("wingedhorse-local-state-v2-1") ?? "{}";
    const persisted = JSON.parse(raw) as {
      state: { inventory: Record<string, number> };
    };
    return persisted.state.inventory["iced-americano"];
  });
  expect(inventoryCount).toBe(1);
});
