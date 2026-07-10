"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Option = { id: string; text: string };
type Question = {
  id: string;
  text: string;
  type: "SINGLE" | "MULTIPLE";
  points: number;
  options: Option[];
};
type Exam = {
  id: string;
  title: string;
  description: string;
  questions: Question[];
};

type Props = {
  attemptId: string;
  deadline: string;
  exam: Exam;
  initialAnswers: Record<string, string[]>;
};

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ExamTaker({ attemptId, deadline, exam, initialAnswers }: Props) {
  const router = useRouter();
  const deadlineMs = new Date(deadline).getTime();
  const [answers, setAnswers] = useState<Record<string, string[]>>(initialAnswers);
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000)),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittedRef = useRef(false);

  const submit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: exam.questions.map((q) => ({
            questionId: q.id,
            selectedOptionIds: answers[q.id] ?? [],
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to submit");
        submittedRef.current = false;
        return;
      }
      router.push(`/student/exams/${exam.id}/result`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }, [attemptId, answers, exam.id, exam.questions, router]);

  useEffect(() => {
    const interval = setInterval(() => {
      const secondsLeft = Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000));
      setRemaining(secondsLeft);
      if (secondsLeft <= 0) {
        clearInterval(interval);
        submit();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [deadlineMs, submit]);

  function selectSingle(questionId: string, optionId: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: [optionId] }));
  }

  function toggleMultiple(questionId: string, optionId: string) {
    setAnswers((prev) => {
      const current = prev[questionId] ?? [];
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return { ...prev, [questionId]: next };
    });
  }

  const isLowTime = remaining <= 60;

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div>
          <h1 className="font-semibold">{exam.title}</h1>
          <p className="text-xs text-neutral-500">
            {exam.questions.length} question{exam.questions.length === 1 ? "" : "s"}
          </p>
        </div>
        <div
          className={`rounded-md px-3 py-1.5 text-sm font-mono font-medium ${
            isLowTime ? "bg-red-100 text-red-700" : "bg-neutral-100 text-neutral-700"
          }`}
        >
          {formatTime(remaining)}
        </div>
      </div>

      {exam.description && <p className="text-sm text-neutral-500">{exam.description}</p>}

      <div className="space-y-4">
        {exam.questions.map((q, index) => (
          <div key={q.id} className="rounded-lg border border-neutral-200 bg-white shadow-sm p-4">
            <p className="text-sm text-neutral-500">
              Q{index + 1} · {q.points} pt{q.points === 1 ? "" : "s"} ·{" "}
              {q.type === "SINGLE" ? "Choose one" : "Choose all that apply"}
            </p>
            <p className="font-medium mt-1 mb-3">{q.text}</p>
            <div className="space-y-2">
              {q.options.map((opt) => {
                const checked = (answers[q.id] ?? []).includes(opt.id);
                return (
                  <label
                    key={opt.id}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer ${
                      checked ? "border-indigo-600 bg-neutral-50" : "border-neutral-200"
                    }`}
                  >
                    <input
                      type={q.type === "SINGLE" ? "radio" : "checkbox"}
                      name={q.id}
                      checked={checked}
                      onChange={() =>
                        q.type === "SINGLE"
                          ? selectSingle(q.id, opt.id)
                          : toggleMultiple(q.id, opt.id)
                      }
                    />
                    {opt.text}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={submit}
        disabled={submitting}
        className="w-full rounded-md bg-indigo-600 py-3 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {submitting ? "Submitting..." : "Submit exam"}
      </button>
    </div>
  );
}
