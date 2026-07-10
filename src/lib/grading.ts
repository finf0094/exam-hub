type OptionRecord = { id: string; isCorrect: boolean };
type QuestionRecord = { id: string; points: number; options: OptionRecord[] };

export function gradeAnswer(question: QuestionRecord, selectedOptionIds: string[]) {
  const correctIds = new Set(
    question.options.filter((o) => o.isCorrect).map((o) => o.id),
  );
  const selectedIds = new Set(selectedOptionIds);

  const isCorrect =
    correctIds.size === selectedIds.size &&
    [...correctIds].every((id) => selectedIds.has(id));

  return {
    isCorrect,
    pointsAwarded: isCorrect ? question.points : 0,
  };
}
