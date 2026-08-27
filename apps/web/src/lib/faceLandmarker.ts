import type { FaceLandmark } from "@wingedhorse/domain";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";

let landmarkerPromise: Promise<FaceLandmarker> | null = null;

async function getLandmarker(): Promise<FaceLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks("/wasm");
      return FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: "/models/face_landmarker.task", delegate: "GPU" },
        runningMode: "VIDEO",
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false
      });
    })();
  }
  return landmarkerPromise;
}

/**
 * 在浏览器端（本机）检测单张人脸关键点。仅在进入实验室时按需加载 WASM 与模型，
 * 不上传任何帧；失败或未授权时返回 null，调用方应回退到手动模式。
 */
export async function detectFaceLandmarks(
  video: HTMLVideoElement,
  timestampMs: number
): Promise<FaceLandmark[] | null> {
  try {
    const landmarker = await getLandmarker();
    const result = landmarker.detectForVideo(video, timestampMs);
    const landmarks = result.faceLandmarks[0];
    if (!landmarks || landmarks.length < 468) return null;
    return landmarks.map((landmark) => ({ x: landmark.x, y: landmark.y }));
  } catch {
    return null;
  }
}
