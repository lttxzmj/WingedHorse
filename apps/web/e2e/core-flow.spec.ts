import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

const LOCAL_REPLY_TEXT =
  "我暂时连不上远处的 AI 服务，但还在这里。你可以先用一句话说说现在最占脑子的事；如果不想说，也可以回草原休息。";

function companionStream(response: Record<string, unknown>) {
  return [
    JSON.stringify({ type: "delta", delta: response.reply }),
    JSON.stringify({ type: "done", response })
  ]
    .join("\n")
    .concat("\n");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("questionnaire reaches result, prairie and game without a broken step", async ({
  page
}, testInfo) => {
  test.setTimeout(45_000);
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
  await expect(page.getByText(/清晨|午后|傍晚|深夜/).first()).toBeVisible();
  await page.getByRole("link", { name: "看看它今天还做了什么" }).click();
  await expect(page.getByRole("heading", { name: "它今天也在生活" })).toBeVisible();
  await expect(page.getByText("新住客到达草原")).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "共同远行进展" })).toHaveAttribute(
    "aria-valuenow",
    "0"
  );
  if (process.env.VISUAL_QA)
    await page.screenshot({
      path: `/private/tmp/wingedhorse-life-${testInfo.project.name}.png`,
      fullPage: true
    });
  await page.getByRole("tab", { name: "共同足迹" }).click();
  await expect(page.getByRole("heading", { name: "把照片贴回它发生的地方" })).toBeVisible();
  await expect(page.getByRole("img", { name: "暖色草原旅行手账底板" })).toBeVisible();
  if (process.env.VISUAL_QA)
    await page.screenshot({
      path: `/private/tmp/wingedhorse-photo-map-${testInfo.project.name}.png`,
      fullPage: true
    });
  await page.getByRole("button", { name: "贴照片" }).click();
  await expect(page.getByRole("dialog", { name: "贴下一张共同足迹" })).toContainText(
    "不请求定位权限"
  );
  await page.getByRole("button", { name: "关闭照片编辑" }).click();
  await page.getByRole("tab", { name: "生活动态" }).click();
  await page.getByRole("button", { name: "接住这刻" }).first().click();
  await expect(page.getByRole("button", { name: "已接住" }).first()).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await page.getByRole("button", { name: "存进共同记忆" }).first().click();
  await expect(page.getByRole("progressbar", { name: "共同远行进展" })).toHaveAttribute(
    "aria-valuenow",
    "1"
  );
  await page.getByRole("link", { name: "回到草原" }).click();
  await page.locator(".character-hotspot").click();
  await expect(page.getByRole("dialog", { name: "陪它做一件小事" })).toBeVisible();
  await page.getByRole("button", { name: /摸摸它/ }).click();
  await expect(page.getByText(/同行值 \+1/)).toBeVisible();
  await expect(page.locator(".character-hotspot")).toBeFocused();
  expect(
    await page
      .locator(".character-hotspot")
      .evaluate((element) => getComputedStyle(element).outlineStyle)
  ).toBe("none");
  if (process.env.VISUAL_QA)
    await page.screenshot({
      path: `/private/tmp/wingedhorse-home-${testInfo.project.name}.png`,
      fullPage: true
    });
  await page.getByRole("link", { name: "开始游戏" }).click();
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
  await expect(page.getByText("第 1/17 题")).toBeVisible();
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

