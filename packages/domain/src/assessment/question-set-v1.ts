import type { QuestionSet } from "./types.js";

export const questionSetV1: QuestionSet = {
  id: "workday-bqm",
  version: "1.0.0",
  title: "你是什么牛马？",
  estimatedMinutes: 2,
  questions: [
    {
      id: "q1",
      scene: "早上起床",
      prompt: "周一早上，闹钟响到第三遍，你——",
      scored: true,
      options: [
        { id: "a", label: "闹钟没响我就醒了，甚至有点期待今天", effects: { energy: 3, engine: 1 } },
        { id: "b", label: "赖五分钟，正常爬起", effects: { energy: 1 } },
        { id: "c", label: "闭着眼摸手机，先刷十分钟缓冲一下", effects: { energy: -1 } },
        {
          id: "d",
          label: "脑子里过了一遍三个请假理由，身体还是起来了",
          effects: { energy: -3, engine: -1 }
        }
      ]
    },
    {
      id: "q2",
      scene: "通勤路上",
      prompt: "地铁上有人外放短视频，声音巨大，你——",
      scored: true,
      options: [
        { id: "a", label: "戴上耳机，世界与我无关", effects: { chaos: -2 } },
        { id: "b", label: "心里翻了个白眼，继续刷自己的手机", effects: { chaos: -1 } },
        { id: "c", label: "火气上来了，已经在心里写了一篇小作文", effects: { chaos: 1 } },
        { id: "d", label: "脑中开始演练三种交涉话术，差点真的开口", effects: { chaos: 2 } }
      ]
    },
    {
      id: "q3",
      scene: "到工位",
      prompt: "打开电脑，看到 99+ 条未读消息，你的第一反应是——",
      scored: true,
      options: [
        { id: "a", label: "按优先级分拣，一条条来", effects: { energy: 2, chaos: -1 } },
        { id: "b", label: "深吸一口气，先回最急的三条", effects: { energy: 1 } },
        { id: "c", label: "先去接杯水，做五分钟心理建设", effects: { chaos: 1 } },
        { id: "d", label: "盯着屏幕发呆，感觉灵魂先下班了", effects: { energy: -2, chaos: 2 } }
      ]
    },
    {
      id: "q4",
      scene: "早会",
      prompt: "领导说“我简单说两句”，然后讲了 40 分钟，你——",
      scored: true,
      options: [
        { id: "a", label: "认真听，还真记了两条有用的", effects: { chaos: -2, engine: 1 } },
        { id: "b", label: "表面点头，脑子在规划午饭", effects: { chaos: -1, engine: -1 } },
        { id: "c", label: "在笔记本上把“两句”两个字圈了又圈", effects: { chaos: 1 } },
        { id: "d", label: "开始数他说了几个“然后”，数到 47 个", effects: { chaos: 2 } }
      ]
    },
    {
      id: "q5",
      scene: "上午干活",
      prompt: "上午的工作节奏通常是——",
      scored: true,
      options: [
        { id: "a", label: "我自己排的优先级，干得很顺", effects: { engine: 3 } },
        { id: "b", label: "活儿推着走，但能找到一点掌控感", effects: { engine: 1 } },
        { id: "c", label: "谁催得急就先干谁的", effects: { engine: -1 } },
        {
          id: "d",
          label: "被消息和会议切碎，一天下来不知道干了啥",
          effects: { engine: -3, chaos: 1 }
        }
      ]
    },
    {
      id: "q6",
      scene: "午休",
      prompt: "午休时间你一般——",
      scored: true,
      options: [
        { id: "a", label: "出去溜达或健身，下午满血复活", effects: { energy: 3 } },
        { id: "b", label: "安静吃饭，小睡 20 分钟", effects: { energy: 1 } },
        { id: "c", label: "边吃外卖边回消息，午休名存实亡", effects: { energy: -1 } },
        { id: "d", label: "趴在工位上，像一块正在充电的废电池", effects: { energy: -3 } }
      ]
    },
    {
      id: "q7",
      scene: "下午突袭",
      prompt: "下午三点，老板突然说“这个今晚要”，你——",
      scored: true,
      options: [
        { id: "a", label: "评估工作量，给出合理的交付时间", effects: { chaos: -2, engine: 1 } },
        { id: "b", label: "心里骂了一句，然后开干", effects: { chaos: 1, engine: -1 } },
        { id: "c", label: "默默打开文档，认命", effects: { engine: -2 } },
        { id: "d", label: "先点一杯奶茶压惊，这是仪式的第一步", effects: { chaos: 2, engine: -1 } }
      ]
    },
    {
      id: "q8",
      scene: "甩锅现场",
      prompt: "隔壁组同事在群里把锅甩给了你，你——",
      scored: true,
      options: [
        { id: "a", label: "就事论事，一条一条把事实贴回去", effects: { chaos: -2 } },
        { id: "b", label: "私聊解决，群里给彼此留面子", effects: { chaos: -1 } },
        { id: "c", label: "火气上来，和搭子吐槽半小时才平复", effects: { chaos: 1 } },
        { id: "d", label: "当晚的运动量来自在脑子里和对方吵架", effects: { chaos: 2, energy: -1 } }
      ]
    },
    {
      id: "q9",
      scene: "摸鱼时刻",
      prompt: "摸鱼的时候，你通常在想——",
      scored: true,
      options: [
        {
          id: "a",
          label: "自己的事：副业、学习计划、健身安排",
          effects: { engine: 2, direction: 2 }
        },
        { id: "b", label: "晚上吃啥，周末去哪玩", effects: { direction: 1 } },
        { id: "c", label: "什么都不想，纯放空回血", effects: { energy: 1 } },
        { id: "d", label: "“我到底在干什么”的哲学问题", effects: { direction: -2, chaos: 1 } }
      ]
    },
    {
      id: "q10",
      scene: "下班点",
      prompt: "到了下班点，活儿干完了，但办公室没人走，你——",
      scored: true,
      options: [
        { id: "a", label: "直接走，我的时间我做主", effects: { engine: 3 } },
        { id: "b", label: "收拾得慢一点，观察一下再溜", effects: { engine: -1 } },
        { id: "c", label: "再坐半小时，刷刷存在感", effects: { engine: -2 } },
        { id: "d", label: "等领导走了我再走，熟练得让人心疼", effects: { engine: -3, chaos: 1 } }
      ]
    },
    {
      id: "q11",
      scene: "加班",
      prompt: "加班到晚上九点，你的状态是——",
      scored: true,
      options: [
        { id: "a", label: "还行，收尾完这件事我就撤", effects: { energy: 2 } },
        { id: "b", label: "有点累，但还能撑住", effects: { energy: 1 } },
        { id: "c", label: "靠咖啡和外卖吊着一口气", effects: { energy: -1 } },
        { id: "d", label: "已经进入“人还在、魂没了”的贤者模式", effects: { energy: -3, chaos: 1 } }
      ]
    },
    {
      id: "q12",
      scene: "深夜回家",
      prompt: "深夜回家的路上，你脑子里最常出现的是——",
      scored: true,
      options: [
        {
          id: "a",
          label: "今天推进了什么，离目标又近了一步",
          effects: { direction: 3, engine: 1 }
        },
        { id: "b", label: "明天要干的活儿清单", effects: { direction: 1 } },
        { id: "c", label: "什么都不想，放空", effects: { direction: -1 } },
        { id: "d", label: "“这样的日子什么时候是个头”", effects: { direction: -3, energy: -1 } }
      ]
    },
    {
      id: "q13",
      scene: "睡前刷手机",
      prompt: "睡前刷手机，你的画风是——",
      scored: true,
      options: [
        { id: "a", label: "看会儿书或长视频，按时睡觉", effects: { chaos: -2, energy: 2 } },
        { id: "b", label: "刷刷就睡了，正常", effects: { energy: 1 } },
        { id: "c", label: "越刷越精神，报复性熬夜", effects: { chaos: 1, energy: -1 } },
        { id: "d", label: "凌晨一点突然搜索“转行还能干什么”", effects: { chaos: 2, direction: -1 } }
      ]
    },
    {
      id: "q14",
      scene: "周日晚上",
      prompt: "周日晚上，想到明天要上班，你——",
      scored: true,
      options: [
        { id: "a", label: "有点期待，这周有我想推进的事", effects: { energy: 2, direction: 2 } },
        { id: "b", label: "无感，上班而已", effects: { direction: 1 } },
        { id: "c", label: "从下午开始就有点低落", effects: { energy: -1 } },
        { id: "d", label: "感觉周末被偷走了，陷入存在主义危机", effects: { energy: -2, chaos: 1 } }
      ]
    },
    {
      id: "q15",
      scene: "发薪日",
      prompt: "发工资那天，你的真实感受是——",
      scored: true,
      options: [
        { id: "a", label: "开心，这是对我产出的认可", effects: { engine: 2, energy: 1 } },
        { id: "b", label: "还行，按节奏存起来", effects: { engine: 1 } },
        { id: "c", label: "无感，数字过账而已", effects: { engine: -1 } },
        { id: "d", label: "看着数字沉默：这就是我卖力的价格？", effects: { engine: -2, chaos: 1 } }
      ]
    },
    {
      id: "q16",
      scene: "畅想未来",
      prompt: "想象一年后的自己，你看到的画面是——",
      scored: true,
      options: [
        { id: "a", label: "很清晰：在哪个位置、在做什么、为什么", effects: { direction: 3 } },
        { id: "b", label: "大概有个方向，细节再说", effects: { direction: 1 } },
        { id: "c", label: "一片模糊，不敢想", effects: { direction: -1 } },
        {
          id: "d",
          label: "画面里工位是空的，我也不知道我去哪了",
          effects: { direction: -3, chaos: 1 }
        }
      ]
    },
    {
      id: "q17",
      scene: "诚实坦白局",
      prompt: "以下哪句最像你？",
      scored: false,
      options: [
        {
          id: "a",
          label: "我上班从未产生过“不想干了”的念头",
          effects: {},
          easterEgg: "牛马浓度存疑，你是不是老板派来的？要不要诚实一点再想想 😏"
        },
        { id: "b", label: "我有过，但也就想想", effects: {} },
        { id: "c", label: "这个念头是我的通勤搭子", effects: {} },
        { id: "d", label: "我此刻就在想", effects: {} }
      ]
    }
  ]
};
