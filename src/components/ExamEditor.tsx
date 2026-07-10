"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QuestionForm, type QuestionDraft } from "@/components/QuestionForm";

type Option = { id: string; text: string; isCorrect: boolean };
type Question = {
  id: string;
  text: string;
  type: "SINGLE" | "MULTIPLE";
  points: number;
  order: number;
  options: Option[];
};
type Exam = {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  startAt: string;
  endAt: string;
  isPublished: boolean;
  questions: Question[];
};

function toLocalInputValue(iso: string) {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export function ExamEditor({ exam: initialExam }: { exam: Exam }) {
  const router = useRouter();
  const [exam, setExam] = useState(initialExam);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [savingMeta, setSavingMeta] = useState(false);
  const [togglingPublish, setTogglingPublish] = useState(false);

  const [title, setTitle] = useState(initialExam.title);
  const [description, setDescription] = useState(initialExam.description);
  const [durationMinutes, setDurationMinutes] = useState(initialExam.durationMinutes);
  const [startAt, setStartAt] = useState(toLocalInputValue(initialExam.startAt));
  const [endAt, setEndAt] = useState(toLocalInputValue(initialExam.endAt));

  async function saveMeta(e: React.FormEvent) {
    e.preventDefault();
    setMetaError(null);
    setSavingMeta(true);
    try {
      const res = await fetch(`/api/exams/${exam.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, durationMinutes, startAt, endAt }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMetaError(data.error ?? "Failed to save");
        return;
      }
      setExam((prev) => ({ ...prev, title: data.title, description: data.description, durationMinutes: data.durationMinutes, startAt: data.startAt, endAt: data.endAt }));
      router.refresh();
    } finally {
      setSavingMeta(false);
    }
  }

  async function togglePublish() {
    setPublishError(null);
    setTogglingPublish(true);
    try {
      const res = await fetch(`/api/exams/${exam.id}/publish`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !exam.isPublished }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPublishError(data.error ?? "Failed to update");
        return;
      }
      setExam((prev) => ({ ...prev, isPublished: data.isPublished }));
      router.refresh();
    } finally {
      setTogglingPublish(false);
    }
  }

  async function handleAddQuestion(draft: QuestionDraft) {
    const res = await fetch(`/api/exams/${exam.id}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to add question");
    setExam((prev) => ({ ...prev, questions: [...prev.questions, data] }));
    setAddingQuestion(false);
    router.refresh();
  }

  async function handleEditQuestion(questionId: string, draft: QuestionDraft) {
    const res = await fetch(`/api/exams/${exam.id}/questions/${questionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to save question");
    setExam((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => (q.id === questionId ? data : q)),
    }));
    setEditingQuestionId(null);
    router.refresh();
  }

  async function handleDeleteQuestion(questionId: string) {
    if (!confirm("Delete this question?")) return;
    const res = await fetch(`/api/exams/${exam.id}/questions/${questionId}`, {
      method: "DELETE",
    });
    if (!res.ok) return;
    setExam((prev) => ({
      ...prev,
      questions: prev.questions.filter((q) => q.id !== questionId),
    }));
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/teacher/exams" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Back to exams
        </Link>
        <div className="mt-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{exam.title}</h1>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                exam.isPublished ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {exam.isPublished ? "Published" : "Draft"}
            </span>
            <button
              onClick={togglePublish}
              disabled={togglingPublish}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
            >
              {exam.isPublished ? "Unpublish" : "Publish"}
            </button>
          </div>
        </div>
        {publishError && <p className="mt-2 text-sm text-red-600">{publishError}</p>}
      </div>

      <form onSubmit={saveMeta} className="space-y-4 rounded-lg border border-neutral-200 bg-white shadow-sm p-4">
        <h2 className="font-medium">Exam details</h2>
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Duration (min)</label>
            <input
              type="number"
              min={1}
              max={480}
              required
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Available from</label>
            <input
              type="datetime-local"
              required
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Available until</label>
            <input
              type="datetime-local"
              required
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        {metaError && <p className="text-sm text-red-600">{metaError}</p>}
        <button
          type="submit"
          disabled={savingMeta}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {savingMeta ? "Saving..." : "Save details"}
        </button>
      </form>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium">
            Questions ({exam.questions.length}, {exam.questions.reduce((sum, q) => sum + q.points, 0)} pts total)
          </h2>
          {!addingQuestion && (
            <button
              onClick={() => setAddingQuestion(true)}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              + Add question
            </button>
          )}
        </div>

        <div className="space-y-3">
          {exam.questions.map((q, index) => (
            <div key={q.id}>
              {editingQuestionId === q.id ? (
                <QuestionForm
                  submitLabel="Save question"
                  initial={{
                    text: q.text,
                    type: q.type,
                    points: q.points,
                    options: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
                  }}
                  onSubmit={(draft) => handleEditQuestion(q.id, draft)}
                  onCancel={() => setEditingQuestionId(null)}
                />
              ) : (
                <div className="rounded-lg border border-neutral-200 bg-white shadow-sm p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-neutral-500">
                        Q{index + 1} · {q.type === "SINGLE" ? "Single choice" : "Multiple choice"} · {q.points} pt
                        {q.points === 1 ? "" : "s"}
                      </p>
                      <p className="font-medium mt-1">{q.text}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => setEditingQuestionId(q.id)}
                        className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="text-sm font-medium text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <ul className="mt-3 space-y-1">
                    {q.options.map((o) => (
                      <li
                        key={o.id}
                        className={`text-sm rounded px-2 py-1 ${
                          o.isCorrect ? "bg-green-50 text-green-800" : "text-neutral-600"
                        }`}
                      >
                        {o.isCorrect ? "✓ " : "· "}
                        {o.text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}

          {exam.questions.length === 0 && !addingQuestion && (
            <div className="rounded-md border border-dashed border-neutral-300 py-10 text-center text-neutral-500">
              No questions yet. Add one to get started.
            </div>
          )}

          {addingQuestion && (
            <QuestionForm
              submitLabel="Add question"
              onSubmit={handleAddQuestion}
              onCancel={() => setAddingQuestion(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
