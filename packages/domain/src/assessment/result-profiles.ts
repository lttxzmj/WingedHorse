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
    rarity: "稀有款 · 据说不到 8%",
    tagline:
      "你这种在牛马界属于传说中的 bug：电量满格，还干得开心。建议低调，容易被围观，更容易挨打。",
    observations: [
      "你的待办清单按优先级排，而且真的能划完——别人看着都气。",
      "你下班后有「生活」这种东西，还敢在朋友圈晒。",
      "你最大的烦恼是没人能分享「工作顺利」的喜悦，怕被打。"
    ],
    advice: "你不需要药。只有一个请求：离你身边的内耗牛马近一点，你的电量会传染，功德无量。",
    evolution: "守住电量，别把天赋耗成常态。",
    accent: "#FFD057",
    mood: "happy"
  },
  perpetual: {
    id: "perpetual",
    name: "永动疯牛",
    rarity: "较少见 · 人形小钢炮",
    tagline: "你的日程表连起来可以绕地球一圈。牛马界的永动机，就是偶尔会冒点烟。",
    observations: [
      "你同时在推进三件事，并且真心觉得都「就差一点」。",
      "你上头的时候六亲不认，包括你自己。",
      "朋友对你的评价分两派：佩服你的，和想把你按住睡觉的。"
    ],
    advice: "给你的永动机装个刹车：每天留一小时「合法发呆时间」，它也算正经事。",
    evolution: "给永动机装上刹车，再给它装上翅膀。",
    accent: "#4D8FCB",
    mood: "happy"
  },
  veteran: {
    id: "veteran",
    name: "金牌老黄牛",
    rarity: "常见款 · 工位之光",
    tagline: "全公司的「收到」有一半是你发的。靠谱是你的超能力，也是你的陷阱——活儿会自己找上门。",
    observations: [
      "你交的活儿从不返工，以至于大家默认你的活儿不该返工。",
      "「交给 ta 准没错」是你听过最多的表扬，也是最重的枷锁。",
      "你的疲惫只在深夜限量放送，白天概不对外。"
    ],
    advice: "本周试试把一件事做到 80 分就交。放心，天不会塌，别人根本看不出来。",
    evolution: "先学会说不，再学会飞。",
    accent: "#C9A05C",
    mood: "neutral"
  },
  explosive: {
    id: "explosive",
    name: "易燃易爆牛马",
    rarity: "常见款 · 行走的高压锅",
    tagline: "你的工作量是别人的两倍，血压也是。会议室看到你进来，会安静三秒。",
    observations: [
      "你的产出和血压常年同步飙升。",
      "你在心里开过一百次离职发布会，场场爆满。",
      "怼完人你会后悔三分钟，然后想想，觉得还是该怼。"
    ],
    advice: "发火前先去接杯水——不为冷静，主要是让水杯替你扛一扛。",
    evolution: "先把高压锅改成蒸汽机。",
    accent: "#E66C45",
    mood: "happy"
  },
  saving: {
    id: "saving",
    name: "节能牛马",
    rarity: "常见款 · 低功耗大师",
    tagline: "不是躺平，是低功耗运行——脸上带着平静，和一丝淡淡的死感。",
    observations: [
      "你的能量预算精确到小时，多一格都不批。",
      "你把「不着急」活成了一种生活美学。",
      "你不是摆烂，你是在等一件值得满电的事。"
    ],
    advice: "低功耗没问题。每周挑一件你在乎的事，开一次「高性能模式」，让它尝尝你的全力。",
    evolution: "低功耗不是终点，是在攒一次起飞。",
    accent: "#70B77E",
    mood: "neutral"
  },
  overthinker: {
    id: "overthinker",
    name: "内耗牛马",
    rarity: "常见款 · 脑内马拉松选手",
    tagline: "你的脑子是全公司最忙的部门，24 小时连轴开会，议题只有一个：「我到底行不行」。",
    observations: [
      "计划表写了一页，执行了开头，然后开了两小时的行前心理建设会。",
      "你在「我要改变」和「明天再说」之间做仰卧起坐。",
      "想卷卷不动，想躺躺不平——内耗才是最累的加班。"
    ],
    advice:
      "先公布答案：行。你只是开会太耗电了。把目标切到「不可能失败」的尺寸——今天只做 10 分钟。",
    evolution: "把脑内会议开完，就去外面跑一圈。",
    accent: "#C77DB7",
    mood: "neutral"
  },
  tired: {
    id: "tired",
    name: "疲惫的牛马",
    rarity: "大众款 · 出厂默认设置",
    tagline:
      "你的疲惫不是因为躺平——恰恰相反，是心里还装着没实现的东西。梦想还在，只是电量先顶不住了。",
    observations: [
      "你有梦想，它只是暂时被日报和周报压在了最底层。",
      "闹钟响第三遍是你的最低开机配置。",
      "「最终版」「最终版2」「最终版终·真的」——你的文件夹就是你的挣扎史。"
    ],
    advice: "这周不谈梦想，只谈续航：挑一个晚上十一点前睡。梦想不怕晚，怕的是你一直没电。",
    evolution: "先回血，再谈远方。",
    accent: "#8FA2B5",
    mood: "tired"
  },
  "mad-literature": {
    id: "mad-literature",
    name: "发疯文学牛马",
    rarity: "大众款 · 排气阀常开",
    tagline: "发疯是你的排气阀，不是故障灯。能一边崩溃一边把班上完，你比自己以为的结实多了。",
    observations: [
      "你的聊天记录里「哈哈哈哈哈」和「我真服了」交替出现，无缝切换。",
      "工位上的你岁月静好，手机里的你电闪雷鸣。",
      "你的崩溃很有文采，朋友们都很爱看。"
    ],
    advice: "发疯可以，发完记得补水。今晚早点睡——排气阀也需要保养。",
    evolution: "排气阀保养好，也能变成推进器。",
    accent: "#8066A6",
    mood: "tired"
  }
};
export function getResultProfile(typeId: HorseTypeId): ResultProfile {
  return resultProfiles[typeId];
}
