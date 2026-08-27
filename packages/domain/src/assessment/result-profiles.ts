import type { Dimension, HorseTypeId } from "./types.js";

export interface ResultProfile {
  id: HorseTypeId;
  name: string;
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
    tagline: "干着自己的事，也长着自己的劲。",
    observations: [
      "你愿意投入，但知道投入是为了什么。",
      "遇到临时变化时，你通常还能留住自己的节奏。",
      "你不是永远满电，只是比较会找到充电口。"
    ],
    advice: "留一个晚上给完全没产出的快乐，别让自驱悄悄变成自我催促。",
    evolution: "离长出第一根金色羽毛，已经很近了。",
    accent: "#FFD057",
    mood: "happy"
  },
  perpetual: {
    id: "perpetual",
    name: "永动疯牛",
    tagline: "战斗力拉满，脑内弹幕也没停。",
    observations: [
      "你能把想法迅速变成行动。",
      "热闹和变化会让你兴奋，也可能让你忘记刹车。",
      "别人还在开会，你已经做出了第一版。"
    ],
    advice: "今天完成一件事后，刻意停五分钟再开启下一件。",
    evolution: "学会收一点力，翅膀才有空间展开。",
    accent: "#4D8FCB",
    mood: "happy"
  },
  veteran: {
    id: "veteran",
    name: "金牌老黄牛",
    tagline: "稳稳接住了很多事，也该接住自己。",
    observations: [
      "你可靠、耐心，很少让事情掉在地上。",
      "你习惯先满足环境，再考虑自己的愿望。",
      "你的稳定不是没有情绪，而是很会把情绪放到后面。"
    ],
    advice: "这周拒绝一件本来不属于你的临时任务。",
    evolution: "把一点力气留给自己，旧蹄印会长出新路。",
    accent: "#C9A05C",
    mood: "neutral"
  },
  explosive: {
    id: "explosive",
    name: "易燃易爆牛马",
    tagline: "力气有的是，只是不想再被随便点燃。",
    observations: [
      "你对不合理的事反应很快。",
      "你能扛事，但不代表你愿意一直吞下去。",
      "你的火气里常常藏着很清楚的边界。"
    ],
    advice: "下次被临时加活时，先问清优先级和被替换掉的任务。",
    evolution: "火焰被好好使用，也能成为起飞的推力。",
    accent: "#E66C45",
    mood: "happy"
  },
  saving: {
    id: "saving",
    name: "节能牛马",
    tagline: "不是躺平，是低功耗运行。",
    observations: [
      "你知道力气有限，所以会选择把它花在哪里。",
      "你仍有自己的方向，只是暂时不想大声冲刺。",
      "安静不是停滞，也可能是在重新蓄电。"
    ],
    advice: "选一个最小动作：喝水、晒太阳或把明天第一件事写下来。",
    evolution: "低功耗也能飞，只是飞得更稳。",
    accent: "#70B77E",
    mood: "neutral"
  },
  overthinker: {
    id: "overthinker",
    name: "内耗牛马",
    tagline: "身体坐在工位，脑子已经跑了好几圈。",
    observations: [
      "你有自己的想法，也很在意能不能做好。",
      "开始之前，你可能已经预演了很多失败版本。",
      "你缺的往往不是方向，而是允许第一步不完美。"
    ],
    advice: "把今天最想推进的事缩小到十分钟能完成的版本。",
    evolution: "停止原地扇风，翅膀就会真的带你向前。",
    accent: "#C77DB7",
    mood: "neutral"
  },
  tired: {
    id: "tired",
    name: "疲惫的牛马",
    tagline: "不是没有梦想，是梦想也需要午休。",
    observations: [
      "你还能维持日常，但恢复速度正在变慢。",
      "很多事不是做不到，而是需要先多一点电。",
      "你已经坚持了一段路，不必把累解释成不够努力。"
    ],
    advice: "这周先不谈进步，挑一个晚上比平时早半小时放下手机。",
    evolution: "今天先回帐篷，休息也是飞升的一部分。",
    accent: "#8FA2B5",
    mood: "tired"
  },
  "mad-literature": {
    id: "mad-literature",
    name: "发疯文学牛马",
    tagline: "靠一点幽默，把今天安全送达。",
    observations: [
      "你可能已经很累，脑内吐槽是暂时的缓冲垫。",
      "你对荒谬特别敏感，也很会把它说得好笑。",
      "玩梗能松口气，但真正的休息也不能缺席。"
    ],
    advice: "先离开屏幕五分钟。如果最近一直很难受，试着联系一个可信任的人。",
    evolution: "被接住之后，乱飞的羽毛也会慢慢找到方向。",
    accent: "#8066A6",
    mood: "tired"
  }
};
export function getResultProfile(typeId: HorseTypeId): ResultProfile {
  return resultProfiles[typeId];
}