test("reduced motion keeps question transitions short and moves focus to the next prompt", async ({
  page
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "开始测测" }).click();
  await expect(page.getByText("第 1/17 题")).toBeVisible();
  await expect(page.locator(".question-panel")).toHaveCSS("animation-name", "none");
  await page.getByRole("radio").first().click();
  await expect(page.getByText("第 2/17 题")).toBeVisible({ timeout: 1_000 });
  await expect(page.locator(".question-panel h1")).toBeFocused();
  await expect(page.locator(".question-panel")).toHaveCSS("animation-name", "none");
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

test("game start and companion entry survive an HTTP context without randomUUID", async ({
  page
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(globalThis.crypto, "randomUUID", {
      configurable: true,
      value: undefined
    });
  });
  await page.goto("/game");
  await expect(page.locator(".game-intro__character img")).toHaveAttribute(
    "src",
    "/game/characters/chosen.webp"
  );
  await page.getByRole("button", { name: "准备开始" }).click();
  await expect(page.getByRole("button", { name: "暂停" })).toBeVisible({ timeout: 8_000 });
  await page.goto("/companion");
  await expect(page.getByRole("heading", { name: "说两句也好" })).toBeVisible();
});

test("leaving an unfinished game does not grant rewards", async ({ page }) => {
  await page.goto("/game");
  await page.getByRole("button", { name: "准备开始" }).click();
  await expect(page.getByRole("button", { name: "向右移动" })).toBeVisible({ timeout: 8_000 });
  await page.goto("/home");
  const persistedJson = await page.evaluate(
    () => localStorage.getItem("wingedhorse-local-state-v2-1") ?? "{}"
  );
  const persisted = JSON.parse(persistedJson) as {
    state?: { gamesPlayed?: number; inventory?: Record<string, number> };
  };
  expect(persisted.state?.gamesPlayed ?? 0).toBe(0);
  expect(persisted.state?.inventory ?? {}).toEqual({});
});

test("game loading failure offers a usable retry path", async ({ page }) => {
  await page.route(/phaser/i, (route) => route.abort());
  await page.goto("/game");
  await page.getByRole("button", { name: "准备开始" }).click();
  await expect(page.getByRole("alert")).toContainText("补给雨还没打开", { timeout: 10_000 });
  await expect(page.getByRole("button", { name: "再试一次" })).toBeEnabled();
  await expect(page.locator(".game-recovery a", { hasText: "回到草原" })).toBeVisible();
});

test("a real game finishes, settles once, enters the bag and changes the life story", async ({
  page
}, testInfo) => {
  test.setTimeout(70_000);
  await page.evaluate(() => {
    localStorage.setItem(
      "wingedhorse-local-state-v2-1",
      JSON.stringify({
        version: 5,
        state: {
          assessmentOptionSeed: "playable-game-e2e",
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
          inventory: {},
          petVitals: { energy: 50, engine: 50, chaos: 50, direction: 50 },
          gamesPlayed: 0,
          relationshipXp: 0,
          lifeEvents: [],
          settledGameIds: []
        }
      })
    );
    Object.defineProperty(globalThis.crypto, "randomUUID", {
      configurable: true,
      value: () => "e2e-playable-session"
    });
  });
  await page.goto("/game");
  await page.getByRole("button", { name: "准备开始" }).click();
  await expect(page.getByRole("button", { name: "向左移动" })).toBeVisible({ timeout: 8_000 });
  await expect(page.locator(".game-hud")).toContainText(/[1-9]\d* 件/, { timeout: 12_000 });
  await expect(page.getByText("本局得分")).toBeVisible({ timeout: 35_000 });
  await expect(page.getByText(/最高 \d+ 连击/)).toBeVisible();
  await expect(page.getByLabel("本局获得物品").locator("span").first()).toBeVisible();
  await expect(page.getByRole("img", { name: "长出翅膀后的进化天马形象" })).toBeVisible();
  await expect(page.getByText(/飞升能量 \+\d+/)).toBeVisible();
  if (process.env.VISUAL_QA)
    await page.screenshot({
      path: `/private/tmp/wingedhorse-game-summary-${testInfo.project.name}.png`,
      fullPage: true
    });

  await page.getByRole("link", { name: "带着补给回草原" }).click();
  await expect(page.getByText("想玩时，再接一场")).toBeVisible();
  await expect(page.getByRole("link", { name: "再玩一局" })).toBeVisible();
  await page.getByRole("link", { name: /打开背包，共 [1-9]\d* 件/ }).click();
  await expect(page.getByRole("heading", { name: "今天接住的东西" })).toBeVisible();
  await page.getByRole("button", { name: "给牛马使用" }).first().click();
  const confirmation = page.getByRole("dialog", { name: /要使用.+吗/ });
  if (await confirmation.isVisible()) await page.getByRole("button", { name: "确认使用" }).click();
  await expect(page.getByRole("status")).toContainText("飞马收下了");

  await page.goto("/life");
  await expect(page.getByText("补给雨顺利收工")).toBeVisible();
  await expect(page.getByText(/收到一份.+/)).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "共同远行进展" })).toHaveAttribute(
    "aria-valuenow",
    "2"
  );
  const persisted = await page.evaluate(() => {
    const raw = localStorage.getItem("wingedhorse-local-state-v2-1") ?? "{}";
    return JSON.parse(raw) as {
      state: {
        gamesPlayed: number;
        relationshipXp: number;
        settledGameIds: string[];
      };
    };
  });
  expect(persisted.state.gamesPlayed).toBe(1);
  expect(persisted.state.relationshipXp).toBe(10);
  expect(persisted.state.settledGameIds).toHaveLength(1);
  expect(persisted.state.settledGameIds[0]).toMatch(/^[A-Za-z0-9_-]{8,80}$/u);
});

