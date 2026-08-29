/** 图片只留在本机；发给来来的只有文字说明。 */
export function buildCompanionOutboundText(draft: string, hasLocalImage: boolean): string {
  const text = draft.trim();
  if (!hasLocalImage) return text;
  if (!text) return "我看了一张图，想跟你说说。（图片只在这台设备上，没有上传）";
  return `我看了一张图：${text}（图片只在这台设备上，没有上传）`;
}
