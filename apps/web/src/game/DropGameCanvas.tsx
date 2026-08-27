import { ITEM_CATALOG, createSeededRandom, selectDrop, type ItemId } from "@wingedhorse/domain";
import { useEffect, useRef } from "react";
import type PhaserType from "phaser";

export interface GameSummary {
  score: number;
  caught: Partial<Record<ItemId, number>>;
}

interface DropGameCanvasProps {
  durationSeconds?: number;
  onFinish: (summary: GameSummary) => void;
}

interface FallingItem {
  itemId: ItemId;
  label: PhaserType.GameObjects.Text;
  speed: number;
  points: number;
}

export function DropGameCanvas({ durationSeconds = 30, onFinish }: DropGameCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  useEffect(() => {
    let game: PhaserType.Game | undefined;
    let disposed = false;

    void import("phaser").then((module) => {
      if (disposed || !hostRef.current) return;
      const Phaser = module.default;
      const seed = Date.now();

      class CatchScene extends Phaser.Scene {
        private basket!: PhaserType.GameObjects.Rectangle;
        private scoreLabel!: PhaserType.GameObjects.Text;
        private timeLabel!: PhaserType.GameObjects.Text;
        private drops: FallingItem[] = [];
        private score = 0;
        private startedAt = 0;
        private nextDropAt = 0;
        private finished = false;
        private readonly random = createSeededRandom(seed);
        private readonly caught: Partial<Record<ItemId, number>> = {};

        constructor() {
          super({ key: "catch" });
        }

        create() {
          const { width, height } = this.scale;
          this.cameras.main.setBackgroundColor("#fff8de");
          this.add.circle(width - 52, 48, 26, 0xffd057, 0.85);
          this.add.rectangle(width / 2, height - 27, width, 54, 0xbce38c);
          this.scoreLabel = this.add.text(16, 14, "得分 0", { color: "#3b2e24", fontFamily: "system-ui", fontSize: "18px", fontStyle: "bold" });
          this.timeLabel = this.add.text(width - 78, 14, `${durationSeconds}s`, { color: "#3b2e24", fontFamily: "system-ui", fontSize: "18px", fontStyle: "bold" });
          this.basket = this.add.rectangle(width / 2, height - 55, 86, 22, 0xd4a21c).setStrokeStyle(5, 0x3b2e24);
          this.add.text(width / 2, height - 58, "接住", { color: "#3b2e24", fontFamily: "system-ui", fontSize: "14px", fontStyle: "bold" }).setOrigin(0.5);
          this.input.on("pointermove", (pointer: PhaserType.Input.Pointer) => this.moveBasket(pointer.x));
          this.input.on("pointerdown", (pointer: PhaserType.Input.Pointer) => this.moveBasket(pointer.x));
          this.startedAt = this.time.now;
          this.nextDropAt = this.startedAt + 350;
        }

        private moveBasket(x: number) {
          this.basket.x = Phaser.Math.Clamp(x, 48, this.scale.width - 48);
        }

        private spawnDrop() {
          const drop = selectDrop(this.random);
          const x = 30 + this.random() * (this.scale.width - 60);
          const label = this.add.text(x, -28, ITEM_CATALOG[drop.itemId].emoji, { fontSize: "34px" }).setOrigin(0.5);
          this.drops.push({ itemId: drop.itemId, label, points: drop.points, speed: drop.speed });
        }

        override update(time: number, delta: number) {
          if (this.finished) return;
          const elapsed = time - this.startedAt;
          const remaining = Math.max(0, Math.ceil(durationSeconds - elapsed / 1000));
          this.timeLabel.setText(`${remaining}s`);
          if (time >= this.nextDropAt) {
            this.spawnDrop();
            this.nextDropAt = time + 500 + this.random() * 350;
          }
          const basketTop = this.basket.y - 18;
          this.drops = this.drops.filter((drop) => {
            drop.label.y += delta * 0.13 * drop.speed;
            const caught = drop.label.y >= basketTop && drop.label.y <= basketTop + 30 && Math.abs(drop.label.x - this.basket.x) < 52;
            if (caught) {
              this.score += drop.points;
              this.caught[drop.itemId] = (this.caught[drop.itemId] ?? 0) + 1;
              this.scoreLabel.setText(`得分 ${this.score}`);
              drop.label.destroy();
              return false;
            }
            if (drop.label.y > this.scale.height + 30) {
              drop.label.destroy();
              return false;
            }
            return true;
          });
          if (elapsed >= durationSeconds * 1000) {
            this.finished = true;
            finishRef.current({ score: this.score, caught: this.caught });
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
    });

    const onVisibility = () => {
      if (!game) return;
      if (document.hidden) game.scene.pause("catch");
      else game.scene.resume("catch");
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibility);
      game?.destroy(true);
    };
  }, [durationSeconds]);

  return <div className="drop-game-canvas" ref={hostRef} aria-label="物品掉落小游戏画面" />;
}
