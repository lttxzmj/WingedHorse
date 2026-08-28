import type { CompanionMessageRequest, CompanionMessageResponse } from "@wingedhorse/contracts";
import { WingedHorseCharacter } from "@wingedhorse/character-runtime";
import { getResultProfile, ITEM_CATALOG, type ItemId } from "@wingedhorse/domain";
import { Button } from "@wingedhorse/ui";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { BackLink } from "../components/BackLink";
import { createClientId } from "../lib/clientId";
import { streamCompanionMessage } from "../lib/companionStream";
import { useAppStore } from "../store/useAppStore";
import { useDigitalLife } from "../hooks/useDigitalLife";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  safety?: "normal" | "concern" | "urgent";
  source?: CompanionMessageResponse["source"];
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
  const [partialReply, setPartialReply] = useState("");
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
  const manualMood = useAppStore((state) => state.manualMood);
  const addMemory = useAppStore((state) => state.addMemory);
  const profile = result ? getResultProfile(result.typeId) : null;
  const companionName = profile?.name ?? "飞马";
  const lifeContextAvailable = Boolean(result && dailyPlan && worldContext);

  useEffect(() => {
    listEndRef.current?.scrollIntoView?.({ block: "end", behavior: "smooth" });
  }, [messages.length, partialReply, sending]);

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
    setPartialReply("");
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
        : {}),
      ...(lifeContextEnabled && manualMood ? { moodHint: manualMood } : {})
    };
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), COMPANION_TIMEOUT_MS);
    abortRef.current = controller;
    try {
      const data = await streamCompanionMessage(payload, setPartialReply, controller.signal);
      setMessages((current) => [
        ...current,
        {
          id: createClientId(),
          role: "assistant",
          content: data.reply,
          safety: data.safetyLevel,
          source: data.source
        }
      ]);
      if (data.source === "local-fallback") {
        setDeliveryNotice("远端回复暂时不可用，已切换为本地陪伴回复。");
      }
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: createClientId(),
          role: "assistant",
          content: LOCAL_REPLY,
          safety: "normal",
          source: "local-fallback"
        }
      ]);
      setDeliveryNotice("网络繁忙或回复异常，已切换为本地陪伴回复。你可以继续说。");
    } finally {
      window.clearTimeout(timeout);
      if (abortRef.current === controller) {
        abortRef.current = null;
        setPartialReply("");
        setSending(false);
      }
    }
  };

  return (
    <main className="companion-page">
      <header
        className={`subpage-header companion-header ${result ? "" : "companion-header--generic"}`}
      >
        <BackLink to="/home" label="回到草原" />
        {result && profile ? (
          <WingedHorseCharacter typeId={result.typeId} mood={profile.mood} alt="" />
        ) : null}
        <div>
          <p className="eyebrow">AI 伙伴 · {companionName}</p>
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
            className={`chat-bubble chat-bubble--${message.role} ${message.safety && message.safety !== "normal" ? `chat-bubble--${message.safety}` : ""}`}
            key={message.id}
          >
            <span>{message.role === "assistant" ? `AI · ${companionName}` : "你"}</span>
            <p>{message.content}</p>
            {message.role === "assistant" && message.source ? (
              <small className="chat-source">
                {message.source === "domain-grounded"
                  ? "依据你本次允许使用的生活事实 · 未发送给 OpenRouter"
                  : message.source === "safety-flow"
                    ? "WingedHorse 安全流程 · 未调用模型"
                    : message.source === "openrouter"
                      ? "由当前 OpenRouter 模型生成"
                      : "WingedHorse 本地降级回复"}
              </small>
            ) : null}
            {message.role === "user" ? (
              <button
                className="remember-message"
                disabled={
                  memories.some((memory) => memory.content === message.content) ||
                  memories.length >= 20
                }
                onClick={() => addMemory(message.content)}
              >
                {memories.some((memory) => memory.content === message.content)
                  ? "已记在本机"
                  : memories.length >= 20
                    ? "本机记忆已满"
                    : "把这句话记在本机"}
              </button>
            ) : null}
          </article>
        ))}
        {sending ? (
          <article className="chat-bubble chat-bubble--assistant">
            <span>AI · {companionName}</span>
            {partialReply ? (
              <p aria-label="正在回复">{partialReply}</p>
            ) : (
              <p className="typing-dots" aria-label="正在回复">
                •••
              </p>
            )}
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
          "我们接下来做什么？",
          "陪我安静一下",
          ...(Object.values(inventory).some(Boolean) ? ["背包里有什么？"] : []),
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
          <details className="chat-consent-options">
            <summary>
              本次发送范围
              <span>
                {memoryEnabled || lifeContextEnabled
                  ? `已选择 ${Number(memoryEnabled) + Number(lifeContextEnabled)} 项`
                  : "默认不带入额外资料"}
              </span>
            </summary>
            <div>
              <p>每次进入对话都默认关闭；勾选只对当前页面会话生效。</p>
              <label className="memory-toggle">
                <input
                  type="checkbox"
                  checked={memoryEnabled}
                  onChange={(event) => setMemoryEnabled(event.target.checked)}
                />
                已保存记忆 → WingedHorse 服务端与当前 OpenRouter 模型
              </label>
              <label className="memory-toggle">
                <input
                  type="checkbox"
                  checked={lifeContextEnabled}
                  onChange={(event) => setLifeContextEnabled(event.target.checked)}
                  disabled={!lifeContextAvailable}
                />
                {lifeContextAvailable
                  ? "生活簿、养成状态与手动心情 → 仅 WingedHorse 服务端"
                  : "生活状态正在准备 → 暂不可选择"}
              </label>
            </div>
          </details>
          <Button type="submit" loading={sending} disabled={!draft.trim()}>
            发送
          </Button>
        </div>
      </form>
    </main>
  );
}
