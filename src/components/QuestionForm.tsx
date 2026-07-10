"use client";

import { useState } from "react";

export type OptionDraft = { text: string; isCorrect: boolean };
export type QuestionType = "SINGLE" | "MULTIPLE" | "SHORT_TEXT";
export type QuestionDraft = {
  text: string;
  type: QuestionType;
  points: number;
  options: OptionDraft[];
};

type Props = {
  initial?: QuestionDraft;
  onSubmit: (draft: QuestionDraft) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
};

const TYPE_LABELS: Record<QuestionType, string> = {
  SINGLE: "Single choice",
  MULTIPLE: "Multiple choice",
  SHORT_TEXT: "Short text answer",
};

export function QuestionForm({ initial, onSubmit, onCancel, submitLabel }: Props) {
  const [text, setText] = useState(initial?.text ?? "");
  const [type, setType] = useState<QuestionType>(initial?.type ?? "SINGLE");
  const [points, setPoints] = useState(initial?.points ?? 1);
  const [options, setOptions] = useState<OptionDraft[]>(
    initial?.options ?? [
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ],
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const minOptions = type === "SHORT_TEXT" ? 1 : 2;

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
    if (options.length <= minOptions) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  function changeType(nextType: QuestionType) {
    setType(nextType);
    if (nextType === "SHORT_TEXT") {
      setOptions((prev) => prev.map((o) => ({ ...o, isCorrect: true })).slice(0, 1));
    } else if (nextType === "SINGLE") {
      setOptions((prev) => {
        const padded = prev.length >= 2 ? prev : [...prev, { text: "", isCorrect: false }];
        const firstCorrect = padded.findIndex((o) => o.isCorrect);
        const keepIndex = firstCorrect === -1 ? 0 : firstCorrect;
        return padded.map((o, i) => ({ ...o, isCorrect: i === keepIndex }));
      });
    } else {
      setOptions((prev) =>
        prev.length >= 2 ? prev : [...prev, { text: "", isCorrect: false }],
      );
    }
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
      className="space-y-4 rounded-lg border border-border bg-muted p-4"
    >
      <div>
        <label className="block text-sm font-medium mb-1">Question text</label>
        <textarea
          required
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => changeType(e.target.value as QuestionType)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          >
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
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
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>
      </div>

      {type === "SHORT_TEXT" ? (
        <div>
          <label className="block text-sm font-medium mb-2">
            Accepted answers (matches are case-insensitive; any one of these counts as correct)
          </label>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  required
                  value={opt.text}
                  onChange={(e) => updateOption(i, { text: e.target.value })}
                  placeholder={`Accepted answer ${i + 1}`}
                  className="flex-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  disabled={options.length <= minOptions}
                  className="text-sm text-muted-foreground hover:text-destructive-foreground disabled:opacity-30"
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
              className="mt-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              + Add accepted answer
            </button>
          )}
        </div>
      ) : (
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
                  className="flex-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  disabled={options.length <= minOptions}
                  className="text-sm text-muted-foreground hover:text-destructive-foreground disabled:opacity-30"
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
              className="mt-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              + Add option
            </button>
          )}
          {type === "MULTIPLE" && (
            <p className="mt-2 text-xs text-muted-foreground">
              Partial credit is awarded automatically: points scale with how many correct
              options were picked, minus wrong picks.
            </p>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive-foreground">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {loading ? "Saving..." : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
