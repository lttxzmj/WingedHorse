import { createClientId } from "./clientId";

export const PHOTO_REGIONS = [
  { id: "heilongjiang", label: "黑龙江" },
  { id: "jilin", label: "吉林" },
  { id: "liaoning", label: "辽宁" },
  { id: "neimenggu", label: "内蒙古" },
  { id: "xinjiang", label: "新疆" },
  { id: "gansu", label: "甘肃" },
  { id: "ningxia", label: "宁夏" },
  { id: "qinghai", label: "青海" },
  { id: "xizang", label: "西藏" },
  { id: "beijing", label: "北京" },
  { id: "tianjin", label: "天津" },
  { id: "hebei", label: "河北" },
  { id: "shanxi", label: "山西" },
  { id: "shaanxi", label: "陕西" },
  { id: "shandong", label: "山东" },
  { id: "henan", label: "河南" },
  { id: "anhui", label: "安徽" },
  { id: "jiangsu", label: "江苏" },
  { id: "shanghai", label: "上海" },
  { id: "zhejiang", label: "浙江" },
  { id: "fujian", label: "福建" },
  { id: "jiangxi", label: "江西" },
  { id: "hubei", label: "湖北" },
  { id: "hunan", label: "湖南" },
  { id: "sichuan", label: "四川" },
  { id: "chongqing", label: "重庆" },
  { id: "guizhou", label: "贵州" },
  { id: "yunnan", label: "云南" },
  { id: "guangxi", label: "广西" },
  { id: "guangdong", label: "广东" },
  { id: "hongkong", label: "香港" },
  { id: "macau", label: "澳门" },
  { id: "hainan", label: "海南" },
  { id: "taiwan", label: "台湾" },
  { id: "grassland", label: "草原角落" }
] as const;

export type PhotoRegionId = (typeof PHOTO_REGIONS)[number]["id"];

export interface PhotoMoment {
  id: string;
  regionId: PhotoRegionId;
  caption: string;
  createdAt: string;
  image: Blob;
}

const DB_NAME = "wingedhorse-private-photo-map";
const STORE_NAME = "moments";
const DB_VERSION = 2;
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const MAX_EDGE = 1600;

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("PHOTO_DB_OPEN_FAILED"));
  });
}

function waitForTransaction(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("PHOTO_DB_WRITE_FAILED"));
    transaction.onabort = () => reject(transaction.error ?? new Error("PHOTO_DB_ABORTED"));
  });
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("PHOTO_DECODE_FAILED"));
    };
    image.src = url;
  });
}

export async function sanitizePhoto(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("PHOTO_TYPE_UNSUPPORTED");
  if (file.size > MAX_SOURCE_BYTES) throw new Error("PHOTO_TOO_LARGE");

  const image = await loadImage(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("PHOTO_CANVAS_UNAVAILABLE");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("PHOTO_ENCODE_FAILED"))),
      "image/webp",
      0.82
    );
  });
}

export async function listPhotoMoments() {
  const database = await openDatabase();
  try {
    return await new Promise<PhotoMoment[]>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
      request.onsuccess = () =>
        resolve(
          (request.result as Array<PhotoMoment & { landmarkId?: string }>)
            .map((moment) => ({
              ...moment,
              regionId: PHOTO_REGIONS.some((region) => region.id === moment.regionId)
                ? moment.regionId
                : "grassland"
            }))
            .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        );
      request.onerror = () => reject(request.error ?? new Error("PHOTO_DB_READ_FAILED"));
    });
  } finally {
    database.close();
  }
}

export async function addPhotoMoment(file: File, regionId: PhotoRegionId, caption: string) {
  const image = await sanitizePhoto(file);
  const moment: PhotoMoment = {
    id: createClientId(),
    regionId,
    caption: caption.trim().slice(0, 80),
    createdAt: new Date().toISOString(),
    image
  };
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(moment);
    await waitForTransaction(transaction);
    return moment;
  } finally {
    database.close();
  }
}

export async function deletePhotoMoment(id: string) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    await waitForTransaction(transaction);
  } finally {
    database.close();
  }
}

export async function clearPhotoMoments() {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).clear();
    await waitForTransaction(transaction);
  } finally {
    database.close();
  }
}
