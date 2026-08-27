import {
  classifyExpression,
  classifyVisualActivity,
  estimatePulse,
  EXPRESSION_LABEL,
  type ColorSample,
  type ExpressionTag,
  type PulseEstimate
} from "@wingedhorse/domain";
import { Button, Card } from "@wingedhorse/ui";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { detectFaceLandmarks } from "../lib/faceLandmarker";
import { sendMoodToDevice } from "../lib/devices";
import { useAppStore } from "../store/useAppStore";

const MOODS = [
  { id: "good", emoji: "🌤️", label: "还不错" }, { id: "flat", emoji: "😶", label: "没什么感觉" },
  { id: "tired", emoji: "🪫", label: "有点累" }, { id: "anxious", emoji: "🌪️", label: "有点紧绷" },
  { id: "sad", emoji: "🌧️", label: "有点低落" }
] as const;

const cameraEnabled = import.meta.env.VITE_FEATURE_CAMERA_SIGNALS !== "false";

interface SignalResult {
  pulse: PulseEstimate;
  activity: string;
  expression: ExpressionTag | null;
}

export function SignalsPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const samplesRef = useRef<ColorSample[]>([]);
  const lastGreenRef = useRef<number | null>(null);
  const lastSampleAt = useRef(0);
  const lastExpressionAt = useRef(0);
  const expressionRef = useRef<ExpressionTag | null>(null);
  const manualMood = useAppStore((state) => state.manualMood);
  const setManualMood = useAppStore((state) => state.setManualMood);
  const hardwareLink = useAppStore((state) => state.hardwareLink);
  const deviceId = useAppStore((state) => state.deviceId);
  const [consented, setConsented] = useState(false);
  const [active, setActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [expression, setExpression] = useState<ExpressionTag | null>(null);
  const [result, setResult] = useState<SignalResult | null>(null);
  const [error, setError] = useState("");

  const stop = () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    frameRef.current = null;
    setActive(false);
  };

  useEffect(() => stop, []);

  const runExpression = () => {
    const video = videoRef.current;
    if (!video || !active) return;
    const now = performance.now();
    if (now - lastExpressionAt.current < 500) return;
    lastExpressionAt.current = now;
    void detectFaceLandmarks(video, now).then((landmarks) => {
      if (!landmarks || !active) return;
      const tag = classifyExpression(landmarks);
      expressionRef.current = tag;
      setExpression(tag);
    });
  };

  const sample = () => {
    const video = videoRef.current;
    if (!video || !active) return;
    const now = performance.now();
    if (now - lastSampleAt.current >= 90 && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      const canvas = canvasRef.current ?? document.createElement("canvas");
      canvasRef.current = canvas;
      canvas.width = 48; canvas.height = 48;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (context) {
        context.drawImage(video, video.videoWidth * 0.3, video.videoHeight * 0.2, video.videoWidth * 0.4, video.videoHeight * 0.45, 0, 0, 48, 48);
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
          setResult({ pulse: estimatePulse(samples), activity: classifyVisualActivity(samples) === "steady" ? "画面比较稳定" : "画面移动较多", expression: expressionRef.current });
          stop();
          return;
        }
      }
    }
    runExpression();
    frameRef.current = requestAnimationFrame(sample);
  };

  useEffect(() => {
    if (active) frameRef.current = requestAnimationFrame(sample);
    return () => { if (frameRef.current !== null) cancelAnimationFrame(frameRef.current); };
  });

  const start = async () => {
    if (!consented) return;
    setError(""); setResult(null); setElapsed(0); setExpression(null);
    samplesRef.current = []; lastGreenRef.current = null; expressionRef.current = null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setActive(true);
    } catch {
      stop(); setError("没有获得摄像头权限。你仍然可以使用上面的手动心情选择。");
    }
  };

  return (
    <main className="signals-page">
      <header className="subpage-header"><Link to="/home">←</Link><div><p className="eyebrow">端侧状态实验室</p><h1>让飞马多懂一点此刻</h1></div><span>可跳过</span></header>
      <section><h2>你自己最清楚</h2><p className="section-intro">摄像头不能真正读懂情绪，先由你选择更可靠。</p><div className="mood-grid">{MOODS.map((mood) => <button className={manualMood === mood.id ? "is-selected" : ""} key={mood.id} onClick={() => { setManualMood(mood.id); if (hardwareLink && deviceId) void sendMoodToDevice(deviceId, mood.id); }}><span>{mood.emoji}</span>{mood.label}</button>)}</div></section>
      {cameraEnabled ? (
        <Card className="sensor-card">
          <div><p className="eyebrow">实验功能 · 不上传</p><h2>15 秒镜头状态线索</h2><p>只在此设备内存中读取中央区域的颜色变化、画面稳定度和表情线索。不会录音、上传、保存视频，也不用于诊断。</p></div>
          <div className="camera-window"><video ref={videoRef} muted playsInline aria-label="摄像头实时预览" />{!active ? <span>你的画面只留在此刻</span> : <b>{Math.max(0, 15 - elapsed)}s</b>}</div>
          {expression ? <p className="expression-tag" role="status">当前线索：{EXPRESSION_LABEL[expression]}</p> : null}
          {result ? <div className="signal-result" role="status"><strong>{result.pulse.bpm ? `趣味脉搏趋势约 ${result.pulse.bpm} 次/分` : "暂时没有得到清晰的脉搏趋势"}</strong><p>{result.activity}{result.expression ? ` · 表情：${EXPRESSION_LABEL[result.expression]}` : ""} · 置信度{result.pulse.confidence === "medium" ? "中" : "低"}{result.pulse.reason ? ` · ${result.pulse.reason}` : ""}</p></div> : null}
          {error ? <p className="error-message" role="alert">{error}</p> : null}
          <label className="consent-check"><input type="checkbox" checked={consented} onChange={(event) => setConsented(event.target.checked)} />我理解结果仅供趣味参考，并同意本次临时使用摄像头；退出即停止。</label>
          {active ? <Button variant="secondary" onClick={stop}>立即停止</Button> : <Button disabled={!consented} onClick={() => void start()}>开始 15 秒体验</Button>}
          <small>光线、肤色、移动、相机质量都会显著影响结果。它不是医疗器械，不能测量或判断健康状况。</small>
        </Card>
      ) : (
        <Card className="sensor-card sensor-card--disabled"><p className="eyebrow">镜头实验暂未开放</p><p>手动心情模式已足够好用；镜头状态线索作为可选实验，未在此版本开启。</p></Card>
      )}
    </main>
  );
}
