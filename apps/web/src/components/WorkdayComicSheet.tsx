import { CHARACTER_NAME, type WorkdayComic } from "@wingedhorse/domain";
import { Button } from "@wingedhorse/ui";
import { Share2, X } from "lucide-react";
import { AppIcon } from "./AppIcon";
import "./workday-comic.css";

export function WorkdayComicSheet({
  comic,
  sharing,
  message,
  onShare,
  onClose
}: {
  comic: WorkdayComic;
  sharing: boolean;
  message: string;
  onShare: () => void;
  onClose: () => void;
}) {
  return (
    <div className="workday-comic-backdrop" onPointerDown={onClose}>
      <section
        className="workday-comic"
        role="dialog"
        aria-modal="true"
        aria-labelledby="workday-comic-title"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="workday-comic__close"
          aria-label="关闭漫画"
          onClick={onClose}
        >
          <AppIcon icon={X} size={20} />
        </button>
        <header className="workday-comic__masthead">
          <div>
            <p className="eyebrow">{comic.dateLabel}</p>
            <h2 id="workday-comic-title">{CHARACTER_NAME}的一天</h2>
          </div>
        </header>
        <ol className="workday-comic__strip">
          {comic.panels.map((panel) => (
            <li key={panel.id}>
              <div className="workday-comic__art" aria-hidden="true">
                {comic.characterSrc ? (
                  <img src={comic.characterSrc} alt="" width="160" height="160" />
                ) : (
                  <em>{panel.kaomoji}</em>
                )}
              </div>
              <div className="workday-comic__copy">
                <strong>{panel.title}</strong>
                <p>{panel.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="workday-comic__slogan">{comic.slogan}</p>
        <div className="workday-comic__actions">
          <Button loading={sharing} onClick={onShare}>
            <AppIcon icon={Share2} size={18} />
            分享
          </Button>
          <Button variant="tertiary" onClick={onClose}>
            关闭
          </Button>
        </div>
        {message ? <p role="status">{message}</p> : null}
      </section>
    </div>
  );
}
