type OptionRecord = { id: string; text: string; isCorrect: boolean };
type QuestionRecord = {
  id: string;
  points: number;
  type: "SINGLE" | "MULTIPLE" | "SHORT_TEXT";
  options: OptionRecord[];
};
type GradeInput = {
  selectedOptionIds: string[];
  textResponse: string | null;
};

function normalize(text: string) {
  return text.trim().toLowerCase();
}

export function gradeAnswer(question: QuestionRecord, input: GradeInput) {
  if (question.type === "SHORT_TEXT") {
    const accepted = question.options.map((o) => normalize(o.text));
    const response = normalize(input.textResponse ?? "");
    const isCorrect = response.length > 0 && accepted.includes(response);
    return { isCorrect, pointsAwarded: isCorrect ? question.points : 0 };
  }

  const correctIds = new Set(
    question.options.filter((o) => o.isCorrect).map((o) => o.id),
  );
  const selectedIds = new Set(input.selectedOptionIds);

  if (question.type === "SINGLE") {
    const isCorrect =
      correctIds.size === selectedIds.size &&
      [...correctIds].every((id) => selectedIds.has(id));
    return { isCorrect, pointsAwarded: isCorrect ? question.points : 0 };
  }

  // MULTIPLE: proportional partial credit — correct picks minus incorrect
  // picks, as a fraction of how many options were actually correct.
  const hits = [...selectedIds].filter((id) => correctIds.has(id)).length;
  const misses = [...selectedIds].filter((id) => !correctIds.has(id)).length;
  const fraction =
    correctIds.size === 0
      ? 0
      : Math.max(0, Math.min(1, (hits - misses) / correctIds.size));
  const pointsAwarded = Math.round(question.points * fraction);
  const isCorrect = fraction === 1;

  return { isCorrect, pointsAwarded };
}

export function isPartialCredit(answer: { isCorrect: boolean; pointsAwarded: number }) {
  return !answer.isCorrect && answer.pointsAwarded > 0;
}
