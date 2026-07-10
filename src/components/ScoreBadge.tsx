import { isPartialCredit } from "@/lib/grading";

export function ScoreBadge({
  isCorrect,
  pointsAwarded,
}: {
  isCorrect: boolean;
  pointsAwarded: number;
}) {
  const partial = isPartialCredit({ isCorrect, pointsAwarded });
  const className = isCorrect
    ? "bg-success text-success-foreground"
    : partial
      ? "bg-warning text-warning-foreground"
      : "bg-destructive text-destructive-foreground";
  const label = isCorrect
    ? `+${pointsAwarded} pts`
    : partial
      ? `+${pointsAwarded} pts (partial)`
      : "0 pts";

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

export function PercentageBadge({ score, totalPoints }: { score: number; totalPoints: number }) {
  const percentage = totalPoints === 0 ? 0 : Math.round((score / totalPoints) * 100);
  return (
    <span className="text-muted-foreground">
      {score} / {totalPoints} ({percentage}%)
    </span>
  );
}
