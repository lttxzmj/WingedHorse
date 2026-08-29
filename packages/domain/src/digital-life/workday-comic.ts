import { CHARACTER_NAME, PRODUCT_SLOGAN } from "../branding.js";

export interface WorkdayComicPanel {
  id: "clock-in" | "moyu" | "moment" | "clock-out";
  title: string;
  body: string;
  kaomoji: string;
}

export interface WorkdayComic {
  dateLabel: string;
  slogan: string;
  characterName: string;
  typeId: string | null;
  characterSrc: string | null;
  panels: readonly WorkdayComicPanel[];
}

export interface WorkdayComicInput {
  dateLabel: string;
  clockedIn: boolean;
  gamesPlayed: number;
  caughtCount: number;
  momentLine: string | null;
  typeId?: string | null;
}

const LINE_MAX = 8;

export function comicPunchline(value: string | null | undefined, fallback: string): string {
  const raw = value?.trim() ?? "";
  if (!raw) return fallback;
  const clause = raw.split(/[，,。！？\n]/u)[0]?.trim() || raw;
  const chars = Array.from(clause);
  const clipped = chars.slice(0, LINE_MAX).join("");
  if (!clipped) return fallback;
  return /[。！？]$/u.test(clipped) ? clipped : `${clipped}。`;
}

export function createWorkdayComic(input: WorkdayComicInput): WorkdayComic {
  const games = Math.max(0, Math.floor(input.gamesPlayed));
  const caught = Math.max(0, Math.floor(input.caughtCount));
  const typeId = input.typeId?.trim() || null;
  const characterSrc = typeId ? `/characters/types/${typeId}.webp` : null;

  return {
    dateLabel: input.dateLabel,
    slogan: PRODUCT_SLOGAN,
    characterName: CHARACTER_NAME,
    typeId,
    characterSrc,
    panels: [
      {
        id: "clock-in",
        title: "上工",
        kaomoji: "(｀・ω・´)",
        body: input.clockedIn ? "开机。" : "还没上工。"
      },
      {
        id: "moyu",
        title: "摸鱼",
        kaomoji: games > 0 ? "(✪ω✪)" : "(´-ω-｀)",
        body: games === 0 ? "没下场。" : `接住 ${caught} 件。`
      },
      {
        id: "moment",
        title: "小事",
        kaomoji: "(・ω・)",
        body: comicPunchline(input.momentLine, "风很小。")
      },
      {
        id: "clock-out",
        title: "下班",
        kaomoji: "(・ω・)ノ",
        body: "收工。"
      }
    ]
  };
}
