import { createClientId } from "./clientId";

export const PHOTO_LANDMARKS = [
  { id: "tent", label: "帐篷营地", x: 18, y: 18 },
  { id: "pond", label: "静风湖", x: 72, y: 20 },
  { id: "supply", label: "补给站", x: 80, y: 48 },
  { id: "flower", label: "花坡", x: 70, y: 76 },
  { id: "cloud", label: "看云空地", x: 26, y: 66 }
] as const;

export type PhotoLandmarkId = (typeof PHOTO_LANDMARKS)[number]["id"];

export interface PhotoMoment {
  id: string;
  landmarkId: PhotoLandmarkId;
  caption: string;
  createdAt: string;
  image: Blob;
}

const DB_NAME = "wingedhorse-private-photo-map";
const STORE_NAME = "moments";
const DB_VERSION = 1;
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
          (request.result as PhotoMoment[]).sort((left, right) =>
            right.createdAt.localeCompare(left.createdAt)
          )
        );
      request.onerror = () => reject(request.error ?? new Error("PHOTO_DB_READ_FAILED"));
    });
  } finally {
    database.close();
  }
}

export async function addPhotoMoment(file: File, landmarkId: PhotoLandmarkId, caption: string) {
  const image = await sanitizePhoto(file);
  const moment: PhotoMoment = {
    id: createClientId(),
    landmarkId,
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
