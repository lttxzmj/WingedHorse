import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem(
      "wingedhorse-local-state-v2-1",
      JSON.stringify({
        version: 7,
        state: {
          assessmentOptionSeed: "welfare-e2e",
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
          inventory: { "sponsored-coffee-coupon": 1, "iced-americano": 1 },
          petVitals: { energy: 40, engine: 50, chaos: 50, direction: 50 },
          gamesPlayed: 1,
          relationshipXp: 10,
          lifeEvents: [],
          settledGameIds: []
        }
      })
    );
  });
});

test("inventory can reopen the welfare claim sheet", async ({ page }) => {
  await page.goto("/inventory");
  await page.getByRole("button", { name: /蓝盒子睡眠护理枕/ }).click();
  await expect(page.getByRole("dialog", { name: "蓝盒子睡眠护理枕" })).toBeVisible();
  await expect(page.getByText("品牌合作 · 与购买无关")).toBeVisible();
  await page.getByRole("button", { name: "领牛毛" }).click();
  const sheet = page.getByRole("dialog", { name: "领牛毛" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("演示码")).toBeVisible();
  await expect(sheet.getByRole("img", { name: "演示领取码" })).toBeVisible();
  await expect(sheet.getByText("领不领随你。")).toBeVisible();
  await sheet.getByRole("button", { name: "知道了" }).click();
  await expect(sheet).toHaveCount(0);
});
