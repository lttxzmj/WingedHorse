import type { AssessmentResult, Dimension } from "@wingedhorse/domain";

type ShareProfile = { name: string; tagline: string; accent: string };

const labelByDimension: Record<Dimension, string> = {
  energy: "电量",
  engine: "行动力",
  chaos: "松弛度",
  direction: "方向感"
};

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fill();
}

function loadCharacter(typeId: AssessmentResult["typeId"]): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("CHARACTER_LOAD_FAILED"));
    image.src = `/characters/types/${typeId}.webp`;
  });
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
) {
  const lines: string[] = [];
  let line = "";
  for (const character of text) {
    const candidate = line + character;
    if (context.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = character;
      if (lines.length === maxLines) break;
    } else {
      line = candidate;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && lines.join("").length < text.length) {
    const lastIndex = lines.length - 1;
    const lastLine = lines[lastIndex];
    if (lastLine !== undefined) lines[lastIndex] = `${lastLine.slice(0, -1)}…`;
  }
  return lines;
}

function getShareStory(result: AssessmentResult) {
  const scores = result.normalizedScores;
  if (scores.energy <= 42 && scores.direction >= 55)
    return {
      headline: "想去的地方没丢，先给自己回一点电。",
      focus: "下一站：留出一个真正收工的晚上",
      badge: "回血中 · 仍在前进"
    };
  if (scores.direction <= 42)
    return {
      headline: "不用现在回答远方，先往在乎的事挪一步。",
      focus: "下一站：完成一件十分钟的小事",
      badge: "找信号中 · 不必着急"
    };
  if (scores.chaos >= 65)
    return {
      headline: "锋芒不是问题，给它找个舒服的出口。",
      focus: "下一站：把想说的话说给一个人听",
      badge: "高压预警 · 先照顾自己"
    };
  return {
    headline: "节奏已经在手里，慢一点也算往前走。",
    focus: "下一站：把一点稳定留给真正喜欢的事",
    badge: "节奏在线 · 稳稳向前"
  };
}

function drawMetric(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  score: number,
  accent: string
) {
  context.fillStyle = "#FFFDF8";
  roundedRect(context, x, y, 462, 128, 28);
  context.fillStyle = "#76675A";
  context.textAlign = "left";
  context.font = '650 25px -apple-system, "PingFang SC", sans-serif';
  context.fillText(label, x + 28, y + 45);
  context.textAlign = "right";
  context.fillStyle = "#3B2E24";
  context.font = '800 38px -apple-system, "PingFang SC", sans-serif';
  context.fillText(String(score), x + 432, y + 51);
  context.fillStyle = "#EDE3D3";
  roundedRect(context, x + 28, y + 78, 406, 15, 8);
  context.fillStyle = accent;
  roundedRect(context, x + 28, y + 78, 406 * (score / 100), 15, 8);
}

export async function createResultShareCard(
  result: AssessmentResult,
  profile: ShareProfile
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1440;
  const context = canvas.getContext("2d");
  if (!context) return Promise.reject(new Error("CANVAS_UNAVAILABLE"));

  const story = getShareStory(result);
  const background = context.createLinearGradient(0, 0, 1080, 1440);
  background.addColorStop(0, "#FFF9EF");
  background.addColorStop(1, "#FFF3D8");
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = profile.accent;
  roundedRect(context, 72, 70, 936, 14, 7);
  context.fillStyle = "#75685C";
  context.textAlign = "left";
  context.font = '750 27px -apple-system, "PingFang SC", sans-serif';
  context.fillText("我的牛马类型报告", 74, 139);

  context.textAlign = "left";
  context.fillStyle = "#3B2E24";
  // Type name is the share-card headline; the card describes the user's result.
  const typeTitleSize = profile.name.length >= 6 ? 58 : profile.name.length >= 5 ? 70 : 82;
  context.font = `800 ${typeTitleSize}px -apple-system, "PingFang SC", sans-serif`;
  context.fillText(profile.name, 74, 266);
  context.fillStyle = profile.accent;
  roundedRect(context, 74, 294, 322, 58, 29);
  context.fillStyle = "#5C470F";
  context.font = '720 24px -apple-system, "PingFang SC", sans-serif';
  context.textAlign = "center";
  context.fillText(story.badge, 235, 332);
  try {
    const character = await loadCharacter(result.typeId);
    const naturalWidth = character.naturalWidth || character.width || 1;
    const naturalHeight = character.naturalHeight || character.height || 1;
    const boxX = 610;
    const boxY = 110;
    const boxW = 340;
    const boxH = 340;
    const scale = Math.min(boxW / naturalWidth, boxH / naturalHeight);
    const drawW = naturalWidth * scale;
    const drawH = naturalHeight * scale;
    const drawX = boxX + (boxW - drawW) / 2;
    const drawY = boxY + (boxH - drawH);
    context.drawImage(character, drawX, drawY, drawW, drawH);
  } catch {
    context.fillStyle = profile.accent;
    context.beginPath();
    context.arc(820, 312, 104, 0, Math.PI * 2);
    context.fill();
  }

  context.fillStyle = "#FFFDF8";
  roundedRect(context, 72, 424, 936, 368, 42);
  context.fillStyle = "#8E6A12";
  context.textAlign = "left";
  context.font = '750 25px -apple-system, "PingFang SC", sans-serif';
  context.fillText("今日状态提示", 116, 490);
  context.fillStyle = "#3B2E24";
  context.font = '800 49px -apple-system, "PingFang SC", sans-serif';
  const storyLines = wrapText(context, story.headline, 825, 2);
  storyLines.forEach((line, index) => context.fillText(line, 116, 574 + index * 66));
  context.fillStyle = "#786A5C";
  context.font = '600 27px -apple-system, "PingFang SC", sans-serif';
  const focusLines = wrapText(context, story.focus, 820, 2);
  focusLines.forEach((line, index) => context.fillText(line, 116, 706 + index * 36));

  const scores = result.normalizedScores;
  drawMetric(context, 72, 838, labelByDimension.energy, Math.round(scores.energy), profile.accent);
  drawMetric(
    context,
    546,
    838,
    labelByDimension.direction,
    Math.round(scores.direction),
    profile.accent
  );
  drawMetric(context, 72, 990, labelByDimension.engine, Math.round(scores.engine), profile.accent);
  drawMetric(context, 546, 990, labelByDimension.chaos, Math.round(scores.chaos), profile.accent);

  context.fillStyle = "#3B2E24";
  context.textAlign = "center";
  context.font = '760 31px -apple-system, "PingFang SC", sans-serif';
  const taglineLines = wrapText(context, profile.tagline, 860, 2);
  taglineLines.forEach((line, index) => context.fillText(line, 540, 1218 + index * 42));
  context.fillStyle = "#8B7A6C";
  context.font = '650 25px -apple-system, "PingFang SC", sans-serif';
  context.fillText("测测你的牛马类型", 540, 1338);

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("CARD_EXPORT_FAILED"))),
      "image/png"
    )
  );
}
