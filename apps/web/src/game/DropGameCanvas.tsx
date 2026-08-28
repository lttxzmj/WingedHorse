import { ITEM_CATALOG, createSeededRandom, selectDrop, type ItemId } from "@wingedhorse/domain";
import type { WingedHorseType } from "@wingedhorse/character-runtime";
import { useEffect, useRef } from "react";
import type PhaserType from "phaser";

export interface GameStats {
  score: number;
  combo: number;
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
  onStatsChange: (stats: GameStats) => void;
  onFinish: (summary: GameSummary) => void;
}

interface FallingItem {
  itemId: ItemId;
  label: PhaserType.GameObjects.Text;
  speed: number;
  points: number;
}

export function DropGameCanvas({
  sessionId,
  characterType,
  durationSeconds = 30,
  paused,
  onStatsChange,
  onFinish
}: DropGameCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<PhaserType.Game | undefined>(undefined);
  const finishRef = useRef(onFinish);
  const statsRef = useRef(onStatsChange);
  const pausedRef = useRef(paused);
  finishRef.current = onFinish;
  statsRef.current = onStatsChange;
  pausedRef.current = paused;

  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;
    if (paused) game.scene.pause("catch");
    else game.scene.resume("catch");
  }, [paused]);

  useEffect(() => {
    let game: PhaserType.Game | undefined;
    let disposed = false;

    void import("phaser").then((module) => {
      if (disposed || !hostRef.current) return;
      const Phaser = module.default;
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
          this.load.image("player-character", `/characters/types/${characterType}.webp`);
        }

        create() {
          const { width, height } = this.scale;
          this.cameras.main.setBackgroundColor("#fff8de");
          this.add.circle(width - 50, 50, 27, 0xffd057, 0.92);
          this.add.circle(52, 78, 28, 0xffffff, 0.72);
          this.add.circle(82, 78, 35, 0xffffff, 0.72);
          this.add.rectangle(width / 2, height - 30, width, 60, 0x9dce7e);

          const character = this.add.image(0, 0, "player-character").setDisplaySize(132, 132);
          character.setOrigin(0.5, 0.56);
          this.catcher = this.add.container(width / 2, height - 72, [character]);

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
        }

        private emitStats() {
          statsRef.current({
            score: this.score,
            combo: this.combo,
            remainingSeconds: this.remaining
          });
        }

        private spawnDrop(elapsed: number) {
          const drop = selectDrop(this.random);
          const x = 72 + this.random() * (this.scale.width - 144);
          const item = ITEM_CATALOG[drop.itemId];
          const label = this.add
            .text(x, -34, `${item.icon}\n${item.name}`, {
              align: "center",
              backgroundColor: item.rarity === "rare" ? "#FFE3A2" : "#FFFFFF",
              color: "#3B2E24",
              fontFamily: "PingFang SC, system-ui",
              fontSize: "12px",
              fontStyle: "bold",
              padding: { x: 8, y: 6 }
            })
            .setOrigin(0.5)
            .setStroke("#3B2E24", item.rarity === "rare" ? 1 : 0);
          const difficulty = Math.min(1.65, 1 + elapsed / 42_000);
          this.drops.push({
            itemId: drop.itemId,
            label,
            points: drop.points,
            speed: drop.speed * difficulty
          });
        }

        override update(_time: number, delta: number) {
          if (this.finished) return;
          if (this.cursors?.left.isDown || this.leftKey?.isDown)
            this.catcher.x = Phaser.Math.Clamp(this.catcher.x - delta * 0.28, 48, 342);
          if (this.cursors?.right.isDown || this.rightKey?.isDown)
            this.catcher.x = Phaser.Math.Clamp(this.catcher.x + delta * 0.28, 48, 342);

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
          const catcherTop = this.catcher.y - 55;
          this.drops = this.drops.filter((drop) => {
            drop.label.y += delta * 0.13 * drop.speed;
            const isCaught =
              drop.label.y >= catcherTop &&
              drop.label.y <= catcherTop + 70 &&
              Math.abs(drop.label.x - this.catcher.x) < 54;
            if (isCaught) {
              this.combo += 1;
              this.maxCombo = Math.max(this.maxCombo, this.combo);
              this.score += drop.points * Math.min(this.combo, 10);
              this.caught[drop.itemId] = (this.caught[drop.itemId] ?? 0) + 1;
              drop.label.destroy();
              this.cameras.main.flash(90, 255, 227, 162, false);
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
    });

    const onVisibility = () => {
      if (!game) return;
      if (document.hidden) game.scene.pause("catch");
      else if (!pausedRef.current) game.scene.resume("catch");
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      disposed = true;
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
    />
  );
}
