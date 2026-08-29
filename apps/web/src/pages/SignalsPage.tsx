import {
  classifyExpression,
  classifyVisualActivity,
  estimatePulse,
  EXPRESSION_LABEL,
  expressionToMood,
  type ColorSample,
  type ExpressionTag,
  type PulseEstimate
} from "@wingedhorse/domain";
import { Button, Card } from "@wingedhorse/ui";
import { getRouteApi } from "@tanstack/react-router";
import { BatteryLow, CircleMinus, CloudRain, SunMedium, Wind } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AppIcon } from "../components/AppIcon";
import { BackLink } from "../components/BackLink";
import { detectFaceLandmarks } from "../lib/faceLandmarker";
import { sendMoodToDevice } from "../lib/devices";
import { useAppStore } from "../store/useAppStore";

const signalsRouteApi = getRouteApi("/signals");

const MOODS = [
  { id: "good", icon: SunMedium, label: "还不错" },
  { id: "flat", icon: CircleMinus, label: "没什么感觉" },
  { id: "tired", icon: BatteryLow, label: "有点累" },
  { id: "anxious", icon: Wind, label: "有点紧绷" },
  { id: "sad", icon: CloudRain, label: "有点低落" }
] as const;

const cameraEnabled = import.meta.env.DEV || import.meta.env.VITE_FEATURE_CAMERA_SIGNALS === "true";
const pulseEnabled = import.meta.env.VITE_FEATURE_RPPG === "true";

interface SignalResult {
  pulse: PulseEstimate | null;
  activity: string;
  expression: ExpressionTag | null;
}

