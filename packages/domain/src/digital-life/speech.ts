/**
 * 领域生活事件原文多用旁白「它」；角色气泡 / 朋友圈开口时转成第一人称「我」。
 */
export function toCharacterSpeech(value: string): string {
  return value
    .replaceAll("你们", "我们")
    .replaceAll("它们", "我们")
    .replaceAll("它", "我")
    .replaceAll("你和我", "我们");
}
