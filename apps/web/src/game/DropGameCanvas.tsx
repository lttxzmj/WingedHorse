import {
  DEFAULT_SPONSORED_CAMPAIGN,
  ITEM_CATALOG,
  createSeededRandom,
  selectDrop,
  shouldSpawnSponsoredDrop,
  sponsoredDropDefinition,
  type ItemId
} from "@wingedhorse/domain";
import type { WingedHorseType } from "@wingedhorse/character-runtime";
import { useEffect, useRef } from "react";
import type PhaserType from "phaser";
import { ITEM_BRAND_IMAGE_ASSETS, ITEM_ICON_ASSETS } from "../lib/itemIconAssets";
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
  gamesPlayed?: number;
  hasReceivedSponsored?: boolean;
  durationSeconds?: number;
  paused: boolean;
  controlDirection: -1 | 0 | 1;
  onStatsChange: (stats: GameStats) => void;
  onReady: () => void;
  onError: (message: string) => void;
  onCatch: (itemId: ItemId, points: number) => void;
  onSponsoredShown?: (itemId: ItemId) => void;
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
  sponsored: boolean;
  /** Age since spawn; used for sponsored slow-then-fast fall curve. */
  fallAgeMs: number;
  /** Soft hover/showcase window before acceleration. */
  introMs: number;
  /** One-shot dive cue after the sponsored intro ends. */
  diveStarted: boolean;
  /** Resting visual scale after the entry pop (used by dive nudge). */
  restScale: number;
}

