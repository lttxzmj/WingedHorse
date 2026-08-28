import type { CompanionMessageRequest, CompanionMessageResponse } from "@wingedhorse/contracts";
import { Button } from "@wingedhorse/ui";
import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useAppStore } from "../store/useAppStore";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  safety?: "normal" | "concern" | "urgent";
}

const LOCAL_REPLY =
  "我暂时连不上远处的 AI 服务，但还在这里。你可以先用一句话说说现在最占脑子的事；如果不想说，也可以回草坪休息。";

export function CompanionPage() {
  const sessionId = useRef(crypto.randomUUID());
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "hello",
      role: "assistant",
      content:
        "嗨，我是 AI 飞马，不是真人或心理咨询师。今天想让我安静听你说，还是一起把一件事拆小一点？"
    }
  ]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [memoryEnabled, setMemoryEnabled] = useState(false);
  const memories = useAppStore((state) => state.memories);
  const latestLifeEvent = useAppStore((state) => state.lifeEvents[0]);
  const addMemory = useAppStore((state) => state.addMemory);

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content };
    const history = messages
      .slice(-10)
      .map(({ role, content: previous }) => ({ role, content: previous }));
    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setSending(true);
    const payload: CompanionMessageRequest = {
      sessionId: sessionId.current,
      message: content,
      history,
      memoryEnabled,
      memories: memoryEnabled ? memories.map((memory) => memory.content) : []
    };
    try {
      const response = await fetch("/api/companion/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("COMPANION_UNAVAILABLE");
      const data = (await response.json()) as CompanionMessageResponse;
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.reply,
          safety: data.safetyLevel
        }
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "assistant", content: LOCAL_REPLY, safety: "normal" }
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="companion-page">
      <header className="subpage-header companion-header">
        <Link to="/home">←</Link>
        <div>
          <p className="eyebrow">AI 伙伴 · 飞马</p>
          <h1>说两句也好</h1>
        </div>
        <span className="ai-pill">AI</span>
      </header>
      <aside className="ai-boundary">
        它会犯错，不提供心理诊断或医疗建议。紧急危险请联系现实中的人和当地紧急服务。
      </aside>
      <section className="chat-list" aria-live="polite" aria-label="与 AI 飞马的对话">
        {messages.map((message) => (
          <article
            className={`chat-bubble chat-bubble--${message.role} ${message.safety === "urgent" ? "chat-bubble--urgent" : ""}`}
            key={message.id}
          >
            <span>{message.role === "assistant" ? "AI 飞马" : "你"}</span>
            <p>{message.content}</p>
            {message.role === "user" && memoryEnabled ? (
              <button className="remember-message" onClick={() => addMemory(message.content)}>
                把这句话记在本机
              </button>
            ) : null}
          </article>
        ))}
        {sending ? (
          <article className="chat-bubble chat-bubble--assistant">
            <span>AI 飞马</span>
            <p className="typing-dots" aria-label="正在回复">
              •••
            </p>
          </article>
        ) : null}
      </section>
      <div className="prompt-chips" aria-label="快捷开场">
        {[
          "今天有点累",
          "我脑子很乱",
          "陪我安静一下",
          ...(latestLifeEvent ? [`聊聊刚才的「${latestLifeEvent.title}」`] : [])
        ].map((prompt) => (
          <button key={prompt} onClick={() => setDraft(prompt)}>
            {prompt}
          </button>
        ))}
      </div>
      <form className="chat-composer" onSubmit={(event) => void send(event)}>
        <label htmlFor="chat-message">想说什么都可以</label>
        <textarea
          id="chat-message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={1200}
          rows={3}
          placeholder="不用组织得很完整……"
        />
        <div>
          <label className="memory-toggle">
            <input
              type="checkbox"
              checked={memoryEnabled}
              onChange={(event) => setMemoryEnabled(event.target.checked)}
            />
            本次允许带入已保存记忆
          </label>
          <Button type="submit" loading={sending} disabled={!draft.trim()}>
            发送
          </Button>
        </div>
      </form>
    </main>
  );
}
