import { questionSetV1, scoreAssessment } from "@wingedhorse/domain";
import { Button } from "@wingedhorse/ui";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../store/useAppStore";

export function AssessmentPage() {
  const navigate = useNavigate();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const answers = useAppStore((state) => state.answers);
  const index = useAppStore((state) => state.assessmentIndex);
  const setAnswer = useAppStore((state) => state.setAnswer);
  const setIndex = useAppStore((state) => state.setAssessmentIndex);
  const setResult = useAppStore((state) => state.setResult);
  const [error, setError] = useState("");
  const safeIndex = Math.min(index, questionSetV1.questions.length - 1);
  const question = questionSetV1.questions[safeIndex];

  useEffect(() => { headingRef.current?.focus(); }, [safeIndex]);
  if (!question) return null;

  const selected = answers[question.id];
  const isLast = safeIndex === questionSetV1.questions.length - 1;
  const progress = ((safeIndex + 1) / questionSetV1.questions.length) * 100;

  function goBack() {
    setError("");
    if (safeIndex === 0) void navigate({ to: "/" });
    else setIndex(safeIndex - 1);
  }
  function goNext() {
    if (!selected) { setError("先选一个最像你的答案吧。"); return; }
    setError("");
    if (!isLast) { setIndex(safeIndex + 1); return; }
    setResult(scoreAssessment(questionSetV1, answers));
    void navigate({ to: "/result" });
  }

  return (
    <main className="assessment-page">
      <header className="assessment-header">
        <button className="icon-button" onClick={goBack} aria-label="返回上一页">←</button>
        <div className="progress-block">
          <div className="progress-label"><span>{question.scene}</span><span>第 {safeIndex + 1}/{questionSetV1.questions.length} 题</span></div>
          <div className="progress-track" role="progressbar" aria-valuemin={1} aria-valuemax={17} aria-valuenow={safeIndex + 1} aria-label="测评进度">
            <span style={{ width: String(progress) + "%" }} />
          </div>
        </div>
      </header>
      <section className="question-panel" aria-describedby={error ? "answer-error" : undefined}>
        <p className="question-panel__scene">{question.scene}</p>
        <h1 ref={headingRef} tabIndex={-1}>{question.prompt}</h1>
        <div className="question-options" role="radiogroup" aria-label={question.prompt}>
          {question.options.map((option, optionIndex) => {
            const active = selected === option.id;
            return (
              <button key={option.id} className={"question-option" + (active ? " question-option--selected" : "")} role="radio" aria-checked={active}
                onClick={() => { setAnswer(question.id, option.id); setError(""); }}>
                <span className="question-option__key" aria-hidden="true">{String.fromCharCode(65 + optionIndex)}</span>
                <span>{option.label}</span>
                <span className="question-option__check" aria-hidden="true">{active ? "✓" : ""}</span>
              </button>
            );
          })}
        </div>
        <p id="answer-error" className="field-error" aria-live="polite">{error}</p>
      </section>
      <footer className="assessment-actions">
        <Button variant="secondary" onClick={goBack}>{safeIndex === 0 ? "暂时退出" : "上一题"}</Button>
        <Button onClick={goNext} disabled={!selected}>{isLast ? "看看我是哪种牛马" : "下一题"}</Button>
      </footer>
    </main>
  );
}
