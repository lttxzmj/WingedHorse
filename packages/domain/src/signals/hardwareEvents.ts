import type { ItemId } from "../game/items.js";

export type HardwareTelemetryInput = {
  deviceId: string;
  obstacle?: boolean | undefined;
  pressure?: number | undefined;
  hasPress?: boolean | undefined;
  led1?: string | undefined;
  led2?: string | undefined;
  dht?:
    | {
        temperature?: number | null | undefined;
        humidity?: number | null | undefined;
      }
    | undefined;
  env?:
    | {
        temperatureC?: number | null | undefined;
        humidityPct?: number | null | undefined;
      }
    | undefined;
  timestamp?: number | undefined;
};

export type StressLevel = "calm" | "moderate" | "high" | "intense";

export type HardwareInteractionEvent =
  | {
      type: "boss_alert";
      title: "🚨 警戒：检测到身后有人靠近！";
      message: "速切工作模式！摸鱼状态已安全封存";
      timestamp: number;
    }
  | {
      type: "worker_presence";
      title: "🌟 感应到你来到工位啦";
      message: string;
      timestamp: number;
    }
  | {
      type: "touch_comfort";
      title: string;
      message: string;
      stressLevel: StressLevel;
      pressureValue: number;
      memoryFact: string;
      timestamp: number;
    }
  | {
      type: "climate_dry";
      title: "💧 工位干燥，来来送上润燥补水包";
      message: string;
      humidity: number;
      temperature: number | null;
      itemId: ItemId;
      memoryFact: string;
      timestamp: number;
    }
  | {
      type: "climate_hot";
      title: "🧊 工位微热，来来送上清凉补给";
      message: string;
      temperature: number;
      humidity: number | null;
      itemId: ItemId;
      memoryFact: string;
      timestamp: number;
    }
  | {
      type: "climate_cold";
      title: "☕ 工位冷气足，来来提醒保暖";
      message: string;
      temperature: number;
      humidity: number | null;
      itemId: ItemId;
      memoryFact: string;
      timestamp: number;
    }
  | {
      type: "climate_humid";
      title: "🌧️ 湿度过高，开个小窗透透气吧";
      message: string;
      humidity: number;
      temperature: number | null;
      memoryFact: string;
      timestamp: number;
    }
  | {
      type: "telemetry_sync";
      data: HardwareTelemetryInput;
      timestamp: number;
    };

/**
 * 将 FSR 压力值映射为压力等级 (0 ~ 4095)
 */
export function evaluateStressLevel(pressureValue: number): StressLevel {
  if (pressureValue > 3000) return "intense"; // 紧紧按压/狠狠捏：压力爆表，极度需要释放
  if (pressureValue > 1800) return "high"; // 较重按压：有点上火/紧绷
  if (pressureValue > 500) return "moderate"; // 中度按压：日常摸摸
  return "calm"; // 轻柔抚摸：平静安心
}

/**
 * 根据角色类型与压力等级生成定制关怀文案
 */
