import { Button, Card } from "@wingedhorse/ui";
import { Link } from "@tanstack/react-router";
import { Archive } from "lucide-react";
import { useState } from "react";
import { AppIcon } from "../components/AppIcon";
import { BackLink } from "../components/BackLink";
import { useAppStore } from "../store/useAppStore";

export function MemoriesPage() {
  const memories = useAppStore((state) => state.memories);
  const updateMemory = useAppStore((state) => state.updateMemory);
  const deleteMemory = useAppStore((state) => state.deleteMemory);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  return (
    <main className="settings-page">
      <header className="subpage-header">
        <BackLink to="/settings" label="返回设置" />
        <div>
          <p className="eyebrow">本机长期记忆</p>
          <h1>飞马记住了什么</h1>
        </div>
        <span>{memories.length}/20</span>
      </header>
      <p className="section-intro">
        只有你在聊天中主动点“记住”的句子会出现在这里。它们保存在当前浏览器，可随时改掉或删除。
      </p>
      {memories.length ? (
        memories.map((memory) => (
          <Card className="memory-card" key={memory.id}>
            {editing === memory.id ? (
              <>
                <textarea
                  maxLength={240}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />
                <div>
                  <Button
                    onClick={() => {
                      if (draft.trim()) updateMemory(memory.id, draft);
                      setEditing(null);
                    }}
                  >
                    保存
                  </Button>
                  <Button variant="tertiary" onClick={() => setEditing(null)}>
                    取消
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p>{memory.content}</p>
                <small>{new Date(memory.createdAt).toLocaleDateString("zh-CN")}</small>
                <div>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setDraft(memory.content);
                      setEditing(memory.id);
                    }}
                  >
                    修改
                  </Button>
                  <Button variant="tertiary" onClick={() => deleteMemory(memory.id)}>
                    删除
                  </Button>
                </div>
              </>
            )}
          </Card>
        ))
      ) : (
        <section className="empty-state">
          <span className="empty-state__icon">
            <AppIcon icon={Archive} size={42} />
          </span>
          <h2>还没有保存任何记忆</h2>
          <p>空着也很好。你不需要为了让 AI 懂你而交出更多信息。</p>
          <Link className="ui-button ui-button--primary inline-link-button" to="/companion">
            去聊天
          </Link>
        </section>
      )}
    </main>
  );
}
