import { DEFAULT_SPONSORED_CAMPAIGN, ITEM_CATALOG, type ItemId } from "@wingedhorse/domain";
import { Button } from "@wingedhorse/ui";
import { X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { AppIcon } from "./AppIcon";
import { ItemIcon } from "./ItemIcon";
import "./welfare-sheet.css";

interface WelfareSheetProps {
  itemId: ItemId;
  onClose: () => void;
}

export function WelfareSheet({ itemId, onClose }: WelfareSheetProps) {
  const item = ITEM_CATALOG[itemId];
  const campaign = DEFAULT_SPONSORED_CAMPAIGN;
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [qrFailed, setQrFailed] = useState(false);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="welfare-sheet-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="welfare-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          className="welfare-sheet__close"
          aria-label="关闭领取"
          onClick={onClose}
        >
          <AppIcon icon={X} size={20} />
        </button>
        <header className="welfare-sheet__header">
          <p className="eyebrow">品牌合作 · {campaign.partnerName}</p>
          <h2 id={titleId}>{campaign.welfare.hint}</h2>
        </header>
        <div className="welfare-sheet__product">
          <ItemIcon itemId={itemId} size={52} />
          <div>
            <strong>{item.name}</strong>
            <span>{campaign.welfare.name}</span>
          </div>
        </div>
        <figure className={`welfare-sheet__qr ${qrFailed ? "is-failed" : ""}`.trim()}>
          {qrFailed ? (
            <p className="welfare-sheet__qr-fallback" role="status">
              二维码暂时不可用
            </p>
          ) : (
            <>
              {campaign.welfare.demoQr ? <span className="welfare-sheet__demo">演示码</span> : null}
              <img
                src={campaign.welfare.qrImage}
                width="240"
                height="240"
                alt={campaign.welfare.demoQr ? "演示领取码" : `${campaign.welfare.name}领取二维码`}
                onError={() => setQrFailed(true)}
              />
            </>
          )}
          <figcaption>{qrFailed ? "稍后再试，或先收着" : "长按识别"}</figcaption>
        </figure>
        <p className="welfare-sheet__disclosure">{campaign.welfare.disclosure}</p>
        <Button onClick={onClose}>知道了</Button>
      </section>
    </div>
  );
}
