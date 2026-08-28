import { ITEM_CATALOG, createSeededRandom, selectDrop, type ItemId } from "@wingedhorse/domain";
import type { WingedHorseType } from "@wingedhorse/character-runtime";
import { createElement, useEffect, useRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type PhaserType from "phaser";
import { ITEM_ICON_COMPONENTS } from "../components/ItemIcon";

export interface GameStats {
  score: number;
  combo: number;
  caughtCount: number;
  remainingSeconds: number;
}

export interface GameSummary extends GameStats {
  sessionId: string;
  maxCombo: number;
  missed: number;
  caught: Partial<Record<ItemId, number>>;
}

interface DropGameCanvasProps {
  sessionId: string;
  characterType: WingedHorseType;
  durationSeconds?: number;
  paused: boolean;
  controlDirection: -1 | 0 | 1;
  onStatsChange: (stats: GameStats) => void;
  onReady: () => void;
  onError: (message: string) => void;
  onCatch: (itemId: ItemId, points: number) => void;
  onFinish: (summary: GameSummary) => void;
}

interface FallingItem {
  itemId: ItemId;
  label: PhaserType.GameObjects.Container;
  speed: number;
  points: number;
}

export function DropGameCanvas({
  sessionId,
  characterType,
  durationSeconds = 30,
  paused,
  controlDirection,
  onStatsChange,
  onReady,
  onError,
  onCatch,
  onFinish
}: DropGameCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<PhaserType.Game | undefined>(undefined);
  const finishRef = useRef(onFinish);
  const statsRef = useRef(onStatsChange);
  const pausedRef = useRef(paused);
  const controlDirectionRef = useRef(controlDirection);
  const readyRef = useRef(onReady);
  const errorRef = useRef(onError);
  const catchRef = useRef(onCatch);
  finishRef.current = onFinish;
  statsRef.current = onStatsChange;
  pausedRef.current = paused;
  controlDirectionRef.current = controlDirection;
  readyRef.current = onReady;
  errorRef.current = onError;
  catchRef.current = onCatch;

  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;
    if (paused) game.scene.pause("catch");
    else game.scene.resume("catch");
  }, [paused]);

  useEffect(() => {
    let game: PhaserType.Game | undefined;
    let disposed = false;
    let settled = false;
    const fail = (message: string) => {
      if (disposed || settled) return;
      settled = true;
      errorRef.current(message);
    };
    const startupTimeout = window.setTimeout(() => {
      fail("补给雨没有及时打开，请再试一次。");
    }, 8_000);

    void import("phaser")
      .then((module) => {
        if (disposed || !hostRef.current) return;
        const Phaser = module.default ?? module;
        const seed = Array.from(sessionId).reduce(
          (value, character) => Math.imul(value ^ character.charCodeAt(0), 16777619),
          2166136261
        );

        class CatchScene extends Phaser.Scene {
          private catcher!: PhaserType.GameObjects.Container;
          private drops: FallingItem[] = [];
          private score = 0;
          private combo = 0;
          private maxCombo = 0;
          private missed = 0;
          private remaining = durationSeconds;
          private elapsedMs = 0;
          private nextDropInMs = 280;
          private spawnedCount = 0;
          private finished = false;
          private cursors: PhaserType.Types.Input.Keyboard.CursorKeys | undefined;
          private leftKey: PhaserType.Input.Keyboard.Key | undefined;
          private rightKey: PhaserType.Input.Keyboard.Key | undefined;
          private readonly random = createSeededRandom(seed);
          private readonly caught: Partial<Record<ItemId, number>> = {};

          constructor() {
            super({ key: "catch" });
          }

          preload() {
            this.load.image("prairie-background", "/game/prairie-drop-bg.webp");
            this.load.image("player-character", `/characters/types/${characterType}.webp`);
            Object.entries(ITEM_ICON_COMPONENTS).forEach(([itemId, Icon]) => {
              const markup = renderToStaticMarkup(
                createElement(Icon, {
                  color: "#5a481d",
                  fill: "none",
                  size: 30,
                  strokeWidth: 2.25
                })
              );
              this.load.svg(
                `item-icon-${itemId}`,
                `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`,
                { width: 30, height: 30 }
              );
            });
          }

          create() {
            const { width, height } = this.scale;
            this.cameras.main.setBackgroundColor("#e7f5fb");
            if (this.textures.exists("prairie-background")) {
              this.add
                .image(width / 2, height / 2, "prairie-background")
                .setDisplaySize(width, height);
            }

            const catcherSprite = this.textures.exists("player-character")
              ? this.add
                  .image(0, 0, "player-character")
                  .setDisplaySize(184, 184)
                  .setOrigin(0.5, 0.56)
              : this.add.circle(0, 0, 42, 0xffd057).setStrokeStyle(4, 0x3b2e24);
            this.catcher = this.add.container(width / 2, height - 94, [catcherSprite]);

            const move = (x: number) => {
              this.catcher.x = Phaser.Math.Clamp(x, 48, this.scale.width - 48);
            };
            this.input.on("pointermove", (pointer: PhaserType.Input.Pointer) => {
              if (pointer.isDown) move(pointer.x);
            });
            this.input.on("pointerdown", (pointer: PhaserType.Input.Pointer) => move(pointer.x));
            this.cursors = this.input.keyboard?.createCursorKeys();
            this.leftKey = this.input.keyboard?.addKey("A");
            this.rightKey = this.input.keyboard?.addKey("D");

            this.emitStats();
            if (!settled) {
              settled = true;
              window.clearTimeout(startupTimeout);
              readyRef.current();
            }
          }

          private emitStats() {
            statsRef.current({
              score: this.score,
              combo: this.combo,
              caughtCount: Object.values(this.caught).reduce((sum, count) => sum + (count ?? 0), 0),
              remainingSeconds: this.remaining
            });
          }

          private spawnDrop(elapsed: number) {
            const drop = selectDrop(this.random);
            const isFirstDrop = this.spawnedCount === 0;
            const x = isFirstDrop ? this.catcher.x : 72 + this.random() * (this.scale.width - 144);
            this.spawnedCount += 1;
            const item = ITEM_CATALOG[drop.itemId];
            const label = this.add.container(x, 86);
            const card = this.add.graphics();
            card.fillStyle(0x526442, 0.14);
            card.fillCircle(2, 4, 34);
            card.fillStyle(item.rarity === "rare" ? 0xffe3a2 : 0xffffff, 0.96);
            card.fillCircle(0, 0, 34);
            const glyph = this.add.image(0, -7, `item-icon-${drop.itemId}`).setDisplaySize(28, 28);
            const name = this.add
              .text(0, 17, item.name.replace("补给", ""), {
                align: "center",
                color: "#665548",
                fontFamily: "PingFang SC, system-ui",
                fontSize: "9px",
                fontStyle: "bold",
                wordWrap: { width: 58, useAdvancedWrap: true }
              })
              .setOrigin(0.5);
            label.add([card, glyph, name]);
            const difficulty = isFirstDrop ? 0.82 : Math.min(1.65, 1 + elapsed / 42_000);
            this.drops.push({
              itemId: drop.itemId,
              label,
              points: drop.points,
              speed: drop.speed * difficulty
            });
          }

          override update(_time: number, delta: number) {
            if (this.finished) return;
            const movingLeft =
              controlDirectionRef.current === -1 ||
              this.cursors?.left.isDown ||
              this.leftKey?.isDown;
            const movingRight =
              controlDirectionRef.current === 1 ||
              this.cursors?.right.isDown ||
              this.rightKey?.isDown;
            if (movingLeft)
              this.catcher.x = Phaser.Math.Clamp(
                this.catcher.x - delta * 0.31,
                48,
                this.scale.width - 48
              );
            if (movingRight)
              this.catcher.x = Phaser.Math.Clamp(
                this.catcher.x + delta * 0.31,
                48,
                this.scale.width - 48
              );

            this.elapsedMs += delta;
            this.nextDropInMs -= delta;
            const elapsed = this.elapsedMs;
            const nextRemaining = Math.max(0, Math.ceil(durationSeconds - elapsed / 1000));
            if (nextRemaining !== this.remaining) {
              this.remaining = nextRemaining;
              this.emitStats();
            }
            if (this.nextDropInMs <= 0) {
              this.spawnDrop(elapsed);
              const interval = Math.max(360, 760 - elapsed * 0.012);
              this.nextDropInMs = interval + this.random() * 180;
            }
            const catcherTop = this.catcher.y - 72;
            this.drops = this.drops.filter((drop) => {
              drop.label.y += delta * 0.13 * drop.speed;
              const isCaught =
                drop.label.y >= catcherTop &&
                drop.label.y <= catcherTop + 70 &&
                Math.abs(drop.label.x - this.catcher.x) < 68;
              if (isCaught) {
                this.combo += 1;
                this.maxCombo = Math.max(this.maxCombo, this.combo);
                this.score += drop.points * Math.min(this.combo, 10);
                this.caught[drop.itemId] = (this.caught[drop.itemId] ?? 0) + 1;
                const earnedPoints = drop.points * Math.min(this.combo, 10);
                drop.label.destroy();
                const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                if (!reduceMotion) this.cameras.main.flash(90, 255, 227, 162, false);
                const feedback = this.add
                  .text(this.catcher.x, this.catcher.y - 86, `接住 +${earnedPoints}`, {
                    color: "#3B2E24",
                    fontFamily: "PingFang SC, system-ui",
                    fontSize: "18px",
                    fontStyle: "bold"
                  })
                  .setOrigin(0.5);
                if (reduceMotion) {
                  this.time.delayedCall(420, () => feedback.destroy());
                } else {
                  this.tweens.add({
                    targets: feedback,
                    y: feedback.y - 30,
                    alpha: 0,
                    duration: 560,
                    onComplete: () => feedback.destroy()
                  });
                }
                catchRef.current(drop.itemId, earnedPoints);
                this.emitStats();
                return false;
              }
              if (drop.label.y > this.scale.height + 36) {
                this.missed += 1;
                this.combo = 0;
                drop.label.destroy();
                this.emitStats();
                return false;
              }
              return true;
            });
            if (elapsed >= durationSeconds * 1000) {
              this.finished = true;
              finishRef.current({
                sessionId,
                score: this.score,
                combo: this.combo,
                caughtCount: Object.values(this.caught).reduce(
                  (sum, count) => sum + (count ?? 0),
                  0
                ),
                maxCombo: this.maxCombo,
                missed: this.missed,
                remainingSeconds: 0,
                caught: this.caught
              });
            }
          }
        }

        game = new Phaser.Game({
          type: Phaser.CANVAS,
          parent: hostRef.current,
          width: 390,
          height: 560,
          transparent: false,
          scene: CatchScene,
          scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
        });
        gameRef.current = game;
        if (pausedRef.current) game.scene.pause("catch");
      })
      .catch(() => {
        fail("补给雨暂时没能打开，请检查网络后再试一次。");
      });

    const onVisibility = () => {
      if (!game) return;
      if (document.hidden) game.scene.pause("catch");
      else if (!pausedRef.current) game.scene.resume("catch");
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      disposed = true;
      window.clearTimeout(startupTimeout);
      document.removeEventListener("visibilitychange", onVisibility);
      game?.destroy(true);
      gameRef.current = undefined;
    };
  }, [characterType, durationSeconds, sessionId]);

  return (
    <div
      className="drop-game-canvas"
      ref={hostRef}
      role="application"
      tabIndex={0}
      onPointerDown={(event) => event.currentTarget.focus()}
      aria-label="物品掉落小游戏。拖动、方向键或 A D 键控制飞马接住物品。"
      aria-describedby="game-control-help"
    />
  );
}
