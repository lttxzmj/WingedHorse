import { CHARACTER_NAME, PRODUCT_NAME } from "@wingedhorse/domain";
import { Button } from "@wingedhorse/ui";
import { useState } from "react";
import { BackLink } from "../components/BackLink";
import { trackEvent } from "../lib/analytics";
import { visitorHeaders } from "../lib/lifeApi";

export function IntentPage() {
  const [contact, setContact] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  return (
    <main className="settings-page">
      <header className="subpage-header">
        <BackLink to="/" label="回到首页" />
        <div>
          <p className="eyebrow">{PRODUCT_NAME}</p>
          <h1>把{CHARACTER_NAME}带回家</h1>
        </div>
        <span aria-hidden="true" />
      </header>
      <p>留微信或邮箱。不是下单。</p>
      {done ? (
        <p role="status">收到了。</p>
      ) : (
        <form
          className="settings-card"
          onSubmit={(event) => {
            event.preventDefault();
            const value = contact.trim().slice(0, 80);
            if (!value || submitting) return;
            setSubmitting(true);
            setError("");
            void fetch("/api/intents", {
              method: "POST",
              headers: visitorHeaders(),
              body: JSON.stringify({ contact: value })
            })
              .then((response) => {
                if (!response.ok) throw new Error("INTENT_UNAVAILABLE");
                trackEvent("intent_submit");
                setDone(true);
              })
              .catch(() => {
                setError("暂时没记下，请稍后再试。");
              })
              .finally(() => setSubmitting(false));
          }}
        >
          <label htmlFor="intent-contact">微信或邮箱</label>
          <input
            id="intent-contact"
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            required
            minLength={2}
            maxLength={80}
            autoComplete="off"
          />
          <Button type="submit" loading={submitting}>
            留下
          </Button>
          {error ? (
            <p className="settings-error" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      )}
    </main>
  );
}
