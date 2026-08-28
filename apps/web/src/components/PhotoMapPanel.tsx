import { Button } from "@wingedhorse/ui";
import { Camera, MapPin, Navigation, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  addPhotoMoment,
  deletePhotoMoment,
  listPhotoMoments,
  PHOTO_LANDMARKS,
  type PhotoLandmarkId,
  type PhotoMoment
} from "../lib/photoMap";
import { AppIcon } from "./AppIcon";

interface PhotoMomentView extends PhotoMoment {
  imageUrl: string;
}

function landmarkLabel(id: PhotoLandmarkId) {
  return PHOTO_LANDMARKS.find((landmark) => landmark.id === id)?.label ?? "共同草原";
}

function photoTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function PhotoMapPanel() {
  const urlsRef = useRef<string[]>([]);
  const [moments, setMoments] = useState<PhotoMomentView[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [landmarkId, setLandmarkId] = useState<PhotoLandmarkId>("tent");
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
    void refresh().catch(() => setError("本机照片地图暂时无法打开。"));
    return () => {
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      urlsRef.current = [];
    };
  }, [refresh]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("先选择一张照片，再把它放进地图。");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const moment = await addPhotoMoment(file, landmarkId, caption);
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
            : "这张照片暂时没有放进去，请换一张再试。"
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
          <p className="eyebrow">只属于你们的足迹</p>
          <h2 id="photo-map-title">把一张今天放进草原</h2>
        </div>
        <button className="photo-map__add" onClick={() => setComposerOpen(true)}>
          <AppIcon icon={Camera} size={18} />
          放照片
        </button>
      </div>
      <p className="photo-map__intro">
        选择虚构地标，不记录现实坐标。图片会先在本机重绘、移除原文件元数据并压缩。
      </p>
      <div className="photo-map__canvas">
        <img
          src="/scene/private-photo-map.webp"
          alt="帐篷、静风湖、补给站、花坡和看云空地组成的共同草原地图"
        />
        {PHOTO_LANDMARKS.map((landmark) => {
          const moment = moments.find((item) => item.landmarkId === landmark.id);
          return (
            <button
              className={`photo-map__pin ${moment ? "has-photo" : ""}`}
              style={{ left: `${landmark.x}%`, top: `${landmark.y}%` }}
              key={landmark.id}
              aria-label={moment ? `查看${landmark.label}的照片` : `在${landmark.label}放一张照片`}
              onClick={() => {
                if (moment) setSelectedId(moment.id);
                else {
                  setLandmarkId(landmark.id);
                  setComposerOpen(true);
                }
              }}
            >
              {moment ? <img src={moment.imageUrl} alt="" /> : <AppIcon icon={MapPin} size={21} />}
              <span>{landmark.label}</span>
            </button>
          );
        })}
      </div>
      {moments.length === 0 ? (
        <div className="photo-map__empty">
          <AppIcon icon={Navigation} size={22} />
          <p>地图还是空的。可以从帐篷开始，放进第一张不需要公开的生活照片。</p>
        </div>
      ) : null}
      {error ? (
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
            <h2 id="photo-composer-title">把一张生活放进草原</h2>
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
              放在哪里
              <select
                value={landmarkId}
                onChange={(event) => setLandmarkId(event.target.value as PhotoLandmarkId)}
              >
                {PHOTO_LANDMARKS.map((landmark) => (
                  <option value={landmark.id} key={landmark.id}>
                    {landmark.label}
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
                placeholder="比如：今天的风终于没催我。"
              />
            </label>
            <p className="photo-composer__privacy">
              不会读取真实位置；原照片不会上传，处理后也不会交给 AI。
            </p>
            {error ? (
              <p className="error-message" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" loading={saving}>
              放进草原
            </Button>
          </form>
        </div>
      ) : null}

      {selected ? (
        <div className="interaction-backdrop" onPointerDown={() => setSelectedId(null)}>
          <section
            className="photo-detail"
            role="dialog"
            aria-modal="true"
            aria-label="地图照片"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <button
              className="interaction-sheet__close"
              aria-label="关闭照片"
              onClick={() => setSelectedId(null)}
            >
              <AppIcon icon={X} size={22} />
            </button>
            <img src={selected.imageUrl} alt="共同草原地图中的生活照片" />
            <p className="eyebrow">
              {landmarkLabel(selected.landmarkId)} · {photoTime(selected.createdAt)}
            </p>
            <h2>{selected.caption || "一张没有公开的生活照片"}</h2>
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
              从地图移除
            </Button>
          </section>
        </div>
      ) : null}
    </section>
  );
}
