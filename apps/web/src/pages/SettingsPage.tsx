import { Button, Card } from "@wingedhorse/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { deleteRemoteLifeData } from "../lib/lifeApi";
import { useAppStore } from "../store/useAppStore";

export function SettingsPage() {
  const navigate = useNavigate();
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
  return (
    <main className="settings-page">
      <header className="subpage-header">
        <Link to="/home">←</Link>
        <div>
          <p className="eyebrow">设置与边界</p>
          <h1>你的数据由你决定</h1>
        </div>
        <span>v0.1</span>
      </header>
      <Card className="settings-card">
        <div>
          <h2>私密生活簿备份</h2>
          <p>
            默认只保存在当前浏览器。开启后，结构化生活事件会用随机访客凭证备份到 WingedHorse
            服务端，不会自动发送给 OpenRouter。
          </p>
        </div>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={lifeSyncEnabled}
            onChange={(event) => setLifeSyncEnabled(event.target.checked)}
          />
          允许备份私密生活簿
        </label>
      </Card>
      <Card className="settings-card">
        <div>
          <h2>AI 与长期记忆</h2>
          <p>AI 飞马会明确标识身份。聊天记录不持久保存；只有你主动点“记住”的句子留在当前浏览器。</p>
        </div>
        <div className="settings-links">
          <Link to="/memories">管理记忆</Link>
          <Link to="/ai-notice">查看 AI 说明</Link>
        </div>
      </Card>
      <Card className="settings-card">
        <div>
          <h2>摄像头与状态线索</h2>
          <p>
            只在你主动授权的单次体验中使用。原始帧不上传、不落盘；关闭页面或点击停止会立即停止轨道。
          </p>
        </div>
        <Link to="/signals">管理与体验 →</Link>
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
            checked={hardwareLink}
            onChange={(event) => setHardwareLink(event.target.checked)}
          />
          允许同步心情给硬件
        </label>
        {hardwareLink ? (
          <div className="settings-input">
            <label htmlFor="device-id">设备 ID</label>
            <input
              id="device-id"
              value={deviceId}
              onChange={(event) => setDeviceId(event.target.value)}
              placeholder="如 lamp-001"
            />
          </div>
        ) : null}
      </Card>
      <Card className="settings-card">
        <div>
          <h2>协议与隐私</h2>
          <p>了解娱乐测评、第三方 AI、敏感信息和用户权利的边界。</p>
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
            删除问卷草稿、结果、背包、养成状态和手动心情；如启用了生活簿备份，也会先删除服务端副本。本操作无法撤销。
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
                void (lifeSyncEnabled ? deleteRemoteLifeData() : Promise.resolve())
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
