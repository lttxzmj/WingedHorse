import { ITEM_CATALOG, createSeededRandom, selectDrop, type ItemId } from "@wingedhorse/domain";
import type { WingedHorseType } from "@wingedhorse/character-runtime";
import { useEffect, useRef } from "react";
import type PhaserType from "phaser";
import { ITEM_ICON_ASSETS } from "../lib/itemIconAssets";
import { GAME_CHARACTER_ASSETS } from "./gameCharacterAssets";

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
  drift: number;
  phase: number;
  rotationSpeed: number;
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
        const hostWidth = hostRef.current.clientWidth || 390;
        const hostHeight = hostRef.current.clientHeight || 560;
        const gameHeight = Phaser.Math.Clamp(Math.round((390 * hostHeight) / hostWidth), 520, 820);
        const seed = Array.from(sessionId).reduce(
          (value, character) => Math.imul(value ^ character.charCodeAt(0), 16777619),
          2166136261
        );

        class CatchScene extends Phaser.Scene {
          private catcher!: PhaserType.GameObjects.Container;
          private catcherSprite!: PhaserType.GameObjects.Image;
          private catcherShadow!: PhaserType.GameObjects.Ellipse;
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
          private targetX = 195;
          private velocityX = 0;
          private pointerActive = false;
          private catcherBaseY = 486;
          private motionClock = 0;
          private readonly random = createSeededRandom(seed);
          private readonly caught: Partial<Record<ItemId, number>> = {};

          constructor() {
            super({ key: "catch" });
          }

          preload() {
            this.load.image("prairie-background", "/game/prairie-drop-bg.webp");
            this.load.image("prairie-tent", "/scene/prairie-tent.webp");
            this.load.image("player-character", GAME_CHARACTER_ASSETS[characterType]);
            Object.entries(ITEM_ICON_ASSETS).forEach(([itemId, path]) => {
              this.load.svg(`item-icon-${itemId}`, path, { width: 30, height: 30 });
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

            if (this.textures.exists("prairie-tent")) {
              this.add
                .image(width - 54, height - 98, "prairie-tent")
                .setDisplaySize(116, 116)
                .setAlpha(0.88);
            }

            this.catcherBaseY = height - 72;
            this.catcherShadow = this.add
              .ellipse(0, 52, 96, 18, 0x496530, 0.2)
              .setScale(1, 0.72);
            this.catcherSprite = this.add.image(0, 0, "player-character").setOrigin(0.5, 0.63);
            const displayHeight = 158;
            this.catcherSprite.setDisplaySize(
              (this.catcherSprite.width / this.catcherSprite.height) * displayHeight,
              displayHeight
            );
            this.catcher = this.add.container(width / 2, this.catcherBaseY, [
              this.catcherShadow,
              this.catcherSprite
            ]);
            this.targetX = width / 2;

            const aim = (x: number) => {
              this.targetX = Phaser.Math.Clamp(x, 44, this.scale.width - 44);
            };
            this.input.on("pointermove", (pointer: PhaserType.Input.Pointer) => {
              if (pointer.isDown) aim(pointer.x);
            });
            this.input.on("pointerdown", (pointer: PhaserType.Input.Pointer) => {
              this.pointerActive = true;
              aim(pointer.x);
            });
            this.input.on("pointerup", () => {
              this.pointerActive = false;
            });
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
            const label = this.add.container(x, 128);
            const shadow = this.add.ellipse(2, 4, 56, 56, 0x3b2e24, 0.14);
            const card = this.add.graphics();
            const rare = item.rarity === "rare";
            card.fillStyle(rare ? 0xffe8a8 : 0xfffdf3, 0.98);
            card.fillRoundedRect(-29, -30, 58, 58, 18);
            card.lineStyle(rare ? 3 : 2, rare ? 0xe2a91f : 0xffffff, 0.95);
            card.strokeRoundedRect(-29, -30, 58, 58, 18);
            const glyph = this.add.image(0, -4, `item-icon-${drop.itemId}`).setDisplaySize(31, 31);
            const name = this.add
              .text(0, 20, item.name.replace("补给", ""), {
                align: "center",
                color: "#59483b",
                fontFamily: "PingFang SC, system-ui",
                fontSize: "9px",
                fontStyle: "bold",
                wordWrap: { width: 58, useAdvancedWrap: true }
              })
              .setOrigin(0.5);
            label.add([shadow, card, glyph, name]);
            label.setScale(0.72).setAlpha(0);
            this.tweens.add({
              targets: label,
              scale: 1,
              alpha: 1,
              duration: 180,
              ease: "Back.Out"
            });
            const difficulty = isFirstDrop ? 0.82 : Math.min(1.65, 1 + elapsed / 42_000);
            this.drops.push({
              itemId: drop.itemId,
              label,
              points: drop.points,
              speed: drop.speed * difficulty,
              drift: 8 + this.random() * 13,
              phase: this.random() * Math.PI * 2,
              rotationSpeed: (this.random() - 0.5) * 0.0016
            });
          }

          private showCatchFeedback(itemId: ItemId, earnedPoints: number) {
            const item = ITEM_CATALOG[itemId];
            const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            const x = this.catcher.x;
            const y = this.catcher.y - 102;
            const glow = this.add.circle(x, this.catcher.y - 28, 36, 0xffd058, 0.22);
            const panel = this.add.graphics();
            panel.fillStyle(0xfffdf5, 0.96);
            panel.fillRoundedRect(-66, -18, 132, 36, 18);
            panel.lineStyle(2, 0xffd057, 0.9);
            panel.strokeRoundedRect(-66, -18, 132, 36, 18);
            const label = this.add
              .text(0, 0, `${item.name}  +${earnedPoints}`, {
                color: "#4b3b2e",
                fontFamily: "PingFang SC, system-ui",
                fontSize: "13px",
                fontStyle: "bold"
              })
              .setOrigin(0.5);
            const feedback = this.add.container(x, y, [panel, label]);
            feedback.setScale(0.76).setAlpha(0);

            if (reduceMotion) {
              feedback.setScale(1).setAlpha(1);
              this.time.delayedCall(520, () => {
                glow.destroy();
                feedback.destroy();
              });
              return;
            }

            this.tweens.add({
              targets: glow,
              scale: 2.15,
              alpha: 0,
              duration: 360,
              ease: "Cubic.Out",
              onComplete: () => glow.destroy()
            });
            this.tweens.add({
              targets: feedback,
              scale: 1,
              alpha: 1,
              y: y - 8,
              duration: 190,
              ease: "Back.Out",
              yoyo: true,
              hold: 320,
              onComplete: () => feedback.destroy()
            });
            this.tweens.killTweensOf(this.catcherSprite);
            this.tweens.add({
              targets: this.catcherSprite,
              y: -12,
              scaleX: 1.07,
              scaleY: 0.94,
              duration: 90,
              yoyo: true,
              ease: "Quad.Out"
            });

            if (this.combo >= 2) {
              const comboText = this.add
                .text(this.scale.width / 2, 174, `${this.combo} 连击  ×${Math.min(this.combo, 10)}`, {
                  color: "#fff8de",
                  fontFamily: "PingFang SC, system-ui",
                  fontSize: "24px",
                  fontStyle: "bold",
                  stroke: "#9b6913",
                  strokeThickness: 5
                })
                .setOrigin(0.5)
                .setScale(0.68);
              this.tweens.add({
                targets: comboText,
                scale: 1,
                y: 160,
                alpha: 0,
                duration: 620,
                ease: "Back.Out",
                onComplete: () => comboText.destroy()
              });
            }
          }

          override update(_time: number, delta: number) {
            if (this.finished) return;
            this.motionClock += delta;
            const movingLeft =
              controlDirectionRef.current === -1 ||
              this.cursors?.left.isDown ||
              this.leftKey?.isDown;
            const movingRight =
              controlDirectionRef.current === 1 ||
              this.cursors?.right.isDown ||
              this.rightKey?.isDown;
            const keyboardDirection = Number(movingRight) - Number(movingLeft);
            if (keyboardDirection !== 0) {
              this.pointerActive = false;
              this.velocityX += keyboardDirection * delta * 0.0042;
            } else {
              this.velocityX *= Math.pow(0.84, delta / 16.67);
            }
            this.velocityX = Phaser.Math.Clamp(this.velocityX, -0.42, 0.42);
            if (this.pointerActive) {
              const distance = this.targetX - this.catcher.x;
              this.velocityX = Phaser.Math.Linear(this.velocityX, distance * 0.014, 0.24);
            }
            this.catcher.x = Phaser.Math.Clamp(
              this.catcher.x + this.velocityX * delta,
              44,
              this.scale.width - 44
            );
            if (!this.pointerActive && keyboardDirection !== 0) this.targetX = this.catcher.x;
            const motionStrength = Math.min(1, Math.abs(this.velocityX) / 0.32);
            this.catcher.y = this.catcherBaseY + Math.sin(this.motionClock * 0.006) * (2 + motionStrength * 2);
            this.catcherSprite.rotation = Phaser.Math.Linear(
              this.catcherSprite.rotation,
              this.velocityX * 0.12,
              0.12
            );
            this.catcherSprite.setFlipX(this.velocityX < -0.025);
            this.catcherShadow.setScale(1 - motionStrength * 0.08, 0.72);

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
            const catcherTop = this.catcher.y - 76;
            const verticalScale = this.scale.height / 560;
            this.drops = this.drops.filter((drop) => {
              drop.label.y += delta * 0.13 * drop.speed * verticalScale;
              drop.label.x += Math.sin(this.motionClock * 0.0024 + drop.phase) * drop.drift * (delta / 1000);
              drop.label.rotation += drop.rotationSpeed * delta;
              const isCaught =
                drop.label.y >= catcherTop &&
                drop.label.y <= catcherTop + 74 &&
                Math.abs(drop.label.x - this.catcher.x) < 62;
              if (isCaught) {
                this.combo += 1;
                this.maxCombo = Math.max(this.maxCombo, this.combo);
                this.score += drop.points * Math.min(this.combo, 10);
                this.caught[drop.itemId] = (this.caught[drop.itemId] ?? 0) + 1;
                const earnedPoints = drop.points * Math.min(this.combo, 10);
                const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                if (reduceMotion) {
                  drop.label.destroy();
                } else {
                  this.tweens.add({
                    targets: drop.label,
                    x: this.catcher.x,
                    y: this.catcher.y - 34,
                    scale: 0.42,
                    alpha: 0,
                    duration: 150,
                    ease: "Cubic.In",
                    onComplete: () => drop.label.destroy()
                  });
                }
                this.showCatchFeedback(drop.itemId, earnedPoints);
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
          height: gameHeight,
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
