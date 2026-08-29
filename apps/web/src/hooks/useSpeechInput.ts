import { useCallback, useEffect, useRef, useState } from "react";
import {
  WAKE_PHRASE_LABEL,
  containsWakePhrase,
  getSpeechRecognitionCtor,
  stripWakePhrase,
  type SpeechRecognitionLike
} from "../lib/speechRecognition";

export type SpeechListenMode = "off" | "dictation" | "wake";

type UseSpeechInputOptions = {
  enabled?: boolean;
  onDictation: (text: string, meta: { isFinal: boolean; fromWake: boolean }) => void;
  onWake?: () => void;
};

const MIC_CONSENT_KEY = "wingedhorse-mic-consent-v1";

function readConsent(): boolean {
  try {
    return sessionStorage.getItem(MIC_CONSENT_KEY) === "1";
  } catch {
    return false;
  }
}

function writeConsent() {
  try {
    sessionStorage.setItem(MIC_CONSENT_KEY, "1");
  } catch {
    // ignore quota / private mode
  }
}

export function useSpeechInput({ enabled = true, onDictation, onWake }: UseSpeechInputOptions) {
  const Recognition = getSpeechRecognitionCtor();
  const supported = Boolean(Recognition);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const modeRef = useRef<SpeechListenMode>("off");
  const wakeEnabledRef = useRef(false);
  const ignoreEndRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);
  const startRef = useRef<(nextMode: Exclude<SpeechListenMode, "off">) => void>(() => undefined);
  const onDictationRef = useRef(onDictation);
  const onWakeRef = useRef(onWake);
  const [mode, setMode] = useState<SpeechListenMode>("off");
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [consentNeeded, setConsentNeeded] = useState(() => supported && !readConsent());

  useEffect(() => {
    onDictationRef.current = onDictation;
  }, [onDictation]);

  useEffect(() => {
    onWakeRef.current = onWake;
  }, [onWake]);

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearRestartTimer();
    wakeEnabledRef.current = false;
    ignoreEndRef.current = true;
    modeRef.current = "off";
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.abort();
      } catch {
        try {
          recognition.stop();
        } catch {
          // already stopped
        }
      }
    }
    setListening(false);
    setInterimText("");
    setMode("off");
    setStatus("");
  }, [clearRestartTimer]);

  useEffect(() => {
    startRef.current = (nextMode) => {
      if (!enabled || !Recognition) {
        setError("当前浏览器还不支持语音输入，可以改用打字。");
        return;
      }
      if (consentNeeded) {
        setError("请先同意麦克风仅用于端侧听写与唤醒。");
        return;
      }

      clearRestartTimer();
      const previous = recognitionRef.current;
      if (previous) {
        ignoreEndRef.current = true;
        previous.onresult = null;
        previous.onerror = null;
        previous.onend = null;
        try {
          previous.abort();
        } catch {
          // ignore
        }
      }

      const recognition = new Recognition();
      recognition.lang = "zh-CN";
      recognition.continuous = nextMode === "wake";
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognitionRef.current = recognition;
      modeRef.current = nextMode;
      ignoreEndRef.current = false;
      setMode(nextMode);
      setError("");
      setStatus(nextMode === "wake" ? `正在听唤醒词「${WAKE_PHRASE_LABEL}」…` : "正在听你说…");

      recognition.onresult = (event) => {
        let interim = "";
        let finalChunk = "";
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          if (!result) continue;
          const transcript = result[0]?.transcript ?? "";
          if (result.isFinal) finalChunk += transcript;
          else interim += transcript;
        }
        setInterimText(interim);
        const heard = `${finalChunk}${interim}`;

        if (modeRef.current === "wake" && containsWakePhrase(heard)) {
          setStatus("听到了，你说。");
          onWakeRef.current?.();
          const remainder = stripWakePhrase(finalChunk || heard);
          modeRef.current = "dictation";
          setMode("dictation");
          if (remainder) {
            onDictationRef.current(remainder, {
              isFinal: Boolean(finalChunk),
              fromWake: true
            });
          }
          ignoreEndRef.current = true;
          try {
            recognition.stop();
          } catch {
            // ignore
          }
          restartTimerRef.current = window.setTimeout(() => {
            startRef.current("dictation");
          }, 220);
          return;
        }

        if (modeRef.current === "dictation") {
          const text = stripWakePhrase(finalChunk || interim);
          if (!text) return;
          onDictationRef.current(text, { isFinal: Boolean(finalChunk), fromWake: false });
          if (finalChunk) setInterimText("");
        }
      };

      recognition.onerror = (event) => {
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setError("麦克风权限被拒绝了。拒绝后仍可打字、选图说明。");
          stop();
          return;
        }
        if (event.error === "aborted" || event.error === "no-speech") return;
        setError("这轮没听清，可以再试一次，或改用打字。");
      };

      recognition.onend = () => {
        setListening(false);
        if (recognitionRef.current === recognition) {
          recognitionRef.current = null;
        }
        if (ignoreEndRef.current) {
          ignoreEndRef.current = false;
          return;
        }
        const pageVisible =
          typeof document !== "undefined" && document.visibilityState === "visible";
        if (!enabled || !pageVisible) {
          modeRef.current = "off";
          setMode("off");
          setStatus("");
          return;
        }
        if (wakeEnabledRef.current && modeRef.current === "wake") {
          restartTimerRef.current = window.setTimeout(() => {
            if (wakeEnabledRef.current && modeRef.current === "wake") {
              startRef.current("wake");
            }
          }, 320);
          return;
        }
        if (wakeEnabledRef.current && modeRef.current === "dictation") {
          restartTimerRef.current = window.setTimeout(() => {
            if (wakeEnabledRef.current) {
              startRef.current("wake");
            }
          }, 360);
          return;
        }
        modeRef.current = "off";
        setMode("off");
        setStatus("");
      };

      try {
        recognition.start();
        setListening(true);
      } catch {
        setError("没法开始听。请检查麦克风权限后重试。");
        wakeEnabledRef.current = false;
        modeRef.current = "off";
        setMode("off");
        setListening(false);
        setStatus("");
      }
    };
  }, [Recognition, clearRestartTimer, consentNeeded, enabled, stop]);

  const acceptConsent = useCallback(() => {
    writeConsent();
    setConsentNeeded(false);
    setError("");
  }, []);

  const startDictation = useCallback(() => {
    if (consentNeeded) return;
    wakeEnabledRef.current = false;
    startRef.current("dictation");
  }, [consentNeeded]);

  const startWake = useCallback(() => {
    if (consentNeeded) return;
    wakeEnabledRef.current = true;
    startRef.current("wake");
  }, [consentNeeded]);

  const toggleDictation = useCallback(() => {
    if (mode === "dictation" && listening) {
      stop();
      return;
    }
    startDictation();
  }, [listening, mode, startDictation, stop]);

  const toggleWake = useCallback(() => {
    if (mode !== "off" && wakeEnabledRef.current) {
      stop();
      return;
    }
    if (mode === "wake") {
      stop();
      return;
    }
    startWake();
  }, [mode, startWake, stop]);

  useEffect(() => {
    if (!enabled) stop();
  }, [enabled, stop]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") stop();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, [stop]);

  return {
    supported,
    mode,
    listening,
    interimText,
    status,
    error,
    consentNeeded,
    acceptConsent,
    startDictation,
    startWake,
    toggleDictation,
    toggleWake,
    stop
  };
}
