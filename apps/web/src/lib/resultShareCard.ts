import type { AssessmentResult, Dimension } from "@wingedhorse/domain";

const rows: Array<{ dimension: Dimension; label: string }> = [
  { dimension: "energy", label: "电量" },
  { dimension: "engine", label: "发动机" },
  { dimension: "chaos", label: "疯感" },
  { dimension: "direction", label: "导航仪" }
];

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

export function createResultShareCard(
  result: AssessmentResult,
  profile: { name: string; tagline: string; rarity: string }
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1440;
  const context = canvas.getContext("2d");
  if (!context) return Promise.reject(new Error("CANVAS_UNAVAILABLE"));

  context.fillStyle = "#FFF7EC";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#FFD057";
  context.beginPath();
  context.arc(540, 180, 92, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#3B2E24";
  context.textAlign = "center";
  context.font = '700 34px -apple-system, "PingFang SC", sans-serif';
  context.fillText("WINGEDHORSE · 牛马飞升", 540, 340);
  context.font = '800 82px -apple-system, "PingFang SC", sans-serif';
  context.fillText(profile.name, 540, 465);

  context.fillStyle = "#FFFFFF";
  roundedRect(context, 90, 540, 900, 620, 44);
  context.fillStyle = "#665548";
  context.font = '600 36px -apple-system, "PingFang SC", sans-serif';
  context.fillText(profile.rarity, 540, 625);

  context.textAlign = "left";
  rows.forEach(({ dimension, label }, index) => {
    const score = Math.round(result.normalizedScores[dimension]);
    const y = 735 + index * 105;
    context.fillStyle = "#3B2E24";
    context.font = '700 32px -apple-system, "PingFang SC", sans-serif';
    context.fillText(label, 155, y);
    context.textAlign = "right";
    context.fillText(String(score), 925, y);
    context.textAlign = "left";
    context.fillStyle = "#EDE3D3";
    roundedRect(context, 155, y + 28, 770, 22, 11);
    context.fillStyle = "#FFD057";
    roundedRect(context, 155, y + 28, 770 * (score / 100), 22, 11);
  });

  context.fillStyle = "#3B2E24";
  context.textAlign = "center";
  context.font = '700 34px -apple-system, "PingFang SC", sans-serif';
  context.fillText(profile.tagline.slice(0, 24), 540, 1245);
  context.fillStyle = "#8B7A6C";
  context.font = '500 26px -apple-system, "PingFang SC", sans-serif';
  context.fillText("17 幕打工日常 · 娱乐测评", 540, 1330);

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("CARD_EXPORT_FAILED"))),
      "image/png"
    )
  );
}
