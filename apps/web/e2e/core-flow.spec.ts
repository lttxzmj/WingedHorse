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
  test.setTimeout(60_000);
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
  await expect(page.getByText("你的牛马类型")).toBeVisible();
  await expect(page.getByRole("heading", { name: "类型构成" })).toBeVisible();
  await expect(page.getByText("为什么是这个结果")).toHaveCount(0);
  await expect(page.getByText("这次像你吗？")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "生成海报" })).toBeVisible();
  await page.evaluate(() =>
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => false })
  );
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "生成海报" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^我的牛马类型-.*\.png$/);
  await expect(page.getByText("牛马类型海报已保存，可以发给朋友了。")).toBeVisible();
  if (process.env.VISUAL_QA)
    await page.screenshot({
      path: `/private/tmp/wingedhorse-result-${testInfo.project.name}.png`,
      fullPage: true
    });
  await expect(
    page.getByText("本结果为娱乐测评，不构成心理、医疗或职业建议。类型只会在你主动复测时改变。")
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "开始摸鱼：去接补给" })).toBeVisible();
  await expect(page.locator(".result-moyu-cta__label")).toHaveText("开始摸鱼");
  await page.getByRole("button", { name: "开始摸鱼：去接补给" }).click();
  // 结果页 CTA 直接自动开局（倒计时/游玩阶段页头隐藏），以进入游戏为准
  await expect(page.getByRole("button", { name: "暂停" })).toBeVisible({
    timeout: 8_000
  });
  await expect(page.getByRole("button", { name: "暂停" })).toBeVisible({ timeout: 6_000 });
  await expect(page.locator(".drop-game-canvas canvas")).toBeVisible({ timeout: 6_000 });
  await page.waitForTimeout(900);
  const remaining = Number(
    await page.locator(".game-hud__pill--time strong").first().textContent()
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
  await page.getByRole("button", { name: "暂停" }).click();
  await page.getByRole("link", { name: "结束并回草原" }).click();
  await expect(page.getByRole("heading", { name: "来来" })).toBeVisible();
  await page.getByRole("link", { name: "打开朋友圈" }).click();
  await expect(page.getByRole("heading", { name: "它的朋友圈" })).toBeVisible();
  await expect(page.getByText("新住客到达草原")).toBeVisible();
  await page.locator(".life-pinned-story > summary").click();
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
  await page.getByRole("button", { name: "抱住" }).first().click();
  await expect(page.getByRole("button", { name: "已抱住" }).first()).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await page.getByRole("button", { name: "存进共同记忆" }).first().click();
  await page.locator(".life-pinned-story > summary").click();
  await expect(page.getByRole("progressbar", { name: "共同远行进展" })).toHaveAttribute(
    "aria-valuenow",
    "1"
  );
  await page.getByRole("link", { name: "回到草原" }).click();
  await page.locator(".character-hotspot").click();
  await expect(page.getByRole("dialog", { name: "家园养成" })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "元气状态" })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "松弛状态" })).toBeVisible();
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
  await expect(page.getByRole("button", { name: "开始摸鱼：去接补给" })).toBeVisible();
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

