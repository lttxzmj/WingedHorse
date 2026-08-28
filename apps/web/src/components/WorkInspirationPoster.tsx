import { useState, useEffect } from "react";
import { Sparkles, Compass, ShieldCheck, Sun, Zap, Coffee, Clock } from "lucide-react";
import { AppIcon } from "./AppIcon";
import { useAppStore } from "../store/useAppStore";
import { getResultProfile } from "@wingedhorse/domain";
import "./work-inspiration-poster.css";

const WALLPAPERS = [
  {
    theme: "gold",
    tagline: "掌控节奏 · 稳步推进",
    title: "把节奏掌握在自己手里",
    sub: "今天也是稳扎稳打、按部就班赢下的一天。",
    principles: [
      "核心事项优先级排定，不为无谓的杂音消耗心力",
      "先完成，后完美：80分的高效推进远胜空想",
      "稳住专注与呼吸，每一个当下都在积累势能"
    ],
    status: "深度专注中 · 请勿打扰"
  },
  {
    theme: "sunrise",
    tagline: "蓄力生长 · 自在发光",
    title: "每一个认真的当下\n都在为下一次起飞积蓄翅膀",
    sub: "不用和别人的时区比较，你始终在自己的轨道上全速前进。",
    principles: [
      "今日核心目标有序推进中",
      "拆解复杂问题，专注聚焦在眼前最重要的这一步",
      "把你的聪明才智，毫无保留地投入到真正的创造里"
    ],
    status: "高能产出中 · 阶段冲刺"
  },
  {
    theme: "calm",
    tagline: "清醒克制 · 极致效率",
    title: "保持清醒，保持专注\n把要做的事一件一件做漂亮",
    sub: "用确定性的行动，消解一切不确定性的迷茫。",
    principles: [
      "直奔核心交付结果，拒绝低效反复",
      "以 25 分钟为刻度，沉浸在心流的高光时刻",
      "从容不迫，做自己工位上最有掌控力的主人"
    ],
    status: "专注攻坚中 · 信号在线"
  }
];

export function WorkInspirationPoster({ onClose }: { onClose: () => void }) {
  const result = useAppStore((state) => state.result);
  const profile = result ? getResultProfile(result.typeId) : null;

  const [time, setTime] = useState(() => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  });

  const [dateStr] = useState(() => {
    const d = new Date();
    return `${d.getMonth() + 1}月${d.getDate()}日 星期${["日", "一", "二", "三", "四", "五", "六"][d.getDay()]}`;
  });

  const [index, setIndex] = useState(() => Math.floor(Math.random() * WALLPAPERS.length));
  const current = WALLPAPERS[index] ?? WALLPAPERS[0]!;

  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setTime(d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className={`work-wallpaper-container theme-${current.theme}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="打工人沉浸式专注壁纸屏保"
    >
      {/* 顶部环境信息栏 */}
      <div className="wallpaper-top-bar">
        <div className="wallpaper-status-badge">
          <span className="wallpaper-live-dot" aria-hidden="true" />
          <span>{current.status}</span>
        </div>
        <div className="wallpaper-safe-alert">
          <ShieldCheck size={14} />
          <span>摸鱼状态已自动冻结 · 点击屏幕任意处即可恢复</span>
        </div>
      </div>

      {/* 中心艺术壁纸卡片 */}
      <main className="wallpaper-main-content">
        <header className="wallpaper-clock-section">
          <time className="wallpaper-clock">{time}</time>
          <span className="wallpaper-date">{dateStr}</span>
        </header>

        <section className="wallpaper-card-frame">
          <div className="wallpaper-tagline-wrap">
            <Sparkles size={16} className="sparkle-icon" />
            <span className="wallpaper-tagline">{current.tagline}</span>
          </div>

          <h1 className="wallpaper-heading">{current.title}</h1>
          <p className="wallpaper-subheading">{current.sub}</p>

          <div className="wallpaper-principles-box">
            {current.principles.map((p, i) => (
              <div className="principle-line" key={i}>
                <span className="bullet-point">✦</span>
                <span>{p}</span>
              </div>
            ))}
          </div>

          {profile ? (
            <footer className="wallpaper-character-cheer">
              <span className="cheer-avatar">🐴</span>
              <span className="cheer-text">
                <strong>{profile.name}</strong> 正在守护你的专属工位心流
              </span>
            </footer>
          ) : null}
        </section>
      </main>

      {/* 底部退出说明与切换灵感 */}
      <footer className="wallpaper-bottom-bar" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="wallpaper-switch-btn"
          onClick={() => setIndex((prev) => (prev + 1) % WALLPAPERS.length)}
        >
          <Zap size={14} /> 切换下一张灵感壁纸
        </button>
        <button type="button" className="wallpaper-exit-btn" onClick={onClose}>
          退出掩护并继续
        </button>
      </footer>
    </div>
  );
}
