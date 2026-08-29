import type { ImgHTMLAttributes, SyntheticEvent } from "react";

export type WingedHorseType =
  | "chosen"
  | "saving"
  | "perpetual"
  | "overthinker"
  | "tired"
  | "veteran"
  | "explosive"
  | "mad-literature";

export interface WingedHorseCharacterProps extends Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src"
> {
  mood?: "neutral" | "happy" | "tired" | "resting";
  activity?: "idle" | "listening" | "talking";
  typeId?: WingedHorseType;
}

const fallbackType: WingedHorseType = "chosen";

export function WingedHorseCharacter({
  mood = "neutral",
  activity = "idle",
  typeId = fallbackType,
  className = "",
  onError,
  alt = "",
  ...props
}: WingedHorseCharacterProps) {
  function handleError(event: SyntheticEvent<HTMLImageElement>) {
    onError?.(event);
    const image = event.currentTarget;
    const fallbackSource = `/characters/types/${fallbackType}.webp`;
    if (!image.src.endsWith(fallbackSource)) image.src = fallbackSource;
  }

  return (
    <img
      src={`/characters/types/${typeId}.webp`}
      alt={alt}
      className={`winged-horse winged-horse--${mood} winged-horse--${activity} ${className}`.trim()}
      onError={handleError}
      draggable={false}
      decoding="async"
      {...props}
    />
  );
}