export function getTouchReaction(typeId: string | undefined, stress: StressLevel): string {
  switch (typeId) {
    case "explosive": // 易燃易爆牛马
      if (stress === "intense")
        return "（感受到你捏得好用力）高压锅快顶不住啦？深呼吸十秒，咱们不跟离谱需求置气！";
      if (stress === "high")
        return "（蹭蹭你的手心）谁又惹你上头了？先喝口水，我随时替你把怨气顶回去。";
      return "（乖乖贴着你）平时火急火燎的，偶尔这么温柔摸摸我，心里好暖呀～";

    case "veteran": // 金牌老黄牛
      if (stress === "intense")
        return "（轻轻靠着你）今天是不是又把所有人的活儿都扛下了？别硬撑，留 20% 力气给自己。";
      if (stress === "high")
        return "（揉揉你的指尖）靠谱是你的底色，但也允许你今天做个准点交差的凡人。";
      return "（安静陪着你）辛苦啦，工位之光。有我在，你不用时刻保持万无一失。";

    case "perpetual": // 永动疯牛
      if (stress === "intense")
        return "（按住你的手）发动机转速超标啦！先挂空挡滑行五分钟，天塌不下来！";
      if (stress === "high")
        return "（晃晃尾巴）知道你又想把三件事一起干完，但先缓缓，别把自己榨干啦。";
      return "（兴奋地蹭蹭）满电的永动机也需要加点爱意润滑油，冲呀！";

    case "saving": // 节能牛马
      if (stress === "intense")
        return "（心疼地贴贴）连低功耗大师都被逼得用力按我了…快进入极限省电模式，谁叫都不理！";
      if (stress === "high")
        return "（懒洋洋挨着你）能量槽见底了吧？今天余额不足，拒绝非必要营业。";
      return "（舒服地眯起眼）还是你懂松弛感，就这样轻轻摸摸，一起慢慢蓄电～";

    case "overthinker": // 内耗牛马
      if (stress === "intense")
        return "（抱住你的手）脑子里的马拉松又开跑了对不对？把那些假设都清空，此刻你最安全。";
      if (stress === "high")
        return "（晃了晃脑袋）不要去预演还没发生的困难，切成10分钟小目标，做完咱们就歇着。";
      return "（温顺地蹭你）不用想那么周全，做你自己就好，小马一直站在你这边。";

    case "tired": // 疲惫的牛马
      if (stress === "intense")
        return "（紧紧贴着你）好累好累对不对…没关系，靠着我歇会儿，你已经很棒了。";
      if (stress === "high") return "（抱住你的指头）日报周报都先丢一边，今晚只准对自己好一点。";
      return "（轻轻呼吸）被你抚摸的感觉真安心，愿你的电量一格一格悄悄回满。";

    case "chosen": // 天选牛马
    default:
      if (stress === "intense")
        return "（稳稳顶住你的掌心）连天选打工人都有压力大的时候，卸下铠甲，今天你不需要当英雄。";
      if (stress === "high")
        return "（轻轻蹭手）节奏稍微乱了也没关系，稳稳呼吸，你依然掌控着全局。";
      return "（开心地扬起翅膀）感受到你的鼓励啦！一起把续航和好心情拉满～";
  }
}

/**
 * 打工人专属归位迎客文案
 */
export function getWorkerPresenceMessage(typeId: string | undefined): string {
  switch (typeId) {
    case "explosive":
      return "（立正张望）你归位啦！今天谁敢甩锅，我第一个帮你怼回去！";
    case "veteran":
      return "（端正坐好）欢迎回工位！今天只做份内事，绝不随便接烂摊子～";
    case "perpetual":
      return "（兴奋扬蹄）你来啦！小发动机准备就绪，今天想先攻克哪座山头？";
    case "saving":
      return "（打个哈欠）你坐下啦？摸鱼模式已就绪，保持最低功耗优雅度过今天～";
    case "overthinker":
      return "（迎上来）你来啦！今天不用追求完美，咱们踏踏实实走每一步。";
    case "tired":
      return "（递上一杯水）你回来啦，今天也别太累着自己，想歇就歇会儿。";
    case "chosen":
    default:
      return "（竖起耳朵）感应到你回到工位啦！今天也是稳扎稳打、掌控全场的一天！";
  }
}

/**
 * 纯函数：根据硬件上报遥测数据判定业务交互事件
 */
