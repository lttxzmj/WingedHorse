import {
  companionResponseSchema,
  type CompanionMessageRequest,
  type CompanionMessageResponse
} from "@wingedhorse/contracts";
import { ITEM_CATALOG, type ItemId } from "@wingedhorse/domain";
import { Button } from "@wingedhorse/ui";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createClientId } from "../lib/clientId";
import { useAppStore } from "../store/useAppStore";
import { useDigitalLife } from "../hooks/useDigitalLife";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  safety?: "normal" | "concern" | "urgent";
}

const LOCAL_REPLY =
  "我暂时连不上远处的 AI 服务，但还在这里。你可以先用一句话说说现在最占脑子的事；如果不想说，也可以回草原休息。";
const COMPANION_TIMEOUT_MS = 18_000;

export function CompanionPage() {
  useDigitalLife();
  const sessionId = useRef(createClientId());
  const abortRef = useRef<AbortController | null>(null);
  const listEndRef = useRef<HTMLDivElement>(null);
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
  const [lifeContextEnabled, setLifeContextEnabled] = useState(false);
  const [deliveryNotice, setDeliveryNotice] = useState("");
  const memories = useAppStore((state) => state.memories);
  const latestLifeEvent = useAppStore((state) => state.lifeEvents[0]);
  const result = useAppStore((state) => state.result);
  const dailyPlan = useAppStore((state) => state.dailyPlan);
  const worldContext = useAppStore((state) => state.worldContext);
  const petVitals = useAppStore((state) => state.petVitals);
  const relationshipXp = useAppStore((state) => state.relationshipXp);
  const lifeEvents = useAppStore((state) => state.lifeEvents);
  const inventory = useAppStore((state) => state.inventory);
  const addMemory = useAppStore((state) => state.addMemory);

  useEffect(() => {
    listEndRef.current?.scrollIntoView?.({ block: "end", behavior: "smooth" });
  }, [messages.length, sending]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    const userMessage: ChatMessage = { id: createClientId(), role: "user", content };
    const history = messages
      .slice(-10)
      .map(({ role, content: previous }) => ({ role, content: previous }));
    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setSending(true);
    setDeliveryNotice("");
    const payload: CompanionMessageRequest = {
      sessionId: sessionId.current,
      message: content,
      history,
      memoryEnabled,
      memories: memoryEnabled ? memories.map((memory) => memory.content) : [],
      ...(lifeContextEnabled && result && dailyPlan && worldContext
        ? {
            lifeContext: {
              typeId: result.typeId,
              world: worldContext,
              plan: dailyPlan,
              vitals: petVitals,
              relationshipXp,
              recentEvents: lifeEvents
                .slice(0, 6)
                .map(({ title, body, occurredAt }) => ({ title, body, occurredAt })),
              inventory: Object.entries(inventory)
                .filter((entry): entry is [ItemId, number] => Boolean(entry[1]))
                .slice(0, 12)
                .map(([id, count]) => ({ name: ITEM_CATALOG[id].name, count }))
            }
          }
        : {})
    };
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), COMPANION_TIMEOUT_MS);
    abortRef.current = controller;
    try {
      const response = await fetch("/api/companion/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      if (!response.ok) throw new Error("COMPANION_UNAVAILABLE");
      const parsed = companionResponseSchema.safeParse(await response.json());
      if (!parsed.success || !parsed.data.reply.trim())
        throw new Error("COMPANION_INVALID_RESPONSE");
      const data: CompanionMessageResponse = parsed.data;
      setMessages((current) => [
        ...current,
        {
          id: createClientId(),
          role: "assistant",
          content: data.reply,
          safety: data.safetyLevel
        }
      ]);
      if (data.source === "local-fallback") {
        setDeliveryNotice("远端回复暂时不可用，已切换为本地陪伴回复。");
      }
    } catch {
      setMessages((current) => [
        ...current,
        { id: createClientId(), role: "assistant", content: LOCAL_REPLY, safety: "normal" }
      ]);
      setDeliveryNotice("网络繁忙或回复异常，已切换为本地陪伴回复。你可以继续说。");
    } finally {
      window.clearTimeout(timeout);
      if (abortRef.current === controller) {
        abortRef.current = null;
        setSending(false);
      }
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
        <div ref={listEndRef} aria-hidden="true" />
      </section>
      {deliveryNotice ? (
        <p className="chat-delivery-notice" role="status">
          {deliveryNotice}
        </p>
      ) : null}
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
        <div className="chat-composer__footer">
          <div className="chat-consent-options">
            <label className="memory-toggle">
              <input
                type="checkbox"
                checked={memoryEnabled}
                onChange={(event) => setMemoryEnabled(event.target.checked)}
              />
              本次允许带入已保存记忆
            </label>
            <label className="memory-toggle">
              <input
                type="checkbox"
                checked={lifeContextEnabled}
                onChange={(event) => setLifeContextEnabled(event.target.checked)}
              />
              本次允许把生活簿与养成状态发送给 WingedHorse 服务端（不会发送给 OpenRouter）
            </label>
          </div>
          <Button type="submit" loading={sending} disabled={!draft.trim()}>
            发送
          </Button>
        </div>
      </form>
    </main>
  );
}
