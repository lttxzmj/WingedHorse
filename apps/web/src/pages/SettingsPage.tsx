import type { DeviceStatus } from "@wingedhorse/contracts";
import { getResultProfile } from "@wingedhorse/domain";
import { Button, Card } from "@wingedhorse/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { AppIcon } from "../components/AppIcon";
import { BackLink } from "../components/BackLink";
import { trackEvent } from "../lib/analytics";
import { createUserDataExport, downloadUserDataExport } from "../lib/dataExport";
import { fetchDeviceStatus, hardwareApiEnabled } from "../lib/devices";
import { deleteRemoteLifeData, hasVisitorToken } from "../lib/lifeApi";
import { clearPhotoMoments } from "../lib/photoMap";
import { useAppStore } from "../store/useAppStore";

export function SettingsPage() {
  const navigate = useNavigate();
  const result = useAppStore((state) => state.result);
  const answered = useAppStore((state) => Object.keys(state.answers).length);
  const resetAssessment = useAppStore((state) => state.resetAssessment);
  const resetAll = useAppStore((state) => state.resetAll);
  const hardwareLink = useAppStore((state) => state.hardwareLink);
  const setHardwareLink = useAppStore((state) => state.setHardwareLink);
  const deviceId = useAppStore((state) => state.deviceId);
  const setDeviceId = useAppStore((state) => state.setDeviceId);
  const lifeSyncEnabled = useAppStore((state) => state.lifeSyncEnabled);
  const setLifeSyncEnabled = useAppStore((state) => state.setLifeSyncEnabled);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [exported, setExported] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null);

  useEffect(() => {
    if (!hardwareLink || !deviceId.trim()) {
      setDeviceStatus(null);
      return;
    }
    let cancelled = false;
    const load = () => {
      void fetchDeviceStatus(deviceId).then((status) => {
        if (!cancelled) setDeviceStatus(status);
      });
    };
    load();
    const timer = window.setInterval(load, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [hardwareLink, deviceId]);
  return (
    <main className="settings-page">
      <header className="subpage-header">
        <BackLink to="/home" label="回到草原" />
        <div>
          <p className="eyebrow">设置与边界</p>
          <h1>你的数据由你决定</h1>
        </div>
        <span>v0.1</span>
      </header>
      <Card className="settings-card">
        <div>
          <h2>娱乐问卷</h2>
          <p>
            {result
              ? `你现在是「${getResultProfile(result.typeId).name}」。类型只会在你主动重测时改变，结果只作轻松参考。`
              : answered > 0
                ? "你还有未完成的问卷。结果只作轻松参考，不是心理或职业建议。"
                : "17 题，大约 90 秒。结果只作轻松参考，不是心理或职业建议。"}
          </p>
        </div>
        <div className="settings-links">
          {result ? (
            <>
              <Link to="/result">查看结果</Link>
              <button
                type="button"
                onClick={() => {
                  resetAssessment();
                  trackEvent("assessment_start");
                  void navigate({ to: "/assessment" });
                }}
              >
                重新测一次
              </button>
            </>
          ) : (
            <Link
              to="/assessment"
              onClick={() => {
                trackEvent("assessment_start");
              }}
            >
              {answered > 0 ? "继续测测" : "开始测测"}
            </Link>
          )}
        </div>
      </Card>
      <Card className="settings-card">
        <div>
          <h2>密友</h2>
          <p>最多 6 人。加入后可互看对方设为「密友可见」的朋友圈动态。</p>
        </div>
        <Link to="/friends">去邀请</Link>
      </Card>
      <Card className="settings-card">
        <div>
          <h2>朋友圈备份</h2>
          <p>
            默认只留在这台浏览器。打开后，生活事件会用随机访客凭证备份到服务端，不会自动发给
            OpenRouter。
          </p>
        </div>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={lifeSyncEnabled}
            onChange={(event) => setLifeSyncEnabled(event.target.checked)}
          />
          允许备份朋友圈
        </label>
      </Card>
      <Card className="settings-card">
        <div>
          <h2>导出我的数据</h2>
          <p>
            下载这台设备上的问卷、结果、背包、养成、朋友圈、记忆和设置。不含匿名凭证、内部会话 ID
            或原始媒体。
          </p>
        </div>
        <Button
          variant="tertiary"
          onClick={() => {
            downloadUserDataExport(createUserDataExport(useAppStore.getState()));
            setExported(true);
          }}
        >
          下载 JSON 文件
        </Button>
        {exported ? <p role="status">当前设备的数据已导出。</p> : null}
      </Card>
      <Card className="settings-card">
        <div>
          <h2>云端游戏与背包</h2>
          <p>
            待开放。接通后只会把物品、四项养成值、场次、得分和匿名会话发到服务端，用来防止重复发奖并保存背包；不会发给
            OpenRouter。需要你单独同意。
          </p>
        </div>
        <label className="settings-toggle">
          <input type="checkbox" checked={false} disabled readOnly />
          尚未授权：保持本地模式
        </label>
      </Card>
      <Card className="settings-card">
        <div>
          <h2>AI 与长期记忆</h2>
          <p>
            来来是
            AI，不是真人。聊天不长期保存；只有你点「记住」的句子留在这台浏览器。远处模型有每日次数，用完后仍可本地陪伴。
          </p>
        </div>
        <div className="settings-links">
          <Link to="/memories">管理记忆</Link>
          <Link to="/ai-notice">查看 AI 说明</Link>
        </div>
      </Card>
      <Card className="settings-card">
        <div>
          <h2>摄像头与状态线索</h2>
          <p>只在你主动打开的单次体验里使用。画面不上传、不保存；离开或点停止即结束。</p>
        </div>
        <Link to="/signals">
          管理与体验 <AppIcon icon={ArrowRight} size={16} />
        </Link>
      </Card>
      <Card className="settings-card">
        <div>
          <h2>联动硬件（心情灯）</h2>
          <p>
            可选：把你的心情标签同步给已配对的智能灯。只传派生标签，不上传视频、表情或心率原始数据；关闭即停止。
          </p>
        </div>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={hardwareApiEnabled && hardwareLink}
            disabled={!hardwareApiEnabled}
            onChange={(event) => setHardwareLink(event.target.checked)}
          />
          {hardwareApiEnabled ? "允许同步心情给硬件" : "生产环境暂未开放硬件配对"}
        </label>
        {hardwareApiEnabled && hardwareLink ? (
          <div className="settings-input">
            <label htmlFor="device-id">设备 ID</label>
            <input
              id="device-id"
              value={deviceId}
              onChange={(event) => setDeviceId(event.target.value)}
              placeholder="如 lamp-001"
            />
            {deviceId.trim() ? (
              <p className="settings-device-status" role="status">
                {deviceStatus
                  ? deviceStatus.online
                    ? "设备当前在线，最近有上报。"
                    : deviceStatus.lastSeenAt
                      ? `设备当前离线，上次上报 ${new Date(deviceStatus.lastSeenAt).toLocaleString("zh-CN", { hour12: false })}。`
                      : "尚未收到这台设备的上报。"
                  : "正在查询这台设备是否在线。"}
              </p>
            ) : (
              <p className="settings-device-status">填写设备 ID 后，可查看是否在线。</p>
            )}
          </div>
        ) : null}
      </Card>
      <Card className="settings-card">
        <div>
          <h2>协议与隐私</h2>
          <p>娱乐问卷、第三方 AI、敏感信息和你的权利。</p>
        </div>
        <div className="settings-links">
          <Link to="/privacy">隐私说明</Link>
          <Link to="/terms">用户协议</Link>
        </div>
      </Card>
      <Card className="settings-card settings-card--danger">
        <div>
          <h2>清除本机数据</h2>
          <p>
            删除问卷、结果、背包、养成、记忆、手动心情和本机足迹。若服务端有朋友圈或玩家状态副本，会先删掉。此操作无法撤销。
          </p>
        </div>
        {confirming ? (
          <div className="danger-actions">
            <Button
              variant="destructive"
              loading={deleting}
              onClick={() => {
                setDeleting(true);
                setDeleteError("");
                void Promise.all([
                  hasVisitorToken() ? deleteRemoteLifeData() : Promise.resolve(),
                  clearPhotoMoments()
                ])
                  .then(() => {
                    resetAll();
                    void navigate({ to: "/" });
                  })
                  .catch(() => {
                    setDeleteError("服务端副本暂时无法删除，本机数据尚未清除。请稍后重试。");
                  })
                  .finally(() => setDeleting(false));
              }}
            >
              确认全部清除
            </Button>
            <Button variant="tertiary" onClick={() => setConfirming(false)}>
              取消
            </Button>
          </div>
        ) : (
          <Button variant="tertiary" onClick={() => setConfirming(true)}>
            清除本机数据
          </Button>
        )}
        {deleteError ? (
          <p className="settings-error" role="alert">
            {deleteError}
          </p>
        ) : null}
      </Card>
    </main>
  );
}
