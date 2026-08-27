import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("questionnaire reaches result, lawn and game without a broken step", async ({ page }, testInfo) => {
  await page.getByRole("button", { name: "开始 90 秒测评" }).click();
  for (let index = 0; index < 17; index += 1) {
    await page.getByRole("radio").first().click();
    await page.getByRole("button", { name: index === 16 ? "看看我是哪种牛马" : "下一题" }).click();
  }
  await expect(page.getByText("你的当前形态")).toBeVisible();
  if (process.env.VISUAL_QA) await page.screenshot({ path: `/private/tmp/wingedhorse-result-${testInfo.project.name}.png`, fullPage: true });
  await expect(page.getByText("本结果为娱乐测评，不构成心理、医疗或职业建议。类型只会在你主动复测时改变。")).toBeVisible();
  await page.getByRole("button", { name: "去草坪见见它" }).click();
  await expect(page.getByRole("heading", { name: /今天辛苦了/ })).toBeVisible();
  if (process.env.VISUAL_QA) await page.screenshot({ path: `/private/tmp/wingedhorse-home-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "开始" }).click();
  await expect(page.getByRole("heading", { name: "接住小礼物" })).toBeVisible();
  await expect(page.getByRole("button", { name: "开始接住" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("AI disclosure, memory controls and network fallback remain usable", async ({ page }, testInfo) => {
  await page.route("**/api/companion/messages", async (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ reply: "我听见了，我们先把今天拆小一点。", source: "local-fallback", safetyLevel: "normal", aiDisclosure: true, memoryCandidate: null })
  }));
  await page.goto("/companion");
  await expect(page.getByText("嗨，我是 AI 飞马，不是真人或心理咨询师。")).toBeVisible();
  await page.getByLabel("本次允许带入已保存记忆").check();
  await page.getByLabel("想说什么都可以").fill("我喜欢散步");
  await page.getByRole("button", { name: "发送" }).click();
  await expect(page.getByText("我听见了，我们先把今天拆小一点。")).toBeVisible();
  if (process.env.VISUAL_QA) await page.screenshot({ path: `/private/tmp/wingedhorse-chat-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "把这句话记在本机" }).click();
  await page.goto("/memories");
  await expect(page.getByText("我喜欢散步")).toBeVisible();
  await page.getByRole("button", { name: "删除" }).click();
  await expect(page.getByText("还没有保存任何记忆")).toBeVisible();
});

test("camera experiment is optional and manual mood works without permission", async ({ page }, testInfo) => {
  await page.goto("/signals");
  await page.getByRole("button", { name: "有点累" }).click();
  await expect(page.getByRole("button", { name: "有点累" })).toHaveClass(/is-selected/);
  await expect(page.getByRole("button", { name: "开始 15 秒体验" })).toBeDisabled();
  await expect(page.getByText("不会录音、上传、保存视频，也不用于诊断。")).toBeVisible();
  if (process.env.VISUAL_QA) await page.screenshot({ path: `/private/tmp/wingedhorse-signals-${testInfo.project.name}.png`, fullPage: true });
});