test("returning after a week reveals the private story arc without a check-in streak", async ({
  page
}) => {
  await page.evaluate(() => {
    const arrivalAt = new Date(Date.now() - 8 * 86_400_000).toISOString();
    localStorage.setItem(
      "wingedhorse-local-state-v2-1",
      JSON.stringify({
        version: 5,
        state: {
          assessmentOptionSeed: "story-e2e-seed",
          result: {
            questionSetId: "wingedhorse-v2-1",
            questionSetVersion: "2.1.0",
            rawScores: { energy: 10, engine: 10, chaos: 10, direction: 10 },
            normalizedScores: { energy: 50, engine: 50, chaos: 50, direction: 50 },
            typeId: "tired",
            edgeDimensions: [],
            easterEggs: [],
            bloodline: { purity: 100, hidden: [] },
            directionHint: "clear-direction"
          },
          relationshipXp: 20,
          lifeEvents: [
            {
              id: "life-arrival-e2e",
              eventKey: "arrival:2.1.0:tired",
              kind: "arrival",
              occurredAt: arrivalAt,
              title: "新住客到达草原",
              body: "它把这里当作暂时不用逞强的地方。",
              typeId: "tired",
              source: "user-action",
              liked: false,
              saved: false
            }
          ]
        }
      })
    );
  });
  await page.goto("/life");
  await expect(page.getByText("帐篷里多了一盏小灯")).toBeVisible();
  await expect(page.getByText("你们写下第一张远行手账")).toBeVisible();
  await expect(page.getByText("翅膀第一次留下完整影子")).toBeVisible();
  await expect(page.getByText("不是公开朋友圈")).toBeVisible();
});

