export const WAKE_PHRASE_LABEL = "牛马来来";
export const WAKE_PHRASE_PATTERN = /牛马来来|牛马\s*来来/u;

export type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

export type SpeechRecognitionResultEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const scope = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

export function normalizeSpeechText(value: string): string {
  return value.replace(/\s+/gu, "").trim();
}

export function stripWakePhrase(value: string): string {
  return value
    .replace(WAKE_PHRASE_PATTERN, " ")
    .replace(/^[\s,，。.!！?？:：;；]+/u, "")
    .replace(/\s{2,}/gu, " ")
    .trim();
}

export function containsWakePhrase(value: string): boolean {
  return WAKE_PHRASE_PATTERN.test(value) || WAKE_PHRASE_PATTERN.test(normalizeSpeechText(value));
}