test("care happens in the prairie and advances the same relationship", async ({
  page
}, testInfo) => {
  await page.evaluate(() => {
    localStorage.setItem(
      "wingedhorse-local-state-v2-1",
      JSON.stringify({
        version: 5,
        state: {
          assessmentOptionSeed: "care-loop-e2e",
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
  await expect(page.getByRole("link", { name: "打开朋友圈" })).toBeVisible();
  await expect(page.getByRole("button", { name: "开始摸鱼：去接补给" })).toBeVisible();
  if (process.env.VISUAL_QA)
    await page.screenshot({
      path: `/private/tmp/wingedhorse-digital-life-home-${testInfo.project.name}.png`,
      fullPage: true
    });
  await page.locator(".character-hotspot").click();
  await expect(page.getByRole("dialog", { name: "家园养成" })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "元气状态" })).toHaveAttribute(
    "aria-valuenow",
    "40"
  );
  if (process.env.VISUAL_QA)
    await page.screenshot({
      path: `/private/tmp/wingedhorse-cultivation-sheet-${testInfo.project.name}.png`,
      fullPage: true
    });
  await page.getByRole("button", { name: /给它冰美式/ }).click();
  await expect(page.getByText(/它收下了冰美式补给/)).toBeVisible();
  const state = await page.evaluate(() => {
    const raw = localStorage.getItem("wingedhorse-local-state-v2-1") ?? "{}";
    const persisted = JSON.parse(raw) as {
      state: {
        inventory: Record<string, number>;
        relationshipXp: number;
        lifeEvents: Array<{ kind: string }>;
      };
    };
    return persisted.state;
  });
  expect(state.inventory["iced-americano"]).toBe(1);
  expect(state.relationshipXp).toBe(12);
  expect(state.lifeEvents.some((event) => event.kind === "gift")).toBe(true);
});

test("the bag recommends a real need and keeps items in a selectable grid", async ({
  page
}, testInfo) => {
  await page.evaluate(() => {
    localStorage.setItem(
      "wingedhorse-local-state-v2-1",
      JSON.stringify({
        version: 5,
        state: {
          assessmentOptionSeed: "inventory-density-e2e",
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
          inventory: {
            "iced-americano": 2,
            "nap-mask": 1,
            "steering-wheel-charm": 1,
            "main-quest-note": 1,
            "screaming-chicken": 2,
            "mad-note": 1
          },
          petVitals: { energy: 80, engine: 70, chaos: 92, direction: 70 },
          relationshipXp: 10,
          lifeEvents: []
        }
      })
    );
  });
  await page.goto("/inventory");
  await expect(page.getByRole("button", { name: "全部，6 种" })).toBeVisible();
  await expect(page.getByRole("button", { name: "恢复，2 种" })).toBeVisible();
  await expect(page.getByRole("button", { name: "行动，2 种" })).toBeVisible();
  await expect(page.getByRole("button", { name: "解压，2 种" })).toBeVisible();
  await expect(page.getByRole("button", { name: /收藏/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /牛毛/ })).toHaveCount(0);
  await expect(page.locator(".inventory-slot")).toHaveCount(6);
  await expect(page.locator(".inventory-slot__count").first()).toContainText("持有");
  await expect(page.getByRole("button", { name: "给来来使用" })).toHaveCount(0);
  if (process.env.VISUAL_QA)
    await page.screenshot({
      path: `/private/tmp/wingedhorse-inventory-compact-${testInfo.project.name}.png`,
      fullPage: true
    });
  const scrollBeforeOpen = await page.evaluate(() => window.scrollY);
  await page.getByRole("button", { name: /主线任务便签，1 件/ }).click();
  await expect(page.getByRole("dialog", { name: "主线任务便签" })).toBeVisible();
  await expect(page.getByText("行动手感 +6 · 方向感 +4")).toBeVisible();
  await expect(page.getByRole("button", { name: "给来来使用" })).toBeVisible();
  if (process.env.VISUAL_QA)
    await page.screenshot({
      path: `/private/tmp/wingedhorse-inventory-sheet-${testInfo.project.name}.png`,
      fullPage: true
    });
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBeforeOpen);
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  await page.getByRole("button", { name: "给来来使用" }).click();
  await expect(page.getByRole("dialog", { name: "主线任务便签" })).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("它收下了主线任务便签");
  await expect(page.getByText("背包还剩 0 件")).toBeVisible();
  await expect(page.getByText("行动手感 +6")).toBeVisible();
  await expect(page.getByText("方向感 +4")).toBeVisible();
  await expect(page.getByRole("link", { name: "去草原看看它" })).toBeVisible();
  if (process.env.VISUAL_QA)
    await page.screenshot({
      path: `/private/tmp/wingedhorse-inventory-use-feedback-${testInfo.project.name}.png`,
      fullPage: true
    });
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
  await page.getByRole("button", { name: "开始接补给" }).click();
  await expect(page.getByRole("button", { name: "暂停" })).toBeVisible({ timeout: 8_000 });
  await page.goto("/companion");
  await expect(page.getByRole("heading", { name: "来来" })).toBeVisible();
});

test("game intro and countdown stay inside the same prairie scene", async ({ page }, testInfo) => {
  await page.goto("/game");
  await expect(page.locator(".game-intro")).toBeVisible();
  await expect(page.locator(".game-intro__character img")).toBeVisible();
  if (process.env.VISUAL_QA)
    await page.screenshot({
      path: `/private/tmp/wingedhorse-game-intro-${testInfo.project.name}.png`,
      fullPage: true
    });

  await page.getByRole("button", { name: "开始接补给" }).click();
  await expect(page.locator(".game-countdown")).toBeVisible();
  await expect(page.locator(".game-countdown__character")).toBeVisible();
  if (process.env.VISUAL_QA)
    await page.screenshot({
      path: `/private/tmp/wingedhorse-game-countdown-${testInfo.project.name}.png`,
      fullPage: true
    });

  await expect(page.getByRole("button", { name: "暂停" })).toBeVisible({ timeout: 8_000 });
});

test("game intro fills common H5 viewport heights without an orphan title line", async ({
  page
}, testInfo) => {
  for (const viewport of [
    { width: 320, height: 568, name: "320x568" },
    { width: 375, height: 667, name: "375x667" },
    { width: 390, height: 844, name: "390x844" },
    { width: 412, height: 915, name: "412x915" },
    { width: 430, height: 932, name: "430x932" }
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/game");
    await expect(page.locator(".game-shell")).toBeVisible();
    const metrics = await page.evaluate(() => {
      const shell = document.querySelector<HTMLElement>(".game-shell")?.getBoundingClientRect();
      const title = document.querySelector<HTMLElement>(".game-intro__brief h2");
      const character = document
        .querySelector<HTMLElement>(".game-intro__character")
        ?.getBoundingClientRect();
      const dock = document
        .querySelector<HTMLElement>(".game-intro__dock")
        ?.getBoundingClientRect();
      const action = document
        .querySelector<HTMLElement>(".game-intro__actions .ui-button")
        ?.getBoundingClientRect();
      const titleStyle = title ? getComputedStyle(title) : null;
      return {
        innerHeight,
        pageHeight: document.documentElement.scrollHeight,
        shellBottom: shell?.bottom ?? 0,
        shellHeight: shell?.height ?? 0,
        titleHeight: title?.getBoundingClientRect().height ?? 0,
        titleLineHeight: titleStyle ? Number.parseFloat(titleStyle.lineHeight) : 0,
        characterBottom: character?.bottom ?? 0,
        dockTop: dock?.top ?? 0,
        dockBottom: dock?.bottom ?? 0,
        actionHeight: action?.height ?? 0,
        actionRight: action?.right ?? 0,
        dockRight: dock?.right ?? 0
      };
    });
    expect(metrics.pageHeight).toBeLessThanOrEqual(metrics.innerHeight + 1);
    expect(metrics.shellBottom).toBeGreaterThan(metrics.innerHeight - 20);
    expect(metrics.shellBottom).toBeLessThanOrEqual(metrics.innerHeight + 1);
    expect(metrics.shellHeight).toBeGreaterThan(400);
    expect(metrics.titleHeight).toBeLessThan(metrics.titleLineHeight * 1.5);
    expect(Math.abs(metrics.characterBottom - metrics.dockTop)).toBeLessThan(36);
    expect(metrics.dockBottom).toBeLessThanOrEqual(metrics.shellBottom - 8);
    expect(metrics.actionHeight).toBeGreaterThanOrEqual(44);
    expect(metrics.actionRight).toBeLessThanOrEqual(metrics.dockRight - 8);
    if (process.env.VISUAL_QA)
      await page.screenshot({
        path: `/private/tmp/wingedhorse-game-intro-${viewport.name}-${testInfo.project.name}.png`,
        fullPage: true
      });

    await page.getByRole("button", { name: "开始接补给" }).click();
    await expect(page.getByRole("button", { name: "暂停" })).toBeVisible({ timeout: 8_000 });
    const canvasMetrics = await page.locator(".drop-game-canvas canvas").evaluate((element) => {
      const canvas = element as HTMLCanvasElement;
      const bounds = canvas.getBoundingClientRect();
      return {
        ratioDelta: Math.abs(canvas.width / canvas.height - bounds.width / bounds.height),
        backingWidth: canvas.width,
        backingHeight: canvas.height,
        requiredWidth: bounds.width * window.devicePixelRatio,
        requiredHeight: bounds.height * window.devicePixelRatio,
        left: bounds.left,
        top: bounds.top,
        right: bounds.right,
        bottom: bounds.bottom,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight
      };
    });
    expect(canvasMetrics.ratioDelta).toBeLessThan(0.02);
    expect(canvasMetrics.backingWidth).toBeGreaterThanOrEqual(canvasMetrics.requiredWidth * 0.95);
    expect(canvasMetrics.backingHeight).toBeGreaterThanOrEqual(canvasMetrics.requiredHeight * 0.95);
    expect(canvasMetrics.left).toBeLessThanOrEqual(1);
    expect(canvasMetrics.top).toBeLessThanOrEqual(1);
    expect(canvasMetrics.right).toBeGreaterThanOrEqual(canvasMetrics.viewportWidth - 1);
    expect(canvasMetrics.bottom).toBeGreaterThanOrEqual(canvasMetrics.viewportHeight - 1);
    const characterHeightRatio = Number(
      await page.locator(".drop-game-canvas").getAttribute("data-character-height-ratio")
    );
    expect(characterHeightRatio).toBeGreaterThanOrEqual(0.18);
    expect(characterHeightRatio).toBeLessThanOrEqual(0.3);
    if (viewport.name === "390x844") {
      await expect(page.locator(".game-hud")).toContainText(/[1-9]\d* 件/, { timeout: 12_000 });
      const postCatchCharacterRatio = Number(
        await page.locator(".drop-game-canvas").getAttribute("data-character-height-ratio")
      );
      expect(postCatchCharacterRatio).toBeGreaterThanOrEqual(0.18);
      expect(postCatchCharacterRatio).toBeLessThanOrEqual(0.3);
    }
    if (process.env.VISUAL_QA)
      await page.screenshot({
        path: `/private/tmp/wingedhorse-game-playing-${viewport.name}-${testInfo.project.name}.png`,
        fullPage: true
      });
  }
});

test("leaving an unfinished game does not grant rewards", async ({ page }) => {
  await page.goto("/game");
  await page.getByRole("button", { name: "开始接补给" }).click();
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
  await page.getByRole("button", { name: "开始接补给" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "补给雨暂时没能打开，请检查网络后再试一次。",
    {
      timeout: 10_000
    }
  );
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
  await page.getByRole("button", { name: "开始接补给" }).click();
  await expect(page.getByRole("button", { name: "向左移动" })).toBeVisible({ timeout: 8_000 });
  await expect(page.locator(".game-hud")).toContainText(/[1-9]\d* 件/, { timeout: 12_000 });
  await expect(page.getByText("本局得分")).toBeVisible({ timeout: 35_000 });
  await expect(page.getByText(/最高 \d+ 连击/)).toBeVisible();
  await expect(page.getByLabel("本局获得物品").locator("span").first()).toBeVisible();
  await expect(page.getByRole("img", { name: "长出翅膀后的进化天马形象" })).toBeVisible();
  await expect(page.getByText(/飞升能量 \+\d+/)).toBeVisible();
  const summaryMetrics = await page.evaluate(() => {
    const header = document.querySelector<HTMLElement>(".game-page--summary .subpage-header");
    const card = document.querySelector<HTMLElement>(".game-summary");
    const headerBounds = header?.getBoundingClientRect();
    const cardBounds = card?.getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      headerBottom: headerBounds?.bottom ?? 0,
      cardTop: cardBounds?.top ?? 0
    };
  });
  expect(summaryMetrics.overflow).toBeLessThanOrEqual(1);
  expect(summaryMetrics.headerBottom).toBeLessThanOrEqual(summaryMetrics.cardTop);
  if (process.env.VISUAL_QA)
    await page.screenshot({
      path: `/private/tmp/wingedhorse-game-summary-${testInfo.project.name}.png`,
      fullPage: true
    });

  await page.getByRole("link", { name: "带着补给回草原" }).click();
  await expect(page.getByRole("button", { name: "开始摸鱼：去接补给" })).toBeVisible();
  await page.getByRole("link", { name: /打开背包，共 [1-9]\d* 件/ }).click();
  await expect(page.getByRole("heading", { name: "今天接住的东西" })).toBeVisible();
  if (process.env.VISUAL_QA)
    await page.screenshot({
      path: `/private/tmp/wingedhorse-inventory-${testInfo.project.name}.png`,
      fullPage: true
    });
  await page.locator(".inventory-slot").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "给来来使用" }).click();
  await expect(page.getByRole("status")).toContainText("收下了");

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
  await expect(page.getByText("只属于你们")).toBeVisible();
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
  await expect(page.getByText("AI 陪伴，不替代专业支持")).toBeVisible();
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
  await expect(page.getByText("疲惫的牛马 · 想和你说说话")).toBeVisible();
  await page.getByText("本次发送范围").click();
  const lifeConsent = page.getByLabel(/朋友圈、养成状态与手动心情 → 仅 WingedHorse 服务端/u);
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
  const lifeBackup = page.getByLabel("允许备份朋友圈");
  const playerCloud = page.getByLabel("尚未授权：保持本地模式");
  await expect(lifeBackup).not.toBeChecked();
  await expect(playerCloud).toBeDisabled();
  await lifeBackup.check();
  await expect(lifeBackup).toBeChecked();
  await expect(playerCloud).toBeDisabled();
  await expect(page.getByText("需要你单独同意")).toBeVisible();
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
