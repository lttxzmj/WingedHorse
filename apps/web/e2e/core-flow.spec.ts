import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("questionnaire reaches result, lawn and game without a broken step", async ({
  page
}, testInfo) => {
  if (process.env.VISUAL_QA)
    await page.screenshot({
      path: `/private/tmp/wingedhorse-landing-${testInfo.project.name}.png`,
      fullPage: true
    });
  await page.getByRole("button", { name: "开始测测" }).click();
  if (process.env.VISUAL_QA)
    await page.screenshot({
      path: `/private/tmp/wingedhorse-assessment-${testInfo.project.name}.png`,
      fullPage: true
    });
  for (let index = 0; index < 17; index += 1) {
    await page.getByRole("radio").first().click();
  }
  await expect(page.getByText("今日判词 · 你已走完 17 幕")).toBeVisible();
  await expect(page.getByRole("heading", { name: "你的牛马血统" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "为什么是这个结果" })).toBeVisible();
  await expect(page.getByRole("button", { name: "保存或分享结果卡" })).toBeVisible();
  await page.evaluate(() =>
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => false })
  );
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "保存或分享结果卡" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^我的牛马类型-.*\.png$/);
  await expect(page.getByText("分享卡已保存，可以发给朋友了。")).toBeVisible();
  if (process.env.VISUAL_QA)
    await page.screenshot({
      path: `/private/tmp/wingedhorse-result-${testInfo.project.name}.png`,
      fullPage: true
    });
  await expect(
    page.getByText("本结果为娱乐测评，不构成心理、医疗或职业建议。类型只会在你主动复测时改变。")
  ).toBeVisible();
  await page.getByRole("button", { name: "去看看平行世界里的你" }).click();
  await expect(page.getByRole("heading", { name: /今天辛苦了/ })).toBeVisible();
  await page.getByRole("link", { name: /生活簿/ }).click();
  await expect(page.getByRole("heading", { name: "它今天也在生活" })).toBeVisible();
  await expect(page.getByText("新住客到达草坪")).toBeVisible();
  if (process.env.VISUAL_QA)
    await page.screenshot({
      path: `/private/tmp/wingedhorse-life-${testInfo.project.name}.png`,
      fullPage: true
    });
  await page.getByRole("button", { name: "接住这刻" }).first().click();
  await expect(page.getByRole("button", { name: "已接住" }).first()).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await page.getByRole("link", { name: "回到草坪" }).click();
  await page.locator(".character-hotspot").click();
  await expect(page.getByRole("dialog", { name: "现在想怎么陪它？" })).toBeVisible();
  await page.getByRole("button", { name: /摸摸它/ }).click();
  await expect(page.getByText(/同行值 \+1/)).toBeVisible();
  await expect(page.locator(".character-hotspot")).toBeFocused();
  if (process.env.VISUAL_QA)
    await page.screenshot({
      path: `/private/tmp/wingedhorse-home-${testInfo.project.name}.png`,
      fullPage: true
    });
  await page.getByRole("link", { name: "一起去接" }).click();
  await expect(page.getByRole("heading", { name: "接住今天的补给" })).toBeVisible();
  await expect(page.getByRole("button", { name: "准备开始" })).toBeVisible();
  await page.getByRole("button", { name: "准备开始" }).click();
  await expect(page.getByRole("button", { name: "暂停" })).toBeVisible({ timeout: 6_000 });
  await expect(page.locator(".drop-game-canvas canvas")).toBeVisible({ timeout: 6_000 });
  await page.waitForTimeout(900);
  const remaining = Number(
    await page.locator(".game-hud > span").first().locator("strong").textContent()
  );
  expect(remaining).toBeGreaterThanOrEqual(27);
  if (process.env.VISUAL_QA)
    await page.screenshot({
      path: `/private/tmp/wingedhorse-game-${testInfo.project.name}.png`,
      fullPage: true
    });
  await page.getByRole("button", { name: "暂停" }).click();
  await expect(page.getByRole("dialog", { name: "游戏已暂停" })).toBeVisible();
  await page.getByRole("button", { name: "继续接住" }).click();
  await expect(page.getByRole("button", { name: "暂停" })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("question option order stays stable and a quick answer can be undone", async ({ page }) => {
  await page.getByRole("button", { name: "开始测测" }).click();
  const optionLabels = async () =>
    (await page.getByRole("radio").allTextContents()).map((text) => text.replace("✓", ""));
  const firstQuestionOptions = await optionLabels();
  await page.getByRole("radio").first().click();
  await expect(page.getByText("第 2/17 题")).toBeVisible();
  await page.getByRole("button", { name: "返回修改" }).click();
  await expect(page.getByText("第 1/17 题")).toBeVisible();
  await expect(page.getByText("选最常发生的你，不是最理想的你")).toBeVisible();
  expect(await optionLabels()).toEqual(firstQuestionOptions);
});

test("legacy questionnaire drafts are deleted instead of migrated", async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem(
      "wingedhorse-local-state",
      JSON.stringify({ state: { answers: { q1: "a" }, assessmentIndex: 9 }, version: 2 })
    );
  });
  await page.reload();
  expect(await page.evaluate(() => localStorage.getItem("wingedhorse-local-state"))).toBeNull();
  await page.getByRole("button", { name: "开始测测" }).click();
  await expect(page.getByText("第 1/17 题")).toBeVisible();
});

test("AI disclosure, memory controls and network fallback remain usable", async ({
  page
}, testInfo) => {
  await page.route("**/api/companion/messages", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        reply: "我听见了，我们先把今天拆小一点。",
        source: "local-fallback",
        safetyLevel: "normal",
        aiDisclosure: true,
        memoryCandidate: null
      })
    })
  );
  await page.goto("/companion");
  await expect(page.getByText("嗨，我是 AI 飞马，不是真人或心理咨询师。")).toBeVisible();
  await page.getByLabel("本次允许带入已保存记忆").check();
  await page.getByLabel("想说什么都可以").fill("我喜欢散步");
  await page.getByRole("button", { name: "发送" }).click();
  await expect(page.getByText("我听见了，我们先把今天拆小一点。")).toBeVisible();
  if (process.env.VISUAL_QA)
    await page.screenshot({
      path: `/private/tmp/wingedhorse-chat-${testInfo.project.name}.png`,
      fullPage: true
    });
  await page.getByRole("button", { name: "把这句话记在本机" }).click();
  await page.goto("/memories");
  await expect(page.getByText("我喜欢散步")).toBeVisible();
  await page.getByRole("button", { name: "删除" }).click();
  await expect(page.getByText("还没有保存任何记忆")).toBeVisible();
});

test("camera experiment is optional and manual mood works without permission", async ({
  page
}, testInfo) => {
  await page.goto("/signals");
  await page.getByRole("button", { name: "有点累" }).click();
  await expect(page.getByRole("button", { name: "有点累" })).toHaveClass(/is-selected/);
  await expect(page.getByRole("button", { name: "开始 15 秒体验" })).toBeDisabled();
  await expect(page.getByText("不会录音、上传、保存视频，也不用于诊断。")).toBeVisible();
  if (process.env.VISUAL_QA)
    await page.screenshot({
      path: `/private/tmp/wingedhorse-signals-${testInfo.project.name}.png`,
      fullPage: true
    });
});
