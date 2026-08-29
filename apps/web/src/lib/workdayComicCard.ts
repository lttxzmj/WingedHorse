import { CHARACTER_NAME, PRODUCT_NAME, PRODUCT_SLOGAN, type WorkdayComic } from "@wingedhorse/domain";

export async function createWorkdayComicCard(comic: WorkdayComic): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1680;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("COMIC_CANVAS_UNAVAILABLE");

  context.fillStyle = "#fffaf0";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "#3b2e24";
  context.font = "800 36px 'PingFang SC', sans-serif";
  context.fillText(PRODUCT_NAME, 72, 96);
  context.font = "800 64px 'PingFang SC', sans-serif";
  context.fillText(`${CHARACTER_NAME}的一天`, 72, 176);
  context.font = "700 32px 'PingFang SC', sans-serif";
  context.fillStyle = "#665548";
  context.fillText(comic.dateLabel, 72, 230);

  const character = await loadComicImage(comic.characterSrc);
  const stripTop = 280;
  const stripHeight = 1120;
  const panelHeight = stripHeight / 4;
  const artWidth = 320;
  const stripLeft = 72;
  const stripWidth = 936;

  context.fillStyle = "#fffdf8";
  context.fillRect(stripLeft, stripTop, stripWidth, stripHeight);
  context.strokeStyle = "#3b2e24";
  context.lineWidth = 10;
  context.strokeRect(stripLeft, stripTop, stripWidth, stripHeight);

  comic.panels.forEach((panel, index) => {
    const top = stripTop + index * panelHeight;
    if (index > 0) {
      context.beginPath();
      context.moveTo(stripLeft, top);
      context.lineTo(stripLeft + stripWidth, top);
      context.stroke();
    }

    context.fillStyle = "#fff8de";
    context.fillRect(stripLeft + 5, top + 5, artWidth - 10, panelHeight - 10);
    context.beginPath();
    context.moveTo(stripLeft + artWidth, top);
    context.lineTo(stripLeft + artWidth, top + panelHeight);
    context.stroke();

    if (character) {
      const maxW = artWidth - 48;
      const maxH = panelHeight - 48;
      const scale = Math.min(maxW / character.width, maxH / character.height);
      const drawW = character.width * scale;
      const drawH = character.height * scale;
      context.drawImage(
        character,
        stripLeft + (artWidth - drawW) / 2,
        top + (panelHeight - drawH) / 2,
        drawW,
        drawH
      );
    } else {
      context.fillStyle = "#3b2e24";
      context.font = "700 42px 'PingFang SC', sans-serif";
      context.textAlign = "center";
      context.fillText(panel.kaomoji, stripLeft + artWidth / 2, top + panelHeight / 2 + 14);
      context.textAlign = "start";
    }

    context.fillStyle = "#8b7a6c";
    context.font = "800 28px 'PingFang SC', sans-serif";
    context.fillText(panel.title, stripLeft + artWidth + 40, top + 72);
    context.fillStyle = "#3b2e24";
    context.font = "800 52px 'PingFang SC', sans-serif";
    context.fillText(panel.body, stripLeft + artWidth + 40, top + 150);
  });

  context.fillStyle = "#3b2e24";
  context.font = "800 36px 'PingFang SC', sans-serif";
  context.textAlign = "center";
  context.fillText(PRODUCT_SLOGAN, canvas.width / 2, 1540);
  context.fillStyle = "#8b7a6c";
  context.font = "650 26px 'PingFang SC', sans-serif";
  context.fillText("娱乐陪伴，不是心理或医疗产品", canvas.width / 2, 1600);
  context.textAlign = "start";

  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("COMIC_BLOB_FAILED"));
    }, "image/png");
  });
}

function loadComicImage(src: string | null): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}
