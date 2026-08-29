import { ImagePlus, Mic, MicOff, Send, Sparkles, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode
} from "react";
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
  /** 草原底栏右侧附加行动（如接补给） */
  trailingAction?: ReactNode;
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
  trailingAction
}: CompanionComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const interimBaseRef = useRef(value);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState("");

  const handleDictation = useCallback(
    (text: string, meta: { isFinal: boolean }) => {
      if (!meta.isFinal) {
        onChange(`${interimBaseRef.current}${interimBaseRef.current && text ? " " : ""}${text}`.slice(0, maxLength));
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

  const speech = useSpeechInput({
    enabled: !disabled,
    onDictation: handleDictation
  });

  useEffect(() => {
    if (!speech.listening) {
      interimBaseRef.current = value;
    }
  }, [speech.listening, value]);

  useEffect(
    () => () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    },
    [imageUrl]
  );

  const clearImage = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    setImageName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onPickImage = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(URL.createObjectURL(file));
    setImageName(file.name || "图片");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const outbound = buildCompanionOutboundText(value, Boolean(imageUrl));
    if (!outbound || disabled) return;
    speech.stop();
    // 把 object URL 所有权交给会话气泡；此处不再 revoke。
    const submittedImageUrl = imageUrl;
    setImageUrl(null);
    setImageName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    await onSubmit({ text: outbound, localImageUrl: submittedImageUrl });
    onChange("");
    interimBaseRef.current = "";
  };

  const canSend = Boolean(value.trim() || imageUrl) && !disabled;
  const wakeActive = speech.mode === "wake" || (speech.mode === "dictation" && speech.status.includes("听到了"));

  return (
    <div className={`companion-composer companion-composer--${variant}`}>
      {speech.consentNeeded ? (
        <div className="companion-composer__consent" role="region" aria-label="麦克风说明">
          <p>
            麦克风只在这台设备上听写和听唤醒词「{WAKE_PHRASE_LABEL}」，原音频不会上传。拒绝后仍可打字和选图说明。
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
            <span>{imageName || "图片"} · 不会上传，只发送你的文字说明</span>
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
          {speech.error || speech.status || speech.interimText}
        </p>
      ) : null}

      <form className="companion-composer__form" onSubmit={(event) => void submit(event)}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="companion-composer__file"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(event) => onPickImage(event.target.files)}
        />

        <div className="companion-composer__tools" role="group" aria-label="输入方式">
          <button
            type="button"
            className="companion-composer__tool"
            aria-label="添加图片说明"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
          >
            <AppIcon icon={ImagePlus} size={18} />
          </button>
          <button
            type="button"
            className={`companion-composer__tool${speech.mode === "dictation" && speech.listening ? " is-active" : ""}`}
            aria-label={speech.mode === "dictation" && speech.listening ? "停止听写" : "语音输入"}
            aria-pressed={speech.mode === "dictation" && speech.listening}
            disabled={disabled || !speech.supported || speech.consentNeeded}
            onClick={speech.toggleDictation}
          >
            <AppIcon icon={speech.listening && speech.mode === "dictation" ? MicOff : Mic} size={18} />
          </button>
          <button
            type="button"
            className={`companion-composer__tool companion-composer__wake${wakeActive ? " is-active" : ""}`}
            aria-label={
              wakeActive ? `关闭唤醒词${WAKE_PHRASE_LABEL}` : `开启唤醒词${WAKE_PHRASE_LABEL}`
            }
            aria-pressed={wakeActive}
            disabled={disabled || !speech.supported || speech.consentNeeded}
            onClick={speech.toggleWake}
            title={`唤醒词：${WAKE_PHRASE_LABEL}`}
          >
            <AppIcon icon={Sparkles} size={16} />
            <span>唤醒</span>
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

        <button type="submit" className="companion-composer__send" aria-label="发送" disabled={!canSend}>
          <AppIcon icon={Send} size={18} />
          {variant === "detail" ? <span>发送</span> : null}
        </button>

        {trailingAction}
      </form>

      {!speech.supported ? (
        <p className="companion-composer__hint">这台浏览器暂不支持语音，可用打字和图片说明。</p>
      ) : (
        <p className="companion-composer__hint">
          点麦克风说话；点「唤醒」后可说「{WAKE_PHRASE_LABEL}」唤起继续说。
        </p>
      )}
    </div>
  );
}