export function deriveHardwareEvent(
  telemetry: HardwareTelemetryInput,
  currentContext?: { inGame?: boolean; horseTypeId?: string }
): HardwareInteractionEvent | null {
  const now = telemetry.timestamp ? telemetry.timestamp * 1000 : Date.now();
  const typeId = currentContext?.horseTypeId;

  // 1. 超声波感应到障碍/人员靠近
  if (telemetry.obstacle) {
    if (currentContext?.inGame) {
      return {
        type: "boss_alert",
        title: "🚨 警戒：检测到身后有人靠近！",
        message: "速切工作模式！摸鱼状态已安全封存",
        timestamp: now
      };
    }
    return {
      type: "worker_presence",
      title: "🌟 感应到你来到工位啦",
      message: getWorkerPresenceMessage(typeId),
      timestamp: now
    };
  }

  // 2. FSR 压力传感器被触摸/按压
  if (telemetry.hasPress || (telemetry.pressure && telemetry.pressure > 100)) {
    const pressureVal = telemetry.pressure ?? 500;
    const stressLevel = evaluateStressLevel(pressureVal);
    const message = getTouchReaction(typeId, stressLevel);
    const stressDesc =
      stressLevel === "intense"
        ? "狠狠捏了捏小马释放高压"
        : stressLevel === "high"
          ? "握住小马寻找支持"
          : "温柔抚摸了小马";

    return {
      type: "touch_comfort",
      title:
        stressLevel === "intense" || stressLevel === "high"
          ? "❤️ 感受到你的压力释放"
          : "❤️ 收到实体轻抚",
      message,
      stressLevel,
      pressureValue: pressureVal,
      memoryFact: `在工位${stressDesc}，来来给予了温暖回应`,
      timestamp: now
    };
  }

  // 3. DHT 温湿度传感器环境判定与补给包派生
  const temperature = telemetry.dht?.temperature ?? telemetry.env?.temperatureC ?? null;
  const humidity = telemetry.dht?.humidity ?? telemetry.env?.humidityPct ?? null;

  // 3.1 干燥判断（湿度 < 38%）-> 润燥补水包
  if (humidity !== null && humidity > 0 && humidity < 38) {
    return {
      type: "climate_dry",
      title: "💧 工位干燥，来来送上润燥补水包",
      message: `工位当前湿度只有 ${Math.round(humidity)}%，嗓子快冒烟啦！来来送上了润燥补水包，记得喝口温水润润喉～`,
      humidity: Math.round(humidity),
      temperature,
      itemId: "iced-americano",
      memoryFact: `工位微气候干燥（湿度 ${Math.round(humidity)}%），来来送上润燥补水包并提醒多喝水`,
      timestamp: now
    };
  }

  // 3.2 高温/闷热判断（温度 > 27°C 或 led1 为 blinking）-> 清凉补给包
  if ((temperature !== null && temperature > 27) || telemetry.led1 === "blinking") {
    const displayTemp = temperature ?? 28;
    return {
      type: "climate_hot",
      title: "🧊 工位微热，来来送上清凉补给",
      message: `工位温度达到了 ${displayTemp.toFixed(1)}°C，别硬扛工位闷热，来来备好了清凉饮品，放松降降温～`,
      temperature: displayTemp,
      humidity,
      itemId: "iced-americano",
      memoryFact: `工位气温偏高（${displayTemp.toFixed(1)}°C），来来送上清凉补给包`,
      timestamp: now
    };
  }

  // 3.3 极高湿度判断（湿度 > 90% 或 led2 为 breathing）-> 通风除湿提示
  if ((humidity !== null && humidity > 90) || telemetry.led2 === "breathing") {
    const displayHum = humidity ?? 92;
    return {
      type: "climate_humid",
      title: "🌧️ 湿度过高，开个小窗透透气吧",
      message: `工位当前湿度达到 ${Math.round(displayHum)}%，空气稍显闷湿，开窗或走动透透气，给大脑换点新鲜空气～`,
      humidity: Math.round(displayHum),
      temperature,
      memoryFact: `工位湿度偏高（${Math.round(displayHum)}%），来来提醒开窗透气`,
      timestamp: now
    };
  }

  // 3.4 低温冷气判断（温度 < 19°C）-> 保暖包
  if (temperature !== null && temperature < 19) {
    return {
      type: "climate_cold",
      title: "☕ 工位冷气足，来来提醒保暖",
      message: `工位温度只有 ${temperature.toFixed(1)}°C，空调吹久了容易着凉，小马提醒你搭件薄外套或喝杯热茶～`,
      temperature,
      humidity,
      itemId: "nap-mask",
      memoryFact: `工位气温偏低（${temperature.toFixed(1)}°C），来来提醒加衣保暖`,
      timestamp: now
    };
  }

  return {
    type: "telemetry_sync",
    data: telemetry,
    timestamp: now
  };
}
