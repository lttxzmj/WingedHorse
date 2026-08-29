import { Camera, ImagePlus, Mic, MicOff, Plus, Send, Smile, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { AppIcon } from "./AppIcon";
import { useSpeechInput } from "../hooks/useSpeechInput";
import { WAKE_PHRASE_LABEL } from "../lib/speechRecognition";
import { buildCompanionOutboundText } from "../lib/companionOutbound";
import "../companion-composer.css";

export type CompanionComposerSubmit = {
  text: string;
  /** 仅当前会话预览用，永不上传。 */
  localImageUrl: string | null;
};

type CompanionComposerProps = {
  variant: "home" | "detail";
  value: string;
  onChange: (value: string) => void;
  onSubmit: (payload: CompanionComposerSubmit) => void | Promise<void>;
  disabled?: boolean;
  maxLength?: number;
  placeholder?: string;
  inputId?: string;
  ariaLabel?: string;
  trailingAction?: ReactNode;
  /** 表情识别返回路径；首页传 /home，完整对话传 /companion。 */
  signalsReturnTo?: "/home" | "/companion" | "/settings";
};

export function CompanionComposer({
  variant,
  value,
  onChange,
  onSubmit,
  disabled = false,
  maxLength = 200,
  placeholder = "说一句…",
  inputId = "companion-composer-input",
  ariaLabel = "和来来说一句",
  trailingAction,
  signalsReturnTo = "/settings"
}: CompanionComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const interimBaseRef = useRef(value);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressFiredRef = useRef(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);

  const handleDictation = useCallback(
    (text: string, meta: { isFinal: boolean }) => {
      if (!meta.isFinal) {
        onChange(
          `${interimBaseRef.current}${interimBaseRef.current && text ? " " : ""}${text}`.slice(
            0,
            maxLength
          )
        );
        return;
      }
      const next = `${interimBaseRef.current}${interimBaseRef.current && text ? " " : ""}${text}`
        .replace(/\s{2,}/gu, " ")
        .trim()
        .slice(0, maxLength);
      interimBaseRef.current = next;
      onChange(next);
    },
    [maxLength, onChange]
  );

  const focusInput = useCallback(() => {
    const node = document.getElementById(inputId);
    if (node instanceof HTMLElement) node.focus();
  }, [inputId]);

  const speech = useSpeechInput({
    enabled: !disabled,
    onDictation: handleDictation,
    onWake: focusInput
  });

  useEffect(() => {
    if (!speech.listening) interimBaseRef.current = value;
  }, [speech.listening, value]);

  useEffect(
    () => () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      if (longPressTimerRef.current !== null) window.clearTimeout(longPressTimerRef.current);
    },
    [imageUrl]
  );

  const clearImage = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    setImageName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const onPickImage = (fileList: FileList | null, label: string) => {
    const file = fileList?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(URL.createObjectURL(file));
    setImageName(file.name || label);
    setPanelOpen(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const outbound = buildCompanionOutboundText(value, Boolean(imageUrl));
    if (!outbound || disabled) return;
    speech.stop();
    setPanelOpen(false);
    const submittedImageUrl = imageUrl;
    setImageUrl(null);
    setImageName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    await onSubmit({ text: outbound, localImageUrl: submittedImageUrl });
    onChange("");
    interimBaseRef.current = "";
  };

  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const onVoicePointerDown = () => {
    if (disabled || !speech.supported || speech.consentNeeded) return;
    longPressFiredRef.current = false;
    clearLongPress();
    longPressTimerRef.current = window.setTimeout(() => {
      longPressFiredRef.current = true;
      speech.toggleWake();
    }, 480);
  };

  const onVoicePointerUp = () => {
    if (disabled || !speech.supported || speech.consentNeeded) {
      clearLongPress();
      return;
    }
    clearLongPress();
    if (longPressFiredRef.current) return;
    speech.toggleDictation();
  };

  const canSend = Boolean(value.trim() || imageUrl) && !disabled;
  const wakeActive = speech.mode === "wake" || speech.status.includes("听到了");
  const dictating = speech.mode === "dictation" && speech.listening;
  const voiceActive = dictating || wakeActive;
  const signalsSearch =
    signalsReturnTo === "/home"
      ? ({ from: "home" } as const)
      : signalsReturnTo === "/companion"
        ? ({ from: "companion" } as const)
        : undefined;

  return (
    <div className={`companion-composer companion-composer--${variant}`}>
      {speech.consentNeeded ? (
        <div className="companion-composer__consent" role="region" aria-label="麦克风说明">
          <p>
            麦克风只在这台设备上听写和听唤醒词「{WAKE_PHRASE_LABEL}
            」，原音频不会上传。点一下开始听写，按住可开启唤醒。拒绝后仍可打字和选图说明。
          </p>
          <button type="button" onClick={speech.acceptConsent}>
            好，开始用语音
          </button>
        </div>
      ) : null}

      {imageUrl ? (
        <div className="companion-composer__image">
          <img src={imageUrl} alt="" width={72} height={72} />
          <div>
            <strong>本机预览</strong>
            <span>{imageName || "图片"} · 不会上传</span>
          </div>
          <button type="button" aria-label="移除图片" onClick={clearImage}>
            <AppIcon icon={X} size={16} />
          </button>
        </div>
      ) : null}

      {(speech.status || speech.interimText || speech.error) && !speech.consentNeeded ? (
        <p
          className={`companion-composer__status${speech.error ? " is-error" : ""}${speech.listening ? " is-live" : ""}`}
          role="status"
        >
          {speech.error ||
            speech.status ||
            (wakeActive
              ? `正在听「${WAKE_PHRASE_LABEL}」…`
              : speech.interimText || (dictating ? "正在听你说…" : ""))}
        </p>
      ) : null}

      {panelOpen ? (
        <div className="companion-composer__panel" role="menu" aria-label="图片与表情">
          <button
            type="button"
            role="menuitem"
            disabled={disabled}
            onClick={() => {
              setPanelOpen(false);
              fileInputRef.current?.click();
            }}
          >
            <AppIcon icon={ImagePlus} size={18} />
            <span>相册</span>
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={disabled}
            onClick={() => {
              setPanelOpen(false);
              cameraInputRef.current?.click();
            }}
          >
            <AppIcon icon={Camera} size={18} />
            <span>拍照</span>
          </button>
          {signalsSearch ? (
            <Link
              role="menuitem"
              to="/signals"
              search={signalsSearch}
              className="companion-composer__panel-link"
              onClick={() => setPanelOpen(false)}
            >
              <AppIcon icon={Smile} size={18} />
              <span>表情识别</span>
            </Link>
          ) : (
            <Link
              role="menuitem"
              to="/signals"
              className="companion-composer__panel-link"
              onClick={() => setPanelOpen(false)}
            >
              <AppIcon icon={Smile} size={18} />
              <span>表情识别</span>
            </Link>
          )}
        </div>
      ) : null}

      <form className="companion-composer__form" onSubmit={(event) => void submit(event)}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="companion-composer__file"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(event) => onPickImage(event.target.files, "相册")}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="companion-composer__file"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(event) => onPickImage(event.target.files, "拍照")}
        />

        <div className="companion-composer__tools" role="group" aria-label="输入方式">
          <button
            type="button"
            className={`companion-composer__tool${panelOpen ? " is-active" : ""}`}
            aria-label={panelOpen ? "收起图片选项" : "更多：相册、拍照与表情识别"}
            aria-expanded={panelOpen}
            disabled={disabled}
            onClick={() => setPanelOpen((open) => !open)}
          >
            <AppIcon icon={panelOpen ? X : Plus} size={20} />
          </button>
          <button
            type="button"
            className={`companion-composer__tool${voiceActive ? " is-active" : ""}`}
            aria-label={
              wakeActive
                ? "停止语音唤醒"
                : dictating
                  ? "停止语音输入"
                  : `语音：点一下听写，按住唤醒「${WAKE_PHRASE_LABEL}」`
            }
            aria-pressed={voiceActive}
            disabled={disabled || !speech.supported || speech.consentNeeded}
            onPointerDown={onVoicePointerDown}
            onPointerUp={onVoicePointerUp}
            onPointerLeave={clearLongPress}
            onPointerCancel={clearLongPress}
          >
            <AppIcon icon={voiceActive ? MicOff : Mic} size={20} />
          </button>
        </div>

        {variant === "detail" ? (
          <textarea
            id={inputId}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            maxLength={maxLength}
            rows={1}
            placeholder={placeholder}
            aria-label={ariaLabel}
            disabled={disabled}
          />
        ) : (
          <input
            id={inputId}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            maxLength={maxLength}
            placeholder={placeholder}
            aria-label={ariaLabel}
            disabled={disabled}
          />
        )}

        <button
          type="submit"
          className="companion-composer__send"
          aria-label="发送"
          disabled={!canSend}
        >
          <AppIcon icon={Send} size={18} />
          {variant === "detail" ? <span>发送</span> : null}
        </button>

        {trailingAction}
      </form>

      {variant === "detail" ? (
        <p className="companion-composer__hint">
          {speech.supported
            ? `语音：点一下听写，按住唤醒「${WAKE_PHRASE_LABEL}」。+ 里可选相册、拍照或表情识别。`
            : "这台浏览器暂不支持语音，可用打字、相册和表情识别。"}
        </p>
      ) : null}
    </div>
  );
}
