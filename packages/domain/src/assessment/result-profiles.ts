import type { Dimension, HorseTypeId } from "./types.js";

export interface ResultProfile {
  id: HorseTypeId;
  name: string;
  rarity: string;
  tagline: string;
  observations: readonly string[];
  advice: string;
  evolution: string;
  accent: string;
  mood: "neutral" | "happy" | "tired";
}
export const dimensionLabels: Record<Dimension, string> = {
  energy: "电量值",
  engine: "发动机",
  chaos: "疯感指数",
  direction: "导航仪"
};
export const resultProfiles: Record<HorseTypeId, ResultProfile> = {
  chosen: {
    id: "chosen",
    name: "天选牛马",
    rarity: "隐藏款 · 天马信号已亮",
    tagline: "你把续航、行动和松弛感放在了同一条轨道上。别急着证明什么，稳稳往前就已经很厉害。",
    observations: [
      "你的待办清单按优先级排，而且真的能划完——别人看着都气。",
      "你下班后有「生活」这种东西，还敢在朋友圈晒。",
      "你最大的烦恼是没人能分享「工作顺利」的喜悦，怕被打。"
    ],
    advice: "把你的节奏留一点给自己，也把那点稳定分给身边的人。你不用一直当那个最会扛的人。",
    evolution: "守住电量，别把天赋耗成常态。",
    accent: "#FFD057",
    mood: "happy"
  },
  perpetual: {
    id: "perpetual",
    name: "永动疯牛",
    rarity: "较少见 · 人形小钢炮",
    tagline: "你的行动力像一台正在发光的小发动机：跑得快，也知道自己想把能量用在哪里。",
    observations: [
      "你同时在推进三件事，并且真心觉得都「就差一点」。",
      "你上头的时候六亲不认，包括你自己。",
      "朋友对你的评价分两派：佩服你的，和想把你按住睡觉的。"
    ],
    advice: "给你的永动机留一段空档。停一停不是掉队，是让下一次启动更轻松。",
    evolution: "给永动机装上刹车，再给它装上翅膀。",
    accent: "#4D8FCB",
    mood: "happy"
  },
  veteran: {
    id: "veteran",
    name: "金牌老黄牛",
    rarity: "常见款 · 工位之光",
    tagline: "你的靠谱让很多事有了着落。现在也可以把一点优先级留给自己的时间和边界。",
    observations: [
      "你交的活儿从不返工，以至于大家默认你的活儿不该返工。",
      "「交给 ta 准没错」是你听过最多的表扬，也是最重的枷锁。",
      "你的疲惫只在深夜限量放送，白天概不对外。"
    ],
    advice: "本周试着让一件事停在 80 分。留白不是敷衍，是把精力还给真正重要的地方。",
    evolution: "先学会说不，再学会飞。",
    accent: "#C9A05C",
    mood: "neutral"
  },
  explosive: {
    id: "explosive",
    name: "易燃易爆牛马",
    rarity: "常见款 · 行走的高压锅",
    tagline: "你对不合理很敏锐，也有把话说出来的勇气。给这股劲找一个更舒服的出口就很好。",
    observations: [
      "你的产出和血压常年同步飙升。",
      "你在心里开过一百次离职发布会，场场爆满。",
      "怼完人你会后悔三分钟，然后想想，觉得还是该怼。"
    ],
    advice: "先给自己十秒钟和一口水，再决定怎么回应。你的锋芒值得用在真正想守住的地方。",
    evolution: "先把高压锅改成蒸汽机。",
    accent: "#E66C45",
    mood: "happy"
  },
  saving: {
    id: "saving",
    name: "节能牛马",
    rarity: "常见款 · 低功耗大师",
    tagline: "你很会保护自己的能量。低功耗不是停摆，而是在为下一件在乎的事慢慢蓄力。",
    observations: [
      "你的能量预算精确到小时，多一格都不批。",
      "你把「不着急」活成了一种生活美学。",
      "你不是摆烂，你是在等一件值得满电的事。"
    ],
    advice: "低功耗没关系。挑一件你真正在乎的小事，开一次高性能模式，就够了。",
    evolution: "低功耗不是终点，是在攒一次起飞。",
    accent: "#70B77E",
    mood: "neutral"
  },
  overthinker: {
    id: "overthinker",
    name: "内耗牛马",
    rarity: "常见款 · 脑内马拉松选手",
    tagline: "你的脑子总能看见更多可能性。把其中一个小念头落地，今天就已经有了方向。",
    observations: [
      "计划表写了一页，执行了开头，然后开了两小时的行前心理建设会。",
      "你在「我要改变」和「明天再说」之间做仰卧起坐。",
      "想卷卷不动，想躺躺不平——内耗才是最累的加班。"
    ],
    advice: "把目标切成十分钟大小，先做一个最轻的动作。你不是不行，只是不必一次想完所有答案。",
    evolution: "把脑内会议开完，就去外面跑一圈。",
    accent: "#C77DB7",
    mood: "neutral"
  },
  tired: {
    id: "tired",
    name: "疲惫的牛马",
    rarity: "大众款 · 出厂默认设置",
    tagline: "你不是没在前进，只是一路用了很多力气。先把电量照顾好，想去的地方不会消失。",
    observations: [
      "你有梦想，它只是暂时被日报和周报压在了最底层。",
      "闹钟响第三遍是你的最低开机配置。",
      "「最终版」「最终版2」「最终版终·真的」——你的文件夹就是你的挣扎史。"
    ],
    advice: "这周先不催自己变好，找一个晚上早点收工。续航回来一点，远方就会清楚一点。",
    evolution: "先回血，再谈远方。",
    accent: "#8FA2B5",
    mood: "tired"
  },
  "mad-literature": {
    id: "mad-literature",
    name: "发疯文学牛马",
    rarity: "大众款 · 排气阀常开",
    tagline: "你的幽默和表达是很好的排气阀。把委屈说出来，也是在给自己腾出一点空间。",
    observations: [
      "你的聊天记录里「哈哈哈哈哈」和「我真服了」交替出现，无缝切换。",
      "工位上的你岁月静好，手机里的你电闪雷鸣。",
      "你的崩溃很有文采，朋友们都很爱看。"
    ],
    advice: "吐槽完记得补水、放下手机一会儿。你的感受可以被接住，也值得有一个轻松的出口。",
    evolution: "排气阀保养好，也能变成推进器。",
    accent: "#8066A6",
    mood: "tired"
  }
};
export function getResultProfile(typeId: HorseTypeId): ResultProfile {
  return resultProfiles[typeId];
}
