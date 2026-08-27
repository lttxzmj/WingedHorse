/**
 * 端侧表情线索（娱乐/趣味参考，非诊断）。
 * 输入为 MediaPipe Face Landmarker 输出的归一化关键点（478 点模型，前 468 点与 Face Mesh 一致）。
 * 通过几何启发式规则打标签，纯函数、可测试、不联网、不落盘。
 */

export interface FaceLandmark {
  x: number;
  y: number;
}

export const EXPRESSION_TAGS = ["smile", "frown", "surprise", "tired", "neutral"] as const;
export type ExpressionTag = (typeof EXPRESSION_TAGS)[number];

/** 关键点索引（MediaPipe Face Mesh 约定，均 < 468） */
const IDX = {
  lipTop: 13,
  lipBottom: 14,
  mouthLeft: 61,
  mouthRight: 291,
  leftEye: { outer: 33, inner: 133, top: 159, bottom: 145 },
  rightEye: { outer: 263, inner: 362, top: 386, bottom: 374 },
  leftBrowInner: 46,
  rightBrowInner: 276,
  noseTip: 1
} as const;

/** 启发式阈值（趣味级，非标定值；光线/角度会显著影响，结果仅供趣味参考） */
const THRESHOLD = {
  /** 眼睛闭合判为疲惫的眼裂比上限 */
  tiredEar: 0.2,
  /** 张嘴判为惊讶的嘴张比下限 */
  surpriseMar: 0.6,
  /** 嘴角明显上扬判为微笑的归一化抬升量 */
  smileLift: 0.03,
  /** 嘴角下压判为皱眉的归一化下沉量 */
  frownLift: -0.04,
  /** 眉头收紧判为皱眉的内眉距 / 瞳距 上限 */
  frownBrow: 0.72
} as const;

function distance(a: FaceLandmark, b: FaceLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function eyeAspectRatio(
  points: readonly FaceLandmark[],
  eye: { outer: number; inner: number; top: number; bottom: number }
): number {
  const vertical = distance(points[eye.top]!, points[eye.bottom]!);
  const horizontal = distance(points[eye.outer]!, points[eye.inner]!);
  return horizontal === 0 ? 1 : vertical / horizontal;
}

/** 归一化尺度：双眼内眼角距离，近似瞳距 */
function interocularDistance(points: readonly FaceLandmark[]): number {
  return distance(points[IDX.leftEye.inner]!, points[IDX.rightEye.inner]!);
}

/**
 * 依据归一化关键点打表情标签。
 * 判定顺序：疲惫(闭眼) → 惊讶(张嘴) → 微笑(嘴角上扬) → 皱眉(嘴角下压+眉头收紧) → 平静。
 * 关键点不足时返回 neutral。
 */
export function classifyExpression(points: readonly FaceLandmark[]): ExpressionTag {
  const required = 468;
  if (points.length < required) return "neutral";

  const iod = interocularDistance(points);
  if (iod < 1e-6) return "neutral";

  const mar = distance(points[IDX.lipTop]!, points[IDX.lipBottom]!) / distance(points[IDX.mouthLeft]!, points[IDX.mouthRight]!);
  const ear = (eyeAspectRatio(points, IDX.leftEye) + eyeAspectRatio(points, IDX.rightEye)) / 2;

  const lipCenterY = (points[IDX.lipTop]!.y + points[IDX.lipBottom]!.y) / 2;
  const cornerAvgY = (points[IDX.mouthLeft]!.y + points[IDX.mouthRight]!.y) / 2;
  const cornerLift = (lipCenterY - cornerAvgY) / iod;

  const browInner = distance(points[IDX.leftBrowInner]!, points[IDX.rightBrowInner]!) / iod;

  if (ear < THRESHOLD.tiredEar) return "tired";
  if (mar > THRESHOLD.surpriseMar) return "surprise";
  if (cornerLift > THRESHOLD.smileLift) return "smile";
  if (cornerLift < THRESHOLD.frownLift && browInner < THRESHOLD.frownBrow) return "frown";
  return "neutral";
}

/** 标签的中文展示文案（趣味措辞） */
export const EXPRESSION_LABEL: Record<ExpressionTag, string> = {
  smile: "像在微笑",
  frown: "眉头有点紧",
  surprise: "有点惊讶",
  tired: "看起来挺累",
  neutral: "表情平静"
};