test("AI disclosure, memory controls and network fallback remain usable", async ({
  page
}, testInfo) => {
  const companionRequests: Array<Record<string, unknown>> = [];
  await page.route("**/api/companion/messages/stream", async (route) => {
    companionRequests.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({
      status: 200,
      contentType: "application/x-ndjson",
      body: companionStream({
        reply: "我听见了，我们先把今天拆小一点。",
        source: "local-fallback",
        safetyLevel: "normal",
        aiDisclosure: true,
        memoryCandidate: null
      })
    });
  });
  await page.goto("/companion");
  await expect(page.getByText("嗨，我是 AI 飞马，不是真人或心理咨询师。")).toBeVisible();
  await page.getByText("本次发送范围").click();
  await page.getByLabel(/已保存记忆 → WingedHorse 服务端/u).check();
  await page.getByLabel("想说什么都可以").fill("我喜欢散步");
  await page.getByRole("button", { name: "发送" }).click();
  await expect(page.getByText("我听见了，我们先把今天拆小一点。")).toBeVisible();
  await expect(page.getByText("WingedHorse 本地降级回复")).toBeVisible();
  expect(companionRequests[0]).not.toHaveProperty("lifeContext");
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

test("companion sends life facts and manual mood only after session consent", async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem(
      "wingedhorse-local-state-v2-1",
      JSON.stringify({
        version: 5,
        state: {
          assessmentOptionSeed: "companion-grounding-e2e",
          result: {
            questionSetId: "wingedhorse-v2-1",
            questionSetVersion: "2.1.0",
            rawScores: { energy: 0, engine: 0, chaos: 0, direction: 0 },
            normalizedScores: { energy: 30, engine: 50, chaos: 40, direction: 60 },
            typeId: "tired",
            edgeDimensions: [],
            easterEggs: [],
            bloodline: { purity: 100, hidden: [] },
            directionHint: "clear-direction"
          },
          inventory: { "nap-mask": 1 },
          petVitals: { energy: 30, engine: 50, chaos: 40, direction: 60 },
          relationshipXp: 12,
          manualMood: "anxious",
          lifeEvents: [],
          settledGameIds: []
        }
      })
    );
  });
  const requests: Array<Record<string, unknown>> = [];
  await page.route("**/api/companion/messages/stream", async (route) => {
    requests.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({
      status: 200,
      contentType: "application/x-ndjson",
      body: companionStream({
        reply: "今天先不催自己满电。我们只选一件小事。",
        source: "domain-grounded",
        safetyLevel: "normal",
        aiDisclosure: true,
        memoryCandidate: null
      })
    });
  });
  await page.goto("/companion");
  await expect(page.getByText("AI 伙伴 · 疲惫的牛马")).toBeVisible();
  await page.getByText("本次发送范围").click();
  const lifeConsent = page.getByLabel(/生活簿、养成状态与手动心情 → 仅 WingedHorse 服务端/u);
  await expect(lifeConsent).toBeEnabled();
  await lifeConsent.check();
  await page.getByRole("button", { name: "我们接下来做什么？" }).click();
  await expect(page.locator(".companion-header .winged-horse")).toHaveClass(
    /winged-horse--listening/
  );
  await page.getByRole("button", { name: "发送" }).click();
  await expect(page.getByText(/依据你本次允许使用的生活事实/u)).toBeVisible();
  expect(requests[0]).toHaveProperty("moodHint", "anxious");
  expect(requests[0]).toHaveProperty("lifeContext");
});

test("companion exposes a recoverable local reply for malformed API responses", async ({
  page
}) => {
  await page.route("**/api/companion/messages/stream", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/x-ndjson", body: "{}\n" });
  });
  await page.goto("/companion");
  await page.getByLabel("想说什么都可以").fill("我有点乱");
  await page.getByRole("button", { name: "发送" }).click();
  await expect(page.getByText(LOCAL_REPLY_TEXT)).toBeVisible();
  await expect(page.getByRole("status")).toContainText("已切换为本地陪伴回复");
  await page.getByLabel("想说什么都可以").fill("我还能继续说吗");
  await expect(page.getByRole("button", { name: "发送" })).toBeEnabled();
});

test("companion explains an application rate limit without retrying the model", async ({
  page
}) => {
  let requests = 0;
  await page.route("**/api/companion/messages/stream", async (route) => {
    requests += 1;
    await route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({
        code: "COMPANION_RATE_LIMITED",
        message: "消息有点密，请稍后再试",
        retryAfterSeconds: 23
      })
    });
  });
  await page.goto("/companion");
  await page.getByLabel("想说什么都可以").fill("再说一句");
  await page.getByRole("button", { name: "发送" }).click();
  await expect(page.getByText(/消息来得有点密/u)).toBeVisible();
  await expect(page.getByRole("status")).toContainText("约 23 秒后可以再试");
  expect(requests).toBe(1);
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