export function DropGameCanvas({
  sessionId,
  characterType,
  gamesPlayed = 0,
  hasReceivedSponsored = false,
  durationSeconds = 30,
  paused,
  controlDirection,
  onStatsChange,
  onReady,
  onError,
  onCatch,
  onSponsoredShown,
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
  const sponsoredShownRef = useRef(onSponsoredShown);
  finishRef.current = onFinish;
  statsRef.current = onStatsChange;
  pausedRef.current = paused;
  controlDirectionRef.current = controlDirection;
  readyRef.current = onReady;
  errorRef.current = onError;
  catchRef.current = onCatch;
  sponsoredShownRef.current = onSponsoredShown;

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
        const gameHeight = Math.max(480, Math.round((390 * hostHeight) / hostWidth));
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
        const renderScale = pixelRatio * (hostWidth / 390);
        const renderWidth = Math.round(390 * renderScale);
        const renderHeight = Math.round(gameHeight * renderScale);
        hostRef.current.dataset.logicalWidth = "390";
        hostRef.current.dataset.logicalHeight = String(gameHeight);
        const seed = Array.from(sessionId).reduce(
          (value, character) => Math.imul(value ^ character.charCodeAt(0), 16777619),
          2166136261
        );

        class CatchScene extends Phaser.Scene {
          private world!: PhaserType.GameObjects.Container;
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
          private nextDropInMs = 920;
          private spawnedCount = 0;
          private sponsoredSpawned = 0;
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
            this.load.image("prairie-background", "/scene/prairie-home-v2.webp");
            this.load.image("player-character", GAME_CHARACTER_ASSETS[characterType]);
            Object.entries(ITEM_ICON_ASSETS).forEach(([itemId, path]) => {
              // Item art is raster PNG for the game, not SVG source text.
              this.load.image(`item-icon-${itemId}`, path);
            });
            Object.entries(ITEM_BRAND_IMAGE_ASSETS).forEach(([itemId, path]) => {
              this.load.image(`item-brand-${itemId}`, path);
            });
          }

          create() {
            const width = 390;
            const height = gameHeight;
            this.cameras.main.setBackgroundColor("#e7f5fb");
            this.world = this.add.container(0, 0).setScale(renderScale);
            if (this.textures.exists("prairie-background")) {
              const background = this.add.image(width / 2, height / 2, "prairie-background");
              const coverScale = Math.max(width / background.width, height / background.height);
              background.setScale(coverScale);
              this.world.add(background);
            }

            this.catcherBaseY = height - 72;
            this.catcherShadow = this.add
              .ellipse(0, 52, 96, 18, 0x496530, 0.2)
              .setScale(1, 0.72);
            this.catcherSprite = this.add.image(0, 0, "player-character").setOrigin(0.5, 0.63);
            const displayHeight = 158;
            if (hostRef.current)
              hostRef.current.dataset.characterHeightRatio = String(displayHeight / height);
            this.catcherSprite.setDisplaySize(
              (this.catcherSprite.width / this.catcherSprite.height) * displayHeight,
              displayHeight
            );
            this.catcher = this.add.container(width / 2, this.catcherBaseY, [
              this.catcherShadow,
              this.catcherSprite
            ]);
            this.world.add(this.catcher);
            this.targetX = width / 2;

            const aim = (x: number) => {
              this.targetX = Phaser.Math.Clamp(x, 44, width - 44);
            };
            this.input.on("pointermove", (pointer: PhaserType.Input.Pointer) => {
              if (pointer.isDown) aim(pointer.x / renderScale);
            });
            this.input.on("pointerdown", (pointer: PhaserType.Input.Pointer) => {
              this.pointerActive = true;
              aim(pointer.x / renderScale);
            });
            this.input.on("pointerup", () => {
              this.pointerActive = false;
            });
            this.cursors = this.input.keyboard?.createCursorKeys();
            this.leftKey = this.input.keyboard?.addKey("A");
            this.rightKey = this.input.keyboard?.addKey("D");

            this.time.delayedCall(120, () => {
              if (!this.finished) this.spawnDrop(0);
            });
            this.time.delayedCall(460, () => {
              if (!this.finished) this.spawnDrop(0);
            });
            this.time.delayedCall(800, () => {
              if (!this.finished) this.spawnDrop(0);
            });

            this.emitStats();
            if (pausedRef.current) this.scene.pause();
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
            const forceSponsored = shouldSpawnSponsoredDrop({
              gamesPlayed,
              spawnedCount: this.spawnedCount,
              sponsoredSpawned: this.sponsoredSpawned,
              random: this.random,
              hasReceivedSponsored
            });
            const drop = forceSponsored ? sponsoredDropDefinition() : selectDrop(this.random);
            const isFirstDrop = this.spawnedCount === 0;
            const item = ITEM_CATALOG[drop.itemId];
            const isSponsored = Boolean(item.sponsored);
            // Sponsored boxes offset from the catcher so the slow showcase is readable
            // before the dive; ordinary first drops still land on the player for onboarding.
            const x = isSponsored
              ? Phaser.Math.Clamp(
                  this.catcher.x + (this.random() > 0.5 ? 1 : -1) * (52 + this.random() * 64),
                  72,
                  318
                )
              : isFirstDrop
                ? this.catcher.x
                : 72 + this.random() * (390 - 144);
            this.spawnedCount += 1;
            const brandTexture = `item-brand-${drop.itemId}`;
            const iconTexture =
              isSponsored && this.textures.exists(brandTexture)
                ? brandTexture
                : `item-icon-${drop.itemId}`;
            if (isSponsored) {
              this.sponsoredSpawned += 1;
              sponsoredShownRef.current?.(drop.itemId);
            }
            const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            const rare = item.rarity === "rare";
            const uncommon = item.rarity === "uncommon";
            // Sponsored starts a bit higher for the soft showcase beat — size stays near ordinary.
            const spawnY = isSponsored ? 96 : 128;
            const label = this.add.container(x, spawnY);
            // Visual tiers: common < uncommon < rare; sponsored ≈ 1.2× common, told apart by blue halo + tag.
            const box = isSponsored
              ? { w: 78, h: 84, r: 22 }
              : rare
                ? { w: 70, h: 74, r: 20 }
                : { w: 64, h: 68, r: 19 };
            const shadow = this.add.ellipse(
              2,
              5,
              isSponsored ? 66 : rare ? 62 : 58,
              isSponsored ? 68 : rare ? 64 : 58,
              0x3b2e24,
              rare || isSponsored ? 0.16 : 0.12
            );
            const card = this.add.graphics();
            const kindPalette = {
              "energy-supply": { surface: 0xfff2c8, icon: 0xd88d20 },
              "engine-tool": { surface: 0xe8f2d4, icon: 0x5f8338 },
              "pressure-release": { surface: 0xffe4dc, icon: 0xc96655 },
              navigation: { surface: 0xdfeefe, icon: 0x4d79a8 },
              decoration: { surface: 0xeee7ff, icon: 0x7863a7 },
              "sponsored-supply": { surface: 0xe5f2ff, icon: 0x1768b3 }
            }[item.kind];

            // Per-tier aura: sponsored = soft static blue; rare = faint gold; common = none.
            // Brand rules: no continuous pulse — only a one-shot entry flash below.
            let aura: PhaserType.GameObjects.Arc | undefined;
            if (isSponsored) {
              aura = this.add.circle(0, 0, 52, 0x3b83c9, reduceMotion ? 0.1 : 0.18);
              label.add(aura);
            } else if (rare) {
              aura = this.add.circle(0, 0, 44, 0xe2a91f, reduceMotion ? 0.06 : 0.12);
              label.add(aura);
            }

            card.fillStyle(
              isSponsored ? 0xf5faff : rare ? 0xfff7dc : uncommon ? 0xfffaf0 : 0xfffdf5,
              0.98
            );
            card.fillRoundedRect(-box.w / 2, -box.h / 2, box.w, box.h, box.r);
            card.lineStyle(
              isSponsored ? 3.5 : rare ? 2.75 : uncommon ? 2.25 : 2,
              isSponsored ? 0x3b83c9 : rare ? 0xe2a91f : uncommon ? 0xf0d48a : 0xffffff,
              0.98
            );
            card.strokeRoundedRect(-box.w / 2, -box.h / 2, box.w, box.h, box.r);
            const iconPlate = this.add.circle(
              0,
              -8,
              isSponsored ? 22 : rare ? 21 : 20,
              kindPalette.surface,
              1
            );
            // Sponsored drop uses the logo mark (wide wordmark); keep native colors.
            const glyph = this.add
              .image(0, isSponsored ? -6 : -8, iconTexture)
              .setTint(isSponsored && iconTexture === brandTexture ? 0xffffff : kindPalette.icon)
              .setDisplaySize(
                isSponsored ? 52 : rare ? 34 : 31,
                isSponsored ? 28 : rare ? 34 : 31
              );
            const partnerTag = isSponsored
              ? this.add
                  .text(0, -34, "品牌合作", {
                    color: "#1768b3",
                    fontFamily: "PingFang SC, system-ui",
                    fontSize: "9px",
                    fontStyle: "bold"
                  })
                  .setOrigin(0.5)
              : null;
            // Product code from pillow asset only — logo already carries 蓝盒子 / BLUE BOX.
            const name = this.add
              .text(
                0,
                isSponsored ? 28 : rare ? 26 : 24,
                isSponsored
                  ? DEFAULT_SPONSORED_CAMPAIGN.productCode
                  : item.name.replace("补给", ""),
                {
                  align: "center",
                  color: isSponsored ? "#175b99" : rare ? "#7a5a12" : "#59483b",
                  fontFamily: "PingFang SC, system-ui",
                  fontSize: isSponsored ? "11px" : rare ? "9.5px" : "9px",
                  fontStyle: "bold",
                  wordWrap: { width: isSponsored ? 70 : 60, useAdvancedWrap: true }
                }
              )
              .setOrigin(0.5);
            label.add([shadow, card, iconPlate, glyph, ...(partnerTag ? [partnerTag] : []), name]);

            // Rare: one-shot spark dust (not on sponsored / common — keep tiers distinct).
            if (rare && !reduceMotion) {
              for (let i = 0; i < 3; i += 1) {
                const spark = this.add.circle(
                  (this.random() - 0.5) * 36,
                  -18 - this.random() * 22,
                  2 + this.random() * 1.5,
                  0xffd057,
                  0.85
                );
                label.add(spark);
                this.tweens.add({
                  targets: spark,
                  y: spark.y - 18,
                  alpha: 0,
                  scale: 0.2,
                  duration: 420 + this.random() * 180,
                  delay: i * 40,
                  ease: "Cubic.Out",
                  onComplete: () => spark.destroy()
                });
              }
            }

            this.world.add(label);

            // Entry motion differs by tier so drops don't feel copy-pasted.
            const restScale = isSponsored ? (reduceMotion ? 1.12 : 1.2) : rare ? 1.06 : 1;
            label.setScale(isSponsored ? 0.7 : rare ? 0.62 : 0.72).setAlpha(0);
            this.tweens.add({
              targets: label,
              scale: restScale,
              alpha: 1,
              duration: isSponsored ? (reduceMotion ? 140 : 280) : rare ? 240 : 180,
              ease: isSponsored || rare ? "Back.Out" : "Cubic.Out"
            });
            if (aura && !reduceMotion) {
              const settleAlpha = isSponsored ? 0.14 : 0.09;
              aura.setAlpha(isSponsored ? 0.32 : 0.22);
              this.tweens.add({
                targets: aura,
                alpha: settleAlpha,
                duration: isSponsored ? 360 : 300,
                ease: "Sine.Out"
              });
            }

            const difficulty = isFirstDrop ? 0.82 : Math.min(1.65, 1 + elapsed / 42_000);
            const sponsoredBaseSpeed = drop.speed * (isFirstDrop ? 0.72 : 0.88);
            this.drops.push({
              itemId: drop.itemId,
              label,
              points: drop.points,
              speed: isSponsored
                ? sponsoredBaseSpeed
                : rare
                  ? drop.speed * difficulty * 0.92
                  : drop.speed * difficulty,
              drift: isSponsored
                ? 7 + this.random() * 7
                : rare
                  ? 5 + this.random() * 8
                  : 8 + this.random() * 13,
              phase: this.random() * Math.PI * 2,
              rotationSpeed: isSponsored
                ? (this.random() - 0.5) * 0.0009
                : rare
                  ? (this.random() - 0.5) * 0.001
                  : (this.random() - 0.5) * 0.0016,
              sponsored: isSponsored,
              fallAgeMs: 0,
              // Shorter showcase now that the box is only slightly larger.
              introMs: isSponsored ? (reduceMotion ? 0 : 560) : 0,
              diveStarted: false,
              restScale
            });
          }

          private showCatchFeedback(itemId: ItemId, earnedPoints: number) {
            const item = ITEM_CATALOG[itemId];
            const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            const x = this.catcher.x;
            const y = this.catcher.y - 102;
            const catchGlowColor = item.sponsored ? 0x3b83c9 : item.rarity === "rare" ? 0xe2a91f : 0xffd058;
            const glow = this.add.circle(
              x,
              this.catcher.y - 28,
              item.sponsored || item.rarity === "rare" ? 40 : 34,
              catchGlowColor,
              item.sponsored ? 0.2 : 0.22
            );
            const panel = this.add.graphics();
            panel.fillStyle(0xfffdf5, 0.96);
            panel.fillRoundedRect(-66, -18, 132, 36, 18);
            panel.lineStyle(2, 0xffd057, 0.9);
            panel.strokeRoundedRect(-66, -18, 132, 36, 18);
            const label = this.add
              .text(0, 0, item.sponsored ? `+${earnedPoints}` : `${item.name}  +${earnedPoints}`, {
                color: "#4b3b2e",
                fontFamily: "PingFang SC, system-ui",
                fontSize: item.sponsored ? "18px" : "13px",
                fontStyle: "bold"
              })
              .setOrigin(0.5);
            const feedback = this.add.container(x, y, [panel, label]);
            this.world.add([glow, feedback]);
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
              angle: this.velocityX >= 0 ? 3 : -3,
              duration: 90,
              yoyo: true,
              ease: "Quad.Out"
            });

            if (this.combo >= 2) {
              const comboText = this.add
                .text(390 / 2, 174, `${this.combo} 连击  ×${Math.min(this.combo, 10)}`, {
                  color: "#fff8de",
                  fontFamily: "PingFang SC, system-ui",
                  fontSize: "24px",
                  fontStyle: "bold",
                  stroke: "#9b6913",
                  strokeThickness: 5
                })
                .setOrigin(0.5)
                .setScale(0.68);
              this.world.add(comboText);
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
              390 - 44
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
            if (hostRef.current) {
              hostRef.current.dataset.characterHeightRatio = String(
                this.catcherSprite.displayHeight / gameHeight
              );
            }

            if (pausedRef.current) return;

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
            const verticalScale = gameHeight / 560;
            this.drops = this.drops.filter((drop) => {
              drop.fallAgeMs += delta;
              let fallFactor = 1;
              let swayBoost = 1;
              if (drop.sponsored && drop.introMs > 0) {
                if (drop.fallAgeMs < drop.introMs) {
                  // Brief soft float so the blue halo reads, then accelerate.
                  const t = drop.fallAgeMs / drop.introMs;
                  fallFactor = 0.28 + t * 0.28;
                  swayBoost = 1.35;
                } else {
                  if (!drop.diveStarted) {
                    drop.diveStarted = true;
                    drop.rotationSpeed *= 1.8;
                    drop.label.rotation += (this.random() > 0.5 ? 1 : -1) * 0.1;
                  }
                  const after = drop.fallAgeMs - drop.introMs;
                  fallFactor = Math.min(2.4, 1.1 + after / 720);
                  swayBoost = 0.7;
                }
              }
              drop.label.y += delta * 0.13 * drop.speed * verticalScale * fallFactor;
              drop.label.x +=
                Math.sin(this.motionClock * 0.0024 + drop.phase) * drop.drift * swayBoost * (delta / 1000);
              drop.label.rotation += drop.rotationSpeed * delta;
              const catchHalfWidth = drop.sponsored ? 72 : 62;
              const catchDepth = drop.sponsored ? 82 : 74;
              const isCaught =
                drop.label.y >= catcherTop &&
                drop.label.y <= catcherTop + catchDepth &&
                Math.abs(drop.label.x - this.catcher.x) < catchHalfWidth;
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
              if (drop.label.y > gameHeight + 36) {
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
          width: renderWidth,
          height: renderHeight,
          render: { antialias: true, roundPixels: false, pixelArt: false },
          transparent: false,
          scene: CatchScene,
          // The renderer uses a DPR-sized backing store while the camera keeps
          // gameplay in the stable 390-wide logical coordinate system.
          scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH
          }
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
  }, [characterType, durationSeconds, gamesPlayed, hasReceivedSponsored, sessionId]);

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
