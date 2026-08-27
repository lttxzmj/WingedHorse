import type { SVGProps } from "react";

export interface WingedHorseCharacterProps extends SVGProps<SVGSVGElement> {
  mood?: "neutral" | "happy" | "tired" | "resting";
}

export function WingedHorseCharacter({
  mood = "neutral",
  className = "",
  ...props
}: WingedHorseCharacterProps) {
  const sleepy = mood === "tired" || mood === "resting";
  return (
    <svg
      viewBox="0 0 320 320"
      role="img"
      className={("winged-horse winged-horse--" + mood + " " + className).trim()}
      style={{ width: "min(78%, 19rem)", height: "auto", position: "relative", zIndex: 1 }}
      {...props}
    >
      <ellipse cx="164" cy="292" rx="86" ry="15" fill="#3B2E24" opacity="0.14" />
      <path
        d="M76 184c-35-4-47-31-38-59 26 9 46 26 54 50"
        fill="#FFF8DE"
        stroke="#3B2E24"
        strokeWidth="7"
        strokeLinejoin="round"
      />
      <path
        d="M248 181c34-7 43-35 31-61-24 11-42 29-47 53"
        fill="#FFF8DE"
        stroke="#3B2E24"
        strokeWidth="7"
        strokeLinejoin="round"
      />
      <path
        d="M95 164c-12 21-15 76 0 101 15 25 43 31 72 31 32 0 60-7 73-34 13-28 6-79-7-101-18-30-116-28-138 3Z"
        fill="#FFF7D8"
        stroke="#3B2E24"
        strokeWidth="8"
      />
      <path d="M116 268v22M205 267v23" stroke="#3B2E24" strokeWidth="18" strokeLinecap="round" />
      <path
        d="M221 256c29 3 38 23 27 43 19-8 27-26 18-43"
        fill="none"
        stroke="#D4A21C"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d="M101 104c8-44 36-70 70-70 37 0 65 24 73 66 7 38-10 77-72 77-59 0-78-34-71-73Z"
        fill="#FFF8DE"
        stroke="#3B2E24"
        strokeWidth="8"
      />
      <path
        d="M120 65 103 30c23 4 38 18 45 37M218 64l17-35c-23 4-38 18-45 37"
        fill="#FFD057"
        stroke="#3B2E24"
        strokeWidth="8"
        strokeLinejoin="round"
      />
      <path
        d="M122 57c18-32 73-39 99 2-14-4-20 4-29 12-9-13-23-17-34-3-9-11-21-14-36-11Z"
        fill="#FFD057"
        stroke="#3B2E24"
        strokeWidth="7"
        strokeLinejoin="round"
      />
      <ellipse
        cx="143"
        cy="105"
        rx="18"
        ry={sleepy ? 7 : 23}
        fill="#fff"
        stroke="#3B2E24"
        strokeWidth="6"
      />
      <ellipse
        cx="204"
        cy="105"
        rx="18"
        ry={sleepy ? 7 : 23}
        fill="#fff"
        stroke="#3B2E24"
        strokeWidth="6"
      />
      {!sleepy ? (
        <>
          <circle cx="148" cy="111" r="8" fill="#3B2E24" />
          <circle cx="199" cy="111" r="8" fill="#3B2E24" />
        </>
      ) : null}
      <path
        d="M126 130c16-14 76-14 91 1 10 11 3 30-15 37-19 8-53 7-71-1-18-8-18-26-5-37Z"
        fill="#FFE3A2"
        stroke="#3B2E24"
        strokeWidth="7"
      />
      <circle cx="147" cy="143" r="5" fill="#665548" />
      <circle cx="195" cy="143" r="5" fill="#665548" />
      <path
        d={
          mood === "happy"
            ? "M153 154c9 12 28 12 38 0"
            : sleepy
              ? "M158 159h25"
              : "M158 155c7 6 18 6 25 0"
        }
        fill="none"
        stroke="#3B2E24"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M85 197c-27 1-43 17-48 38 20 1 39-5 54-22M241 197c27 1 43 17 48 38-20 1-39-5-54-22"
        fill="#fff"
        stroke="#3B2E24"
        strokeWidth="7"
        strokeLinejoin="round"
      />
      <path
        d="M122 212c25 13 65 13 90-1"
        fill="none"
        stroke="#FFE3A2"
        strokeWidth="12"
        strokeLinecap="round"
      />
    </svg>
  );
}
