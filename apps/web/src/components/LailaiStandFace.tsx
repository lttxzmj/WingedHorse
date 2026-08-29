import { CHARACTER_NAME, getStandFace, type StandFaceMood } from "@wingedhorse/domain";
import "./stand-face.css";

export function LailaiStandFace({ mood, onClose }: { mood: StandFaceMood; onClose: () => void }) {
  const face = getStandFace(mood);
  return (
    <div
      className={`stand-face stand-face--${mood}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${CHARACTER_NAME}的工位脸`}
      onClick={onClose}
    >
      <p className="stand-face__kaomoji" aria-hidden="true">
        {face.kaomoji}
      </p>
      <p className="stand-face__line">{face.line}</p>
      <p className="stand-face__hint">轻点退出</p>
    </div>
  );
}
