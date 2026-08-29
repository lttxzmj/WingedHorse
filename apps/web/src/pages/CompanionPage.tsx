import type { CompanionMessageRequest, CompanionMessageResponse } from "@wingedhorse/contracts";
import { WingedHorseCharacter } from "@wingedhorse/character-runtime";
import { CHARACTER_NAME, getResultProfile, ITEM_CATALOG, type ItemId } from "@wingedhorse/domain";
import { Button } from "@wingedhorse/ui";
import { BookOpen, ChevronDown, Heart, Info, Send, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { BackLink } from "../components/BackLink";
import { createClientId } from "../lib/clientId";
import { subscribeDeviceEvents } from "../lib/devices";
import { CompanionStreamError, streamCompanionMessage } from "../lib/companionStream";
import { useAppStore } from "../store/useAppStore";
import { useDigitalLife } from "../hooks/useDigitalLife";
import "../companion-experience.css";

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
        "你回来啦。我刚在帐篷旁边看了一会儿云，想先听听你今天过得怎么样。"
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
  const deviceId = useAppStore((state) => state.deviceId);
  const profile = result ? getResultProfile(result.typeId) : null;
  const companionName = CHARACTER_NAME;
  const lifeContextAvailable = Boolean(result && dailyPlan && worldContext);

  // 监听硬件实体触摸并注入对话流
  useEffect(() => {
    const targetDeviceId = deviceId || "lamp-001";
    const unsubscribe = subscribeDeviceEvents(targetDeviceId, (event) => {
      if (event.type === "touch_comfort") {
        setMessages((current) => [
          ...current,
          {
            id: createClientId(),
            role: "assistant",
            content: event.message
          }
        ]);
      }
    });
    return unsubscribe;
  }, [deviceId]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView?.({ block: "end", behavior: "smooth" });
  }, [messages.length, partialReply, sending]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const draftFromHome = sessionStorage.getItem("wingedhorse-companion-draft");
    if (!draftFromHome) return;
    setDraft(draftFromHome);
    sessionStorage.removeItem("wingedhorse-companion-draft");
  }, []);

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
    } catch (error) {
      const rateLimited =
        error instanceof CompanionStreamError && error.code === "COMPANION_RATE_LIMITED";
      setMessages((current) => [
        ...current,
        {
          id: createClientId(),
          role: "assistant",
          content: rateLimited
            ? "消息来得有点密，我们先停一小会儿。你刚才写下的话还在这里，不需要反复发送。"
            : LOCAL_REPLY,
          safety: "normal",
          source: "local-fallback"
        }
      ]);
      setDeliveryNotice(
        rateLimited
          ? `为避免重复调用，暂时没有发送到模型。约 ${error.retryAfterSeconds ?? 60} 秒后可以再试。`
          : "网络繁忙或回复异常，已切换为本地陪伴回复。你可以继续说。"
      );
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
    <main className="companion-page companion-page--warm-chat">
      <header
        className={`subpage-header companion-header ${result ? "" : "companion-header--generic"}`}
      >
        <BackLink to="/home" label="回到草原" />
        <div className="companion-header__identity">
          {result && profile ? (
            <WingedHorseCharacter
              typeId={result.typeId}
              mood={profile.mood}
              activity={sending && partialReply ? "talking" : draft.trim() ? "listening" : "idle"}
              alt=""
            />
          ) : (
            <img className="companion-header__mascot" src="/wingedhorse-icon.svg" alt="" />
          )}
          <div>
            <p className="eyebrow">{profile ? `${profile.name}状态` : "在草原"} · {CHARACTER_NAME}</p>
            <h1>{companionName}</h1>
            <p className="companion-presence">
              <span aria-hidden="true" /> 想和你说说话
            </p>
          </div>
        </div>
        <span className="ai-pill" aria-label="AI 陪伴伙伴">
          AI
        </span>
      </header>
      <details className="companion-safety">
        <summary>
          <ShieldCheck aria-hidden="true" size={16} />
          AI 陪伴，不替代专业支持
          <ChevronDown aria-hidden="true" size={16} />
        </summary>
        <p>
          它会犯错，不提供心理诊断或医疗建议。若你正处于紧急危险中，请联系身边可信任的人和当地紧急服务。
        </p>
      </details>
      <section className="chat-list" aria-live="polite" aria-label={`与 ${companionName} 的对话`}>
        <div className="companion-day-marker" aria-hidden="true">
          <span /> 今天 <span />
        </div>
        {latestLifeEvent ? (
          <button
            type="button"
            className="companion-context-note"
            onClick={() => setDraft(`聊聊刚才的「${latestLifeEvent.title}」`)}
          >
            <BookOpen aria-hidden="true" size={16} />
            <span>
              <strong>它刚刚写下了一件小事</strong>
              <small>{latestLifeEvent.title}</small>
            </span>
            <ChevronDown aria-hidden="true" size={16} />
          </button>
        ) : null}
        {messages.map((message) => (
          <article
            className={`chat-bubble chat-bubble--${message.role} ${message.safety && message.safety !== "normal" ? `chat-bubble--${message.safety}` : ""}`}
            key={message.id}
          >
            <span>{message.role === "assistant" ? companionName : "你"}</span>
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
            <span>{companionName}</span>
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
          "我有点累",
          "想说件小事",
          "陪我安静一下",
          "我们接下来做什么？",
          ...(Object.values(inventory).some(Boolean) ? ["背包里有什么？"] : []),
          ...(latestLifeEvent ? [`聊聊刚才的「${latestLifeEvent.title}」`] : [])
        ].map((prompt) => (
          <button key={prompt} onClick={() => setDraft(prompt)}>
            {prompt}
          </button>
        ))}
      </div>
      <form className="chat-composer" onSubmit={(event) => void send(event)}>
        <label htmlFor="chat-message" className="sr-only">
          想说什么都可以
        </label>
        <textarea
          id="chat-message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={1200}
          rows={1}
          placeholder="和它说点什么……"
        />
        <div className="chat-composer__footer">
          <details className="chat-consent-options">
            <summary>
              <Info aria-hidden="true" size={15} />
              <span className="chat-consent-options__label">本次发送范围</span>
              <span className="chat-consent-options__state">
                {memoryEnabled || lifeContextEnabled
                  ? `已带入 ${Number(memoryEnabled) + Number(lifeContextEnabled)} 项`
                  : "默认仅此对话"}
              </span>
              <ChevronDown aria-hidden="true" size={15} />
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
            <Send aria-hidden="true" size={18} />
            发送
          </Button>
        </div>
        <p className="chat-composer__hint">
          <Heart aria-hidden="true" size={14} /> 你可以随时停下，也可以只说一句。
        </p>
      </form>
    </main>
  );
}
