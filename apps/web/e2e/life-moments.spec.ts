import { expect, test } from "@playwright/test";

const result = {
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

const lifeEvents = [
  {
    id: "life-nap",
    eventKey: "daily:blanket-nap",
    kind: "autonomous",
    occurredAt: "2026-08-28T11:35:00.000Z",
    title: "把自己卷进毯子里",
    body: "草原安静了好一阵。醒来以后，它郑重宣布休息也算今日事项。",
    typeId: "chosen",
    activity: "blanket-nap",
    source: "daily-plan",
    liked: false,
    saved: false
  },
  {
    id: "life-gift",
    eventKey: "gift:iced-americano",
    kind: "gift",
    occurredAt: "2026-08-28T08:20:00.000Z",
    title: "收到一份冰美式补给",
    body: "它没有立刻用掉，而是先朝你点了点头：被惦记到的感觉，比数值更暖一点。",
    typeId: "chosen",
    itemId: "iced-americano",
    source: "user-action",
    liked: false,
    saved: false
  },
  {
    id: "life-arrival",
    eventKey: "arrival:chosen",
    kind: "arrival",
    occurredAt: "2026-08-27T12:00:00.000Z",
    title: "新住客到达草原",
    body: "它绕着帐篷看了一圈，把这里当作暂时不用逞强的地方。",
    typeId: "chosen",
    source: "user-action",
    liked: true,
    saved: true
  }
];

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(
    ({ assessmentResult, events }) => {
      localStorage.clear();
      localStorage.setItem(
        "wingedhorse-local-state-v2-1",
        JSON.stringify({
          version: 5,
          state: {
            result: assessmentResult,
            assessmentOptionSeed: "life-moments-e2e",
            inventory: { "iced-americano": 1 },
            relationshipXp: 10,
            gamesPlayed: 1,
            lifeEvents: events,
            settledGameIds: []
          }
        })
      );
    },
    { assessmentResult: result, events: lifeEvents }
  );
  await page.goto("/life");
});

test("life feed reads like the character's private moments", async ({ page }, testInfo) => {
  await expect(page.getByRole("heading", { name: "它的朋友圈" })).toBeVisible();
  await expect(page.getByText("它不在等你打卡，只是偶尔想告诉你")).toBeVisible();
  await expect(page.getByText("醒来以后，我郑重宣布休息也算今日事项。")).toBeVisible();
  await expect(page.getByText("我没有立刻用掉，而是先朝你点了点头")).toBeVisible();
  expect(await page.locator(".life-post").count()).toBeGreaterThanOrEqual(3);

  await page.screenshot({
    path: `/private/tmp/wingedhorse-life-moments-${testInfo.project.name}.png`,
    fullPage: true
  });

  await page.locator(".life-post footer button", { hasText: "抱住这刻" }).first().click();
  await expect(page.getByText("你抱住了这一刻").first()).toBeVisible();

  await page.locator(".life-pinned-story > summary").click();
  await expect(page.getByRole("progressbar", { name: "共同远行进展" })).toBeVisible();
  await page.screenshot({
    path: `/private/tmp/wingedhorse-life-moments-expanded-${testInfo.project.name}.png`,
    fullPage: true
  });
});
