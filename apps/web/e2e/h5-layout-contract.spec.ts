import { expect, test, type Page } from "@playwright/test";

const H5_VIEWPORTS = [
  { width: 320, height: 568, name: "320x568" },
  { width: 375, height: 667, name: "375x667" },
  { width: 390, height: 844, name: "390x844" },
  { width: 412, height: 915, name: "412x915" },
  { width: 430, height: 932, name: "430x932" }
] as const;

async function seedCompletedAssessment(page: Page) {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem(
      "wingedhorse-local-state-v2-1",
      JSON.stringify({
        version: 5,
        state: {
          assessmentOptionSeed: "h5-layout-contract",
          result: {
            questionSetId: "wingedhorse-v2-1",
            questionSetVersion: "2.1.0",
            rawScores: { energy: 2, engine: 3, chaos: 1, direction: 4 },
            normalizedScores: { energy: 56, engine: 62, chaos: 48, direction: 71 },
            typeId: "chosen",
            edgeDimensions: [],
            easterEggs: [],
            bloodline: { purity: 84, hidden: [] },
            directionHint: "clear-direction"
          },
          inventory: { "iced-americano": 2 },
          petVitals: { energy: 56, engine: 62, chaos: 48, direction: 71 },
          gamesPlayed: 1,
          relationshipXp: 18,
          lifeEvents: [],
          settledGameIds: []
        }
      })
    );
  });
}

test("home and assessment result obey the H5 layout contract", async ({ page }, testInfo) => {
  await seedCompletedAssessment(page);

  for (const viewport of H5_VIEWPORTS) {
    await page.setViewportSize(viewport);
    await page.goto("/home");
    await expect(page.getByLabel("飞马生活草原")).toBeVisible();
    await expect(page.getByText("你的数字生命")).toHaveCount(0);
    await expect(page.getByText("数字生命", { exact: true })).toHaveCount(0);
    const homeMetrics = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      headerBottom:
        document.querySelector<HTMLElement>(".digital-life-header")?.getBoundingClientRect()
          .bottom ?? 0,
      stageTop:
        document.querySelector<HTMLElement>(".digital-life-stage")?.getBoundingClientRect().top ?? 0
    }));
    expect(homeMetrics.overflow).toBeLessThanOrEqual(1);
    expect(homeMetrics.headerBottom).toBeLessThanOrEqual(homeMetrics.stageTop);

    if (process.env.VISUAL_QA && viewport.name === "390x844")
      await page.screenshot({
        path: `/private/tmp/wingedhorse-h5-home-${testInfo.project.name}.png`,
        fullPage: true
      });

    await page.goto("/result");
    await expect(page.getByRole("heading", { name: "天选牛马" })).toBeVisible();
    await expect(page.getByRole("button", { name: "开始摸鱼：去接补给" })).toBeVisible();
    await expect(page.locator(".result-moyu-cta__label")).toHaveText("开始摸鱼");
    const resultMetrics = await page.evaluate(() => {
      const hero = document.querySelector<HTMLElement>(".result-hero")?.getBoundingClientRect();
      const copy = document
        .querySelector<HTMLElement>(".result-hero__copy")
        ?.getBoundingClientRect();
      const character = document
        .querySelector<HTMLElement>(".result-hero .winged-horse")
        ?.getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        heroLeft: hero?.left ?? 0,
        heroRight: hero?.right ?? 0,
        copyRight: copy?.right ?? 0,
        characterLeft: character?.left ?? 0
      };
    });
    expect(resultMetrics.overflow).toBeLessThanOrEqual(1);
    expect(resultMetrics.heroLeft).toBeGreaterThanOrEqual(0);
    expect(resultMetrics.heroRight).toBeLessThanOrEqual(viewport.width + 1);
    expect(resultMetrics.copyRight).toBeLessThanOrEqual(resultMetrics.characterLeft + 8);

    if (process.env.VISUAL_QA && viewport.name === "390x844")
      await page.screenshot({
        path: `/private/tmp/wingedhorse-h5-result-${testInfo.project.name}.png`,
        fullPage: true
      });
  }
});

test("the game remains operable in the H5 landscape fallback", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/game");
  await expect(page.getByRole("button", { name: "开始接补给" })).toBeVisible();
  const introMetrics = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    pageHeight: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight
  }));
  expect(introMetrics.overflow).toBeLessThanOrEqual(1);
  expect(introMetrics.pageHeight).toBeLessThanOrEqual(introMetrics.viewportHeight + 1);

  await page.getByRole("button", { name: "开始接补给" }).click();
  await expect(page.getByRole("button", { name: "暂停" })).toBeVisible({ timeout: 8_000 });
  await expect(page.getByRole("button", { name: "向左移动" })).toBeVisible();
  await expect(page.getByRole("button", { name: "向右移动" })).toBeVisible();
  const playOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(playOverflow).toBeLessThanOrEqual(1);

  if (process.env.VISUAL_QA)
    await page.screenshot({
      path: `/private/tmp/wingedhorse-h5-game-landscape-${testInfo.project.name}.png`,
      fullPage: true
    });
});
