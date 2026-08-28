import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { subscribeDeviceEvents } from "../lib/devices";
import { useAppStore } from "../store/useAppStore";
import { WorkInspirationPoster } from "./WorkInspirationPoster";

/**
 * 全局硬件事件监听器
 * 1. 摸鱼/游戏页面（/game）：超声波检测到身后有人靠近 -> 🚨 零操作自动极速切换全屏专注励志壁纸，保护摸鱼隐私！
 * 2. 危险解除后或用户点击屏幕 -> 一键退出壁纸，恢复游戏。
 * 3. 其他日常页面全部静默，已深度融合至飞马角色对话气泡中。
 */
export function GlobalHardwareListener() {
  const deviceId = useAppStore((state) => state.deviceId);
  const location = useLocation();
  const [stealthMode, setStealthMode] = useState(false);

  useEffect(() => {
    const targetDeviceId = deviceId || "lamp-001";

    const unsubscribe = subscribeDeviceEvents(targetDeviceId, (event, telemetry) => {
      const isGaming = location.pathname.includes("/game");

      // 只要在摸鱼游戏页面，一旦超声波检测到身后有人靠近，直接自动秒切全屏壁纸，无需多余弹窗与手动点击！
      if (isGaming && telemetry.obstacle) {
        setStealthMode(true);
      }
    });

    return unsubscribe;
  }, [deviceId, location.pathname]);

  if (stealthMode) {
    return <WorkInspirationPoster onClose={() => setStealthMode(false)} />;
  }

  return null;
}
