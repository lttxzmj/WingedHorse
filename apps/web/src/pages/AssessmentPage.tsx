import { currentQuestionSet, scoreAssessment } from "@wingedhorse/domain";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../store/useAppStore";

function stableHash(value: string) {
  let result = 2166136261;
  for (const character of value) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

export function AssessmentPage() {
  const navigate = useNavigate();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const answers = useAppStore((state) => state.answers);
  const index = useAppStore((state) => state.assessmentIndex);
  const setAnswer = useAppStore((state) => state.setAnswer);
  const setIndex = useAppStore((state) => state.setAssessmentIndex);
  const setResult = useAppStore((state) => state.setResult);
  const assessmentOptionSeed = useAppStore((state) => state.assessmentOptionSeed);
  const ensureAssessmentVersion = useAppStore((state) => state.ensureAssessmentVersion);
  const [error, setError] = useState("");
  const [advancing, setAdvancing] = useState(false);
  const advanceTimer = useRef<number | null>(null);
  const safeIndex = Math.min(index, currentQuestionSet.questions.length - 1);
  const question = currentQuestionSet.questions[safeIndex];

  useEffect(() => {
    headingRef.current?.focus();
  }, [safeIndex]);
  useEffect(() => {
    ensureAssessmentVersion(currentQuestionSet.version);
  }, [ensureAssessmentVersion]);
  useEffect(
    () => () => {
      if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    },
    []
  );
  if (!question) return null;
  const questionId = question.id;

  const selected = answers[question.id];
  const isLast = safeIndex === currentQuestionSet.questions.length - 1;
  const progress = ((safeIndex + 1) / currentQuestionSet.questions.length) * 100;
  const options = [...question.options].sort(
    (left, right) =>
      stableHash(`${assessmentOptionSeed}:${question.id}:${left.id}`) -
      stableHash(`${assessmentOptionSeed}:${question.id}:${right.id}`)
  );

  function goBack() {
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    setAdvancing(false);
    setError("");
    if (safeIndex === 0) void navigate({ to: "/" });
    else setIndex(safeIndex - 1);
  }
  function chooseOption(optionId: string) {
    if (advancing) return;
    const nextAnswers = { ...answers, [questionId]: optionId };
    setAnswer(questionId, optionId);
    setError("");
    setAdvancing(true);
    advanceTimer.current = window.setTimeout(() => {
      if (isLast) {
        setResult(scoreAssessment(currentQuestionSet, nextAnswers));
        void navigate({ to: "/result" });
      } else {
        setIndex(safeIndex + 1);
        setAdvancing(false);
      }
    }, 320);
  }

  return (
    <main className="assessment-page">
      <header className="assessment-header">
        <button className="icon-button" onClick={goBack} aria-label="返回上一页">
          ←
        </button>
        <div className="progress-block">
          <div className="progress-label">
            <span>{question.scene}</span>
            <span>
              第 {safeIndex + 1}/{currentQuestionSet.questions.length} 题
            </span>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={17}
            aria-valuenow={safeIndex + 1}
            aria-label="测评进度"
          >
            <span style={{ width: String(progress) + "%" }} />
          </div>
        </div>
      </header>
      <section className="question-panel" aria-describedby={error ? "answer-error" : undefined}>
        <p className="question-panel__scene">{question.scene}</p>
        <h1 ref={headingRef} tabIndex={-1}>
          {question.prompt}
        </h1>
        <p className="question-panel__hint">选最常发生的你，不是最理想的你</p>
        <div className="question-options" role="radiogroup" aria-label={question.prompt}>
          {options.map((option, optionIndex) => {
            const active = selected === option.id;
            return (
              <button
                key={option.id}
                className={"question-option" + (active ? " question-option--selected" : "")}
                role="radio"
                aria-checked={active}
                disabled={advancing}
                onClick={() => chooseOption(option.id)}
              >
                <span className="question-option__key" aria-hidden="true">
                  {String.fromCharCode(65 + optionIndex)}
                </span>
                <span>{option.label}</span>
                <span className="question-option__check" aria-hidden="true">
                  {active ? "✓" : ""}
                </span>
              </button>
            );
          })}
        </div>
        <p id="answer-error" className="field-error" aria-live="polite">
          {error}
        </p>
      </section>
      <p className="assessment-auto-hint" aria-live="polite">
        {advancing
          ? isLast
            ? "正在生成你的牛马图鉴…"
            : "已选择，进入下一幕…"
          : "选择后自动进入下一题"}
      </p>
    </main>
  );
}