export function SignalsPage() {
  const search = signalsRouteApi.useSearch();
  const backTo =
    search.from === "home" ? "/home" : search.from === "companion" ? "/companion" : "/settings";
  const backLabel =
    search.from === "home"
      ? "回到草原"
      : search.from === "companion"
        ? "回到对话"
        : "返回设置";
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const samplesRef = useRef<ColorSample[]>([]);
  const lastGreenRef = useRef<number | null>(null);
  const lastSampleAt = useRef(0);
  const lastExpressionAt = useRef(0);
  const expressionRef = useRef<ExpressionTag | null>(null);
  const activeRef = useRef(false);
  const runIdRef = useRef(0);
  const manualMood = useAppStore((state) => state.manualMood);
  const setManualMood = useAppStore((state) => state.setManualMood);
  const deviceId = useAppStore((state) => state.deviceId);
  const hardwareLink = useAppStore((state) => state.hardwareLink);
  const [consented, setConsented] = useState(false);
  const [active, setActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [expression, setExpression] = useState<ExpressionTag | null>(null);
  const [result, setResult] = useState<SignalResult | null>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  const cameraSupported =
    cameraEnabled &&
    typeof navigator !== "undefined" &&
    window.isSecureContext &&
    Boolean(navigator.mediaDevices && "getUserMedia" in navigator.mediaDevices);

  const stop = () => {
    runIdRef.current += 1;
    activeRef.current = false;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    if (canvasRef.current) {
      canvasRef.current.width = 0;
      canvasRef.current.height = 0;
    }
    samplesRef.current = [];
    lastGreenRef.current = null;
    expressionRef.current = null;
    streamRef.current = null;
    frameRef.current = null;
    setActive(false);
  };

  useEffect(() => stop, []);

  const runExpression = () => {
    const video = videoRef.current;
    if (!video || !activeRef.current) return;
    const now = performance.now();
    if (now - lastExpressionAt.current < 500) return;
    lastExpressionAt.current = now;
    const runId = runIdRef.current;
    void detectFaceLandmarks(video, now).then((landmarks) => {
      if (!landmarks || !activeRef.current || runId !== runIdRef.current) return;
      const tag = classifyExpression(landmarks);
      expressionRef.current = tag;
      setExpression(tag);
    });
  };

  const sample = () => {
    const video = videoRef.current;
    if (!video || !activeRef.current) return;
    const now = performance.now();
    if (
      now - lastSampleAt.current >= 90 &&
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
    ) {
      const canvas = canvasRef.current ?? document.createElement("canvas");
      canvasRef.current = canvas;
      canvas.width = 48;
      canvas.height = 48;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (context) {
        context.drawImage(
          video,
          video.videoWidth * 0.3,
          video.videoHeight * 0.2,
          video.videoWidth * 0.4,
          video.videoHeight * 0.45,
          0,
          0,
          48,
          48
        );
        const pixels = context.getImageData(0, 0, 48, 48).data;
        let green = 0;
        for (let index = 1; index < pixels.length; index += 16) green += pixels[index]!;
        green /= pixels.length / 16;
        const motion = lastGreenRef.current === null ? 0 : Math.abs(green - lastGreenRef.current);
        lastGreenRef.current = green;
        samplesRef.current.push({ timestampMs: now, green, motion });
        lastSampleAt.current = now;
        const seconds = Math.floor((now - samplesRef.current[0]!.timestampMs) / 1000);
        setElapsed(seconds);
        if (seconds >= 15) {
          const samples = samplesRef.current;
          const finalExpression = expressionRef.current;
          setResult({
            pulse: pulseEnabled ? estimatePulse(samples) : null,
            activity:
              classifyVisualActivity(samples) === "steady" ? "画面比较稳定" : "画面移动较多",
            expression: finalExpression
          });
          if (finalExpression) {
            const mood = expressionToMood(finalExpression);
            setManualMood(mood);
            void sendMoodToDevice(deviceId, mood, { linked: hardwareLink });
          }
          stop();
          return;
        }
      }
    }
    runExpression();
    frameRef.current = requestAnimationFrame(sample);
  };

  const start = async () => {
    if (!consented || !cameraSupported || starting) return;
    setStarting(true);
    setError("");
    setResult(null);
    setElapsed(0);
    setExpression(null);
    samplesRef.current = [];
    lastGreenRef.current = null;
    expressionRef.current = null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      activeRef.current = true;
      setActive(true);
      frameRef.current = requestAnimationFrame(sample);
    } catch (cause) {
      stop();
      setError(
        cause instanceof DOMException && cause.name === "NotFoundError"
          ? "没有找到可用摄像头。你仍然可以使用上面的手动心情选择。"
          : "没有获得摄像头权限。你仍然可以使用上面的手动心情选择。"
      );
    } finally {
      setStarting(false);
    }
  };

  return (
    <main className="signals-page">
      <header className="subpage-header">
        <BackLink to={backTo} label={backLabel} />
        <div>
          <p className="eyebrow">端侧状态线索</p>
          <h1>说说此刻的你</h1>
        </div>
        <span>可跳过</span>
      </header>
      <section>
        <h2>你自己最清楚</h2>
        <p className="section-intro">
          摄像头不能真正读懂情绪。先由你点选心情；开启硬件联动后，也会同步到心情灯。
        </p>
        <div className="mood-grid">
          {MOODS.map((mood) => (
            <button
              className={manualMood === mood.id ? "is-selected" : ""}
              key={mood.id}
              onClick={() => {
                setManualMood(mood.id);
                void sendMoodToDevice(deviceId, mood.id, { linked: hardwareLink });
              }}
            >
              <AppIcon icon={mood.icon} size={26} />
              {mood.label}
            </button>
          ))}
        </div>
      </section>
      {cameraSupported ? (
        <Card className="sensor-card">
          <div>
            <p className="eyebrow">
              实验功能 · 不上传{pulseEnabled ? " · rPPG 已开启" : " · rPPG 暂停开放"}
            </p>
            <h2>15 秒镜头状态线索</h2>
            <p>
              只在此设备内存中读取中央区域的颜色变化、画面稳定度和表情线索。不会录音、上传、保存视频，也不用于诊断。
            </p>
          </div>
          <div className="camera-window">
            <video ref={videoRef} muted playsInline aria-label="摄像头实时预览" />
            {!active ? <span>你的画面只留在此刻</span> : <b>{Math.max(0, 15 - elapsed)}s</b>}
          </div>
          {expression ? (
            <p className="expression-tag" role="status">
              当前线索：{EXPRESSION_LABEL[expression]}
            </p>
          ) : null}
          {result ? (
            <div className="signal-result" role="status">
              <strong>
                {result.pulse?.bpm
                  ? `趣味脉搏趋势约 ${result.pulse.bpm} 次/分`
                  : pulseEnabled
                    ? "暂时没有得到清晰的脉搏趋势"
                    : "本次只分析画面稳定度与表情线索"}
              </strong>
              <p>
                {result.activity}
                {result.expression ? ` · 表情：${EXPRESSION_LABEL[result.expression]}` : ""} ·
                {result.pulse
                  ? ` · 脉搏趋势置信度${result.pulse.confidence === "medium" ? "中" : "低"}${result.pulse.reason ? ` · ${result.pulse.reason}` : ""}`
                  : ""}
              </p>
            </div>
          ) : null}
          {error ? (
            <p className="error-message" role="alert">
              {error}
            </p>
          ) : null}
          <label className="consent-check">
            <input
              type="checkbox"
              checked={consented}
              disabled={active || starting}
              onChange={(event) => setConsented(event.target.checked)}
            />
            我理解结果仅供趣味参考，并同意本次临时使用摄像头处理
            {pulseEnabled ? "颜色变化、画面稳定度和表情线索" : "画面稳定度和表情线索"}
            ；结果不保存，退出即停止。
          </label>
          {active ? (
            <Button variant="secondary" onClick={stop}>
              立即停止
            </Button>
          ) : (
            <Button
              disabled={!consented || starting}
              loading={starting}
              onClick={() => void start()}
            >
              开始 15 秒体验
            </Button>
          )}
          <small>
            光线、肤色、移动、相机质量都会显著影响结果。它不是医疗器械，不能测量或判断健康状况。
          </small>
        </Card>
      ) : (
        <Card className="sensor-card sensor-card--disabled">
          <p className="eyebrow">镜头实验暂未开放</p>
          <p>
            {!window.isSecureContext
              ? "当前页面不是安全的 HTTPS 环境，浏览器不会开放摄像头。手动心情仍可正常使用。"
              : "当前浏览器没有可用的摄像头能力，或镜头实验尚未开放。手动心情仍可正常使用。"}
          </p>
        </Card>
      )}
    </main>
  );
}
