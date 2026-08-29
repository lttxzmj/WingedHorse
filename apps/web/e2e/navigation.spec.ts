import { expect, test, type Page } from "@playwright/test";

const LOCAL_STATE_KEY = "wingedhorse-local-state-v2-1";

const assessmentResult = {
  questionSetId: "wingedhorse-v2-1",
  questionSetVersion: "2.1.0",
  rawScores: { energy: 0, engine: 0, chaos: 0, direction: 0 },
  normalizedScores: { energy: 50, engine: 50, chaos: 50, direction: 50 },
  typeId: "chosen",
  edgeDimensions: [],
  easterEggs: [],
  bloodline: { purity: 100, hidden: [] },
  directionHint: "clear-direction"
};

async function seedReturningUser(page: Page) {
  await page.evaluate(
    ({ key, result }) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 8,
          state: {
            assessmentOptionSeed: "navigation-e2e",
            result,
            inventory: {},
            petVitals: { energy: 50, engine: 50, chaos: 50, direction: 50 },
            gamesPlayed: 0,
            relationshipXp: 0,
            lifeEvents: [],
            settledGameIds: []
          }
        })
      );
    },
    { key: LOCAL_STATE_KEY, result: assessmentResult }
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate((key) => localStorage.removeItem(key), LOCAL_STATE_KEY);
});

test("returning users and result users can enter the prairie directly", async ({ page }) => {
  await seedReturningUser(page);
  await page.goto("/");

  await expect(page.getByRole("button", { name: "回到草原" })).toBeVisible();
  await expect(page.getByRole("button", { name: "重新测一次" })).toBeVisible();
  await page.getByRole("button", { name: "回到草原" }).click();
  await expect(page).toHaveURL(/\/home$/);

  await page.goto("/result");
  await expect(page.getByRole("button", { name: "回到草原" })).toBeVisible();
  await page.getByRole("button", { name: "回到草原" }).click();
  await expect(page).toHaveURL(/\/home$/);
});

test("automatic game start is consumed once and guest exits return home", async ({ page }) => {
  await seedReturningUser(page);
  await page.goto("/game#start");
  await expect(page).toHaveURL(/\/game$/);

  await page.evaluate((key) => localStorage.removeItem(key), LOCAL_STATE_KEY);
  await page.goto("/game");
  await page.getByRole("link", { name: "回到首页" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("home settings entry shows the page after a leftover document scroll", async ({ page }) => {
  await seedReturningUser(page);
  await page.goto("/home");
  await page.evaluate(() => window.scrollTo(0, 480));
  await page.getByRole("link", { name: "打开设置与隐私" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole("heading", { name: "你的数据由你决定" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "协议与隐私" })).toBeVisible();
  const scrollY = await page.evaluate(() => window.scrollY);
  expect(scrollY).toBeLessThanOrEqual(2);
});

test("settings children return to settings", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("link", { name: /管理与体验/ }).click();
  await expect(page).toHaveURL(/\/signals$/);
  await page.getByRole("link", { name: "返回设置" }).click();
  await expect(page).toHaveURL(/\/settings$/);

  await page.getByRole("link", { name: "去邀请" }).click();
  await expect(page).toHaveURL(/\/friends$/);
  await page.getByRole("link", { name: "返回设置" }).click();
  await expect(page).toHaveURL(/\/settings$/);
});

test("settings offers entertainment questionnaire start, result and retest", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "娱乐问卷" })).toBeVisible();
  await expect(
    page.getByText("17 题，大约 90 秒。结果只作轻松参考，不是心理或职业建议。")
  ).toBeVisible();
  await page.getByRole("link", { name: "开始测测" }).click();
  await expect(page).toHaveURL(/\/assessment$/);

  await seedReturningUser(page);
  await page.goto("/settings");
  await expect(
    page.getByText("你现在是「天选牛马」。类型只会在你主动重测时改变，结果只作轻松参考。")
  ).toBeVisible();
  await page.getByRole("link", { name: "查看结果" }).click();
  await expect(page).toHaveURL(/\/result$/);

  await page.goto("/settings");
  await page.getByRole("button", { name: "重新测一次" }).click();
  await expect(page).toHaveURL(/\/assessment$/);
  await page.goto("/result");
  await expect(page.getByRole("heading", { name: "还没有测评结果" })).toBeVisible();
  await expect(page.getByRole("button", { name: "开始测测" })).toBeVisible();
});

test("route changes update the title, focus the heading and keep a branded 404", async ({
  page
}) => {
  await seedReturningUser(page);
  await page.goto("/inventory");
  await expect(page).toHaveTitle("来来的背包 · 牛马飞升");
  await expect(page.getByRole("heading", { name: "今天接住的东西" })).toBeFocused();

  await page.goto("/not-a-real-prairie");
  await expect(page).toHaveTitle("页面未找到 · 牛马飞升");
  await expect(page.getByRole("heading", { name: "这片草原还没延伸到这里" })).toBeVisible();
  await expect(page.getByRole("link", { name: "回到首页" })).toBeVisible();
});
