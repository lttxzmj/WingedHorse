import { Button } from "@wingedhorse/ui";
import { Camera, MapPinned, Navigation, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  addPhotoMoment,
  deletePhotoMoment,
  listPhotoMoments,
  PHOTO_REGIONS,
  type PhotoRegionId,
  type PhotoMoment
} from "../lib/photoMap";
import { AppIcon } from "./AppIcon";

interface PhotoMomentView extends PhotoMoment {
  imageUrl: string;
}

function regionLabel(id: PhotoRegionId) {
  return PHOTO_REGIONS.find((region) => region.id === id)?.label ?? "草原角落";
}

function photoTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

export function PhotoMapPanel() {
  const urlsRef = useRef<string[]>([]);
  const [moments, setMoments] = useState<PhotoMomentView[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [regionId, setRegionId] = useState<PhotoRegionId>("beijing");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    const records = await listPhotoMoments();
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    const next = records.map((record) => ({
      ...record,
      imageUrl: URL.createObjectURL(record.image)
    }));
    urlsRef.current = next.map((record) => record.imageUrl);
    setMoments(next);
  }, []);

  useEffect(() => {
    void refresh().catch(() => setError("本机照片足迹暂时无法打开。"));
    return () => {
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      urlsRef.current = [];
    };
  }, [refresh]);

  const momentsByRegion = useMemo(() => {
    const groups = new Map<PhotoRegionId, PhotoMomentView[]>();
    moments.forEach((moment) => {
      const group = groups.get(moment.regionId) ?? [];
      group.push(moment);
      groups.set(moment.regionId, group);
    });
    return groups;
  }, [moments]);

  function openComposer(nextRegion: PhotoRegionId = "beijing") {
    setRegionId(nextRegion);
    setFile(null);
    setCaption("");
    setError("");
    setComposerOpen(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("先选择一张照片，再把它贴到足迹里。");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const moment = await addPhotoMoment(file, regionId, caption);
      await refresh();
      setSelectedId(moment.id);
      setFile(null);
      setCaption("");
      setComposerOpen(false);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "";
      setError(
        message === "PHOTO_TOO_LARGE"
          ? "照片不能超过 10 MB。"
          : message === "PHOTO_TYPE_UNSUPPORTED"
            ? "请选择浏览器可读取的 JPG、PNG 或 WebP 图片。"
            : "这张照片暂时没有贴进去，请换一张再试。"
      );
    } finally {
      setSaving(false);
    }
  }

  const selected = moments.find((moment) => moment.id === selectedId) ?? null;

  return (
    <section className="photo-map" aria-labelledby="photo-map-title">
      <div className="photo-map__heading">
        <div>
          <p className="eyebrow">共同足迹 · 仅自己可见</p>
          <h2 id="photo-map-title">把照片贴回它发生的地方</h2>
        </div>
        <button className="photo-map__add" onClick={() => openComposer()}>
          <AppIcon icon={Camera} size={18} />
          贴照片
        </button>
      </div>
      <p className="photo-map__intro">
        选择照片后手动标记省份或地区。这里只保存省级位置和重绘后的压缩照片，不保存精确坐标、原文件或 EXIF。
      </p>

      <div className="photo-map__atlas" aria-label="共同旅行照片手账">
        <img src="/scene/travel-atlas-bg.webp" alt="暖色草原旅行手账底板" />
        <div className="photo-map__atlas-title" aria-hidden="true">
          <strong>共同足迹</strong>
          <span>{moments.length ? `已经贴下 ${moments.length} 张` : "从一张照片开始"}</span>
        </div>
        <div className="photo-map__atlas-photos">
          {moments.slice(0, 8).map((moment, index) => (
            <button
              className={`photo-map__polaroid photo-map__polaroid--${(index % 4) + 1}`}
              key={moment.id}
              aria-label={`查看${regionLabel(moment.regionId)}的照片`}
              onClick={() => setSelectedId(moment.id)}
            >
              <img src={moment.imageUrl} alt="" />
              <small>{regionLabel(moment.regionId)}</small>
            </button>
          ))}
        </div>
        <button
          className="photo-map__grassland-pocket"
          onClick={() => {
            const latest = momentsByRegion.get("grassland")?.[0];
            if (latest) setSelectedId(latest.id);
            else openComposer("grassland");
          }}
        >
          <AppIcon icon={MapPinned} size={18} />
          <span>
            <strong>草原角落</strong>
            <small>没有地点的照片放这里</small>
          </span>
          {(momentsByRegion.get("grassland")?.length ?? 0) > 0 ? (
            <b>{momentsByRegion.get("grassland")?.length}</b>
          ) : null}
        </button>
      </div>

      <p className="photo-map__map-note">
        这是旅行手账，不是地图，也不展示行政边界或精确坐标；地区只作为你手动选择的照片标签。
      </p>
      {moments.length === 0 ? (
        <div className="photo-map__empty">
          <AppIcon icon={Navigation} size={22} />
          <p>足迹还是空的。选一张照片，再告诉飞马它发生在哪个省份或地区。</p>
        </div>
      ) : null}
      {error && !composerOpen ? (
        <p className="error-message" role="alert">
          {error}
        </p>
      ) : null}

      {composerOpen ? (
        <div className="interaction-backdrop" onPointerDown={() => setComposerOpen(false)}>
          <form
            className="photo-composer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="photo-composer-title"
            onSubmit={(event) => void save(event)}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <button
              className="interaction-sheet__close"
              type="button"
              aria-label="关闭照片编辑"
              onClick={() => setComposerOpen(false)}
            >
              <AppIcon icon={X} size={22} />
            </button>
            <p className="eyebrow">只保存在这台设备</p>
            <h2 id="photo-composer-title">贴下一张共同足迹</h2>
            <label>
              照片
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <label>
              这张照片发生在哪里
              <select
                value={regionId}
                onChange={(event) => setRegionId(event.target.value as PhotoRegionId)}
              >
                {PHOTO_REGIONS.map((region) => (
                  <option value={region.id} key={region.id}>
                    {region.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              留一句话（可选）
              <textarea
                maxLength={80}
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="比如：这天走了很远，但风很温柔。"
              />
            </label>
            <p className="photo-composer__privacy">
              不请求定位权限，不保存精确坐标；原照片不会上传，处理后也不会交给 AI。
            </p>
            {error ? (
              <p className="error-message" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" loading={saving}>
              贴到共同足迹
            </Button>
          </form>
        </div>
      ) : null}

      {selected ? (
        <div className="interaction-backdrop" onPointerDown={() => setSelectedId(null)}>
          <section
            className="photo-detail photo-detail--polaroid"
            role="dialog"
            aria-modal="true"
            aria-label="共同足迹照片"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <button
              className="interaction-sheet__close"
              aria-label="关闭照片"
              onClick={() => setSelectedId(null)}
            >
              <AppIcon icon={X} size={22} />
            </button>
            <img src={selected.imageUrl} alt={`${regionLabel(selected.regionId)}的共同足迹`} />
            <p className="eyebrow">
              {regionLabel(selected.regionId)} · {photoTime(selected.createdAt)}
            </p>
            <h2>{selected.caption || "一张只属于你们的生活照片"}</h2>
            <Button
              variant="tertiary"
              onClick={() =>
                void deletePhotoMoment(selected.id).then(async () => {
                  setSelectedId(null);
                  await refresh();
                })
              }
            >
              <AppIcon icon={Trash2} size={17} />
              从共同足迹移除
            </Button>
          </section>
        </div>
      ) : null}
    </section>
  );
}