test("life backup cannot silently authorize cloud game and inventory data", async ({ page }) => {
  await page.goto("/settings");
  const lifeBackup = page.getByLabel("允许备份私密生活簿");
  const playerCloud = page.getByLabel("尚未授权：保持本地模式");
  await expect(lifeBackup).not.toBeChecked();
  await expect(playerCloud).toBeDisabled();
  await lifeBackup.check();
  await expect(lifeBackup).toBeChecked();
  await expect(playerCloud).toBeDisabled();
  await expect(page.getByText("需要你明确同意后才会接通")).toBeVisible();
});

test("local data export downloads a readable whitelist without internal ids", async ({ page }) => {
  await page.goto("/settings");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载 JSON 文件" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^WingedHorse-我的数据-\d{4}-\d{2}-\d{2}\.json$/u);
  const path = await download.path();
  expect(path).not.toBeNull();
  if (!path) throw new Error("Expected Playwright to retain the downloaded export");
  const content = await readFile(path, "utf8");
  const payload = JSON.parse(content) as Record<string, unknown>;
  expect(payload.format).toBe("wingedhorse-user-data");
  expect(content).not.toContain("assessmentOptionSeed");
  expect(content).not.toContain("settledGameIds");
  await expect(page.getByRole("status")).toHaveText("当前设备的数据已导出。");
});

test("production defaults keep camera and rPPG unavailable while manual mood stays usable", async ({
  page
}) => {
  test.skip(process.env.PLAYWRIGHT_EXPECT_PRODUCTION_FLAGS !== "off");
  await page.goto("/signals");
  await expect(page.getByText("镜头实验暂未开放")).toBeVisible();
  await expect(page.getByText("手动心情仍可正常使用")).toBeVisible();
  await page.getByRole("button", { name: "有点累" }).click();
  await expect(page.getByRole("button", { name: "有点累" })).toHaveClass(/is-selected/);
  await expect(page.getByRole("button", { name: "开始 15 秒体验" })).toHaveCount(0);
});

test("review build can explicitly enable the camera and rPPG disclosure", async ({ page }) => {
  test.skip(process.env.PLAYWRIGHT_EXPECT_PRODUCTION_FLAGS !== "on");
  await page.goto("/signals");
  await expect(page.getByText(/实验功能 · 不上传 · rPPG 已开启/u)).toBeVisible();
  await expect(
    page.getByRole("checkbox", {
      name: /临时使用摄像头处理颜色变化、画面稳定度和表情线索/u
    })
  ).not.toBeChecked();
  await expect(page.getByRole("button", { name: "开始 15 秒体验" })).toBeDisabled();
});

test("production service worker precaches lazy routes for offline navigation", async ({
  page,
  context
}) => {
  test.skip(!process.env.PRODUCTION_SW_QA, "仅在生产 preview 资产验收中运行");
  await page.goto("/");
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
  const cacheAudit = await page.evaluate(async () => {
    const response = await fetch("/asset-manifest.json");
    const manifest = (await response.json()) as { version: string; assets: string[] };
    const cache = await caches.open(`wingedhorse-shell-${manifest.version}`);
    const cached = new Set((await cache.keys()).map((request) => new URL(request.url).pathname));
    return {
      hasAll: manifest.assets.every((asset) => cached.has(asset)),
      lazyChunks: manifest.assets.filter((asset) =>
        /\/(Assessment|Companion|Game)Page-/u.test(asset)
      ).length
    };
  });
  expect(cacheAudit).toMatchObject({ hasAll: true });
  expect(cacheAudit.lazyChunks).toBeGreaterThanOrEqual(3);
  await context.setOffline(true);
  await page.goto("/assessment");
  await expect(page.getByText("第一幕 · 晨间开机")).toBeVisible();
  await context.setOffline(false);
});
