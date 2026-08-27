import type { QuestionSet } from "./types.js";

export const questionSetV1: QuestionSet = {
  id: "workday-bqm",
  version: "2.1.0",
  title: "你是什么牛马？",
  estimatedMinutes: 2,
  questions: [
    {
      id: "q1",
      scene: "早上起床",
      prompt: "周一早上，闹钟响到第三遍，你——",
      scored: true,
      options: [
        { id: "a", label: "闹钟没响我就醒了，还有点期待", effects: { energy: 3, engine: 1 } },
        { id: "b", label: "面无表情起床，像自动运行的程序", effects: { energy: 1, chaos: -1 } },
        { id: "c", label: "摁掉，摁掉，再摁掉，摁到最后一秒", effects: { energy: -2, chaos: 1 } },
        {
          id: "d",
          label: "想过三个请假理由，还是爬起来了",
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
        { id: "a", label: "我的播客比他精彩，真听不见", effects: { chaos: -2 } },
        { id: "b", label: "心里翻了一个巨大的白眼", effects: { chaos: -1 } },
        { id: "c", label: "用眼神给他的手机判了三年", effects: { chaos: 1 } },
        { id: "d", label: "差点站起来，理智把我按回座位", effects: { chaos: 2 } }
      ]
    },
    {
      id: "q3",
      scene: "到工位",
      prompt: "坐到工位，正式开始今天的工作，你——",
      scored: true,
      options: [
        { id: "a", label: "状态在线，坐下就开干", effects: { energy: 2, chaos: -1 } },
        { id: "b", label: "先泡杯喝的，仪式感拉满再启动", effects: { energy: 1 } },
        { id: "c", label: "活儿不算多，但就是提不起劲", effects: { energy: -1, chaos: 1 } },
        { id: "d", label: "电脑开机了，我的灵魂点了拒绝", effects: { energy: -2, chaos: 2 } }
      ]
    },
    {
      id: "q4",
      scene: "早会",
      prompt: "领导说「简单说两句」，然后讲了 40 分钟，你——",
      scored: true,
      options: [
        { id: "a", label: "认真听：一句话讲 40 分钟也是本事", effects: { chaos: -2, engine: 1 } },
        { id: "b", label: "表面记笔记，底下干自己的活儿", effects: { chaos: -1, engine: 1 } },
        { id: "c", label: "和搭子在桌下小群吐槽，表情包乱飞", effects: { chaos: 1, engine: -1 } },
        { id: "d", label: "数他说了几个「然后」，数到 47 个", effects: { chaos: 2 } }
      ]
    },
    {
      id: "q5",
      scene: "上午干活",
      prompt: "上午的工作节奏通常是——",
      scored: true,
      options: [
        { id: "a", label: "节奏我定，顺得有点不真实", effects: { engine: 3 } },
        { id: "b", label: "被活儿推着走，但握着点方向盘", effects: { engine: 1 } },
        { id: "c", label: "谁催得急就先干谁的", effects: { engine: -1 } },
        {
          id: "d",
          label: "被消息切碎，下班想不起干了啥",
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
        { id: "a", label: "下楼走两圈，晒太阳回血", effects: { energy: 3 } },
        { id: "b", label: "吃饭眯 20 分钟，像按说明书充电", effects: { energy: 1 } },
        { id: "c", label: "边吃饭边回消息，午休名存实亡", effects: { energy: -1 } },
        { id: "d", label: "吃饭像输液，吃完原地复活失败", effects: { energy: -3, chaos: 1 } }
      ]
    },
    {
      id: "q7",
      scene: "下午突袭",
      prompt: "下午三点，老板突然说「这个今晚要」，你——",
      scored: true,
      options: [
        {
          id: "a",
          label: "评估工作量，给个 realistic 交付时间",
          effects: { chaos: -2, engine: 1 }
        },
        { id: "b", label: "心里骂了一句，然后开干", effects: { chaos: 1, engine: -1 } },
        { id: "c", label: "平静打开文档，内心举行三秒葬礼", effects: { engine: -2 } },
        { id: "d", label: "先点杯奶茶压惊，仪式第一步", effects: { chaos: 2, engine: -1 } }
      ]
    },
    {
      id: "q8",
      scene: "甩锅现场",
      prompt: "隔壁组同事在群里把锅甩给了你，你——",
      scored: true,
      options: [
        { id: "a", label: "冷静贴事实，一条条发牌", effects: { chaos: -2 } },
        { id: "b", label: "私聊解决，群里留面子", effects: { chaos: -1 } },
        { id: "c", label: "和搭子吐槽半小时才平复", effects: { chaos: 1 } },
        { id: "d", label: "当场开火，今天必须分出胜负", effects: { chaos: 2, energy: -1 } }
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
          label: "想自己的事：副业、学习、健身",
          effects: { engine: 2, direction: 2 }
        },
        { id: "b", label: "想晚上吃啥，周末去哪玩", effects: { direction: 1 } },
        { id: "c", label: "什么都不想，纯放空", effects: { energy: 1 } },
        { id: "d", label: "盘点吃灰的收藏夹，再收藏一个", effects: { direction: -2, chaos: 1 } }
      ]
    },
    {
      id: "q10",
      scene: "下班点",
      prompt: "到了下班的点，活儿干完了——",
      scored: true,
      options: [
        { id: "a", label: "关机背包走人，一气呵成", effects: { engine: 3 } },
        { id: "b", label: "理一遍明天的清单再走", effects: { engine: 1 } },
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
        { id: "a", label: "还行，收个尾就撤", effects: { energy: 2, chaos: -1 } },
        { id: "b", label: "有点累，但还能跟 bug 讲道理", effects: { energy: 1 } },
        { id: "c", label: "一边干活，一边给自己开追悼会", effects: { energy: -1, chaos: 1 } },
        { id: "d", label: "谁再提需求，我就和电脑一起关机", effects: { energy: -3, chaos: 2 } }
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
          label: "今天离目标又近了一步",
          effects: { direction: 3, engine: 1 }
        },
        { id: "b", label: "复盘：哪儿不错，哪儿别再踩坑", effects: { direction: 1 } },
        { id: "c", label: "放空，让晚风吹空脑子", effects: { direction: -1 } },
        { id: "d", label: "这样的日子什么时候是个头", effects: { direction: -3, energy: -1 } }
      ]
    },
    {
      id: "q13",
      scene: "睡前刷手机",
      prompt: "睡前刷手机，你的画风是——",
      scored: true,
      options: [
        { id: "a", label: "看会儿剧或综艺，到点就睡", effects: { chaos: -2, energy: 2 } },
        { id: "b", label: "不刷了，到点直接睡，手机睡客厅", effects: { chaos: -1, energy: 1 } },
        { id: "c", label: "报复性熬夜：夜里必须属于我", effects: { chaos: 1, energy: -1 } },
        { id: "d", label: "凌晨一点搜「转行还能干什么」", effects: { chaos: 2, direction: -1 } }
      ]
    },
    {
      id: "q14",
      scene: "周日晚上",
      prompt: "周日晚上，想到明天要上班，你——",
      scored: true,
      options: [
        { id: "a", label: "有点期待，这周有想推进的事", effects: { energy: 2, direction: 2 } },
        { id: "b", label: "无感，情绪周五就已离线", effects: { direction: 1 } },
        { id: "c", label: "下午开始，心里下小雨", effects: { energy: -1 } },
        { id: "d", label: "周一还没来，我已经骂到周三了", effects: { energy: -2, chaos: 2 } }
      ]
    },
    {
      id: "q15",
      scene: "发薪日",
      prompt: "工资/结款到账的那一刻，你——",
      scored: true,
      options: [
        { id: "a", label: "开心，这是对我产出的认可", effects: { engine: 2, energy: 1 } },
        { id: "b", label: "还行，按节奏存起来", effects: { engine: 1 } },
        { id: "c", label: "毫无波澜，钱只是来出个差", effects: { engine: -1 } },
        { id: "d", label: "沉默：这就是我卖命的价钱？", effects: { engine: -2, chaos: 1 } }
      ]
    },
    {
      id: "q16",
      scene: "畅想未来",
      prompt: "想象一年后的自己，你看到的画面是——",
      scored: true,
      options: [
        { id: "a", label: "很清晰：位置、事、为什么", effects: { direction: 3 } },
        { id: "b", label: "大概有个方向，细节再说", effects: { direction: 1 } },
        { id: "c", label: "一片马赛克，不敢点高清", effects: { direction: -1 } },
        {
          id: "d",
          label: "画面里工位是空的，不知道去哪了",
          effects: { direction: -3, chaos: 1 }
        }
      ]
    },
    {
      id: "q17",
      scene: "最终幕 · 诚实坦白局",
      prompt: "关于「上班不想干了」这个念头，哪句最像你？",
      scored: false,
      options: [
        {
          id: "a",
          label: "从未产生过这种念头",
          effects: {},
          easterEgg: "牛马浓度存疑，你是不是老板派来的？要不要诚实一点再想想 😏"
        },
        { id: "b", label: "有过，但也就想想", effects: {} },
        { id: "c", label: "每周一准时发作，比打卡还准", effects: {} },
        { id: "d", label: "此刻，它正在我脑子里坐着", effects: {} }
      ]
    }
  ]
};
