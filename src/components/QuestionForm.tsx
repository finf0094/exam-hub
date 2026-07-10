"use client";

import { useState } from "react";

export type OptionDraft = { text: string; isCorrect: boolean };
export type QuestionDraft = {
  text: string;
  type: "SINGLE" | "MULTIPLE";
  points: number;
  options: OptionDraft[];
};

type Props = {
  initial?: QuestionDraft;
  onSubmit: (draft: QuestionDraft) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
};

export function QuestionForm({ initial, onSubmit, onCancel, submitLabel }: Props) {
  const [text, setText] = useState(initial?.text ?? "");
  const [type, setType] = useState<"SINGLE" | "MULTIPLE">(initial?.type ?? "SINGLE");
  const [points, setPoints] = useState(initial?.points ?? 1);
  const [options, setOptions] = useState<OptionDraft[]>(
    initial?.options ?? [
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ],
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function updateOption(index: number, patch: Partial<OptionDraft>) {
    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  }

  function toggleCorrect(index: number) {
    if (type === "SINGLE") {
      setOptions((prev) => prev.map((o, i) => ({ ...o, isCorrect: i === index })));
    } else {
      updateOption(index, { isCorrect: !options[index].isCorrect });
    }
  }

  function addOption() {
    if (options.length >= 10) return;
    setOptions((prev) => [...prev, { text: "", isCorrect: false }]);
  }

  function removeOption(index: number) {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onSubmit({ text, type, points, options });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-md border border-neutral-300 bg-neutral-50 p-4"
    >
      <div>
        <label className="block text-sm font-medium mb-1">Question text</label>
        <textarea
          required
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => {
              const nextType = e.target.value as "SINGLE" | "MULTIPLE";
              setType(nextType);
              if (nextType === "SINGLE") {
                setOptions((prev) => {
                  const firstCorrect = prev.findIndex((o) => o.isCorrect);
                  const keepIndex = firstCorrect === -1 ? 0 : firstCorrect;
                  return prev.map((o, i) => ({ ...o, isCorrect: i === keepIndex }));
                });
              }
            }}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="SINGLE">Single choice</option>
            <option value="MULTIPLE">Multiple choice</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Points</label>
          <input
            type="number"
            min={1}
            max={100}
            required
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Options ({type === "SINGLE" ? "select one correct answer" : "select all correct answers"})
        </label>
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type={type === "SINGLE" ? "radio" : "checkbox"}
                name="correct-option"
                checked={opt.isCorrect}
                onChange={() => toggleCorrect(i)}
              />
              <input
                required
                value={opt.text}
                onChange={(e) => updateOption(i, { text: e.target.value })}
                placeholder={`Option ${i + 1}`}
                className="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => removeOption(i)}
                disabled={options.length <= 2}
                className="text-sm text-neutral-400 hover:text-red-600 disabled:opacity-30"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        {options.length < 10 && (
          <button
            type="button"
            onClick={addOption}
            className="mt-2 text-sm font-medium text-neutral-600 hover:text-neutral-900"
          >
            + Add option
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Saving..." : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-medium text-neutral-500 hover:text-neutral-900"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
