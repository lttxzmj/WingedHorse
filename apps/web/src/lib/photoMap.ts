import { createClientId } from "./clientId";

export const PHOTO_REGIONS = [
  { id: "heilongjiang", label: "黑龙江", x: 82, y: 13 },
  { id: "jilin", label: "吉林", x: 80, y: 22 },
  { id: "liaoning", label: "辽宁", x: 75, y: 30 },
  { id: "neimenggu", label: "内蒙古", x: 55, y: 24 },
  { id: "xinjiang", label: "新疆", x: 15, y: 34 },
  { id: "gansu", label: "甘肃", x: 40, y: 40 },
  { id: "ningxia", label: "宁夏", x: 47, y: 43 },
  { id: "qinghai", label: "青海", x: 31, y: 51 },
  { id: "xizang", label: "西藏", x: 19, y: 62 },
  { id: "beijing", label: "北京", x: 69, y: 36 },
  { id: "tianjin", label: "天津", x: 72, y: 40 },
  { id: "hebei", label: "河北", x: 65, y: 41 },
  { id: "shanxi", label: "山西", x: 57, y: 44 },
  { id: "shaanxi", label: "陕西", x: 50, y: 52 },
  { id: "shandong", label: "山东", x: 70, y: 48 },
  { id: "henan", label: "河南", x: 60, y: 52 },
  { id: "anhui", label: "安徽", x: 65, y: 59 },
  { id: "jiangsu", label: "江苏", x: 71, y: 58 },
  { id: "shanghai", label: "上海", x: 75, y: 64 },
  { id: "zhejiang", label: "浙江", x: 70, y: 68 },
  { id: "fujian", label: "福建", x: 66, y: 75 },
  { id: "jiangxi", label: "江西", x: 60, y: 69 },
  { id: "hubei", label: "湖北", x: 57, y: 61 },
  { id: "hunan", label: "湖南", x: 54, y: 69 },
  { id: "sichuan", label: "四川", x: 40, y: 62 },
  { id: "chongqing", label: "重庆", x: 48, y: 64 },
  { id: "guizhou", label: "贵州", x: 46, y: 71 },
  { id: "yunnan", label: "云南", x: 36, y: 77 },
  { id: "guangxi", label: "广西", x: 48, y: 79 },
  { id: "guangdong", label: "广东", x: 58, y: 80 },
  { id: "hongkong", label: "香港", x: 60, y: 84 },
  { id: "macau", label: "澳门", x: 56, y: 84 },
  { id: "hainan", label: "海南", x: 53, y: 91 },
  { id: "taiwan", label: "台湾", x: 74, y: 79 },
  { id: "grassland", label: "草原角落", x: 88, y: 91 }
] as const;

export type PhotoRegionId = (typeof PHOTO_REGIONS)[number]["id"];

export interface PhotoMoment {
  id: string;
  regionId: PhotoRegionId;
  caption: string;
  createdAt: string;
  image: Blob;
}

type StoredPhotoMoment = Omit<PhotoMoment, "regionId"> & {
  regionId?: string;
  landmarkId?: string;
};

function isPhotoRegionId(value: string | undefined): value is PhotoRegionId {
  return PHOTO_REGIONS.some((region) => region.id === value);
}

export function normalizePhotoMoment(moment: StoredPhotoMoment): PhotoMoment {
  return {
    id: moment.id,
    regionId: isPhotoRegionId(moment.regionId) ? moment.regionId : "grassland",
    caption: moment.caption,
    createdAt: moment.createdAt,
    image: moment.image
  };
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
          (request.result as StoredPhotoMoment[])
            .map(normalizePhotoMoment)
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
