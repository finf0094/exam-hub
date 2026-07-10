import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ examId: string }> };

export default async function ExamAnalyticsPage({ params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") redirect("/login");

  const { examId } = await params;

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      questions: { orderBy: { order: "asc" }, include: { options: true } },
      attempts: {
        where: { status: "GRADED" },
        include: { answers: { include: { selectedOptions: true } } },
      },
    },
  });

  if (!exam || exam.teacherId !== session.sub) notFound();

  const attemptCount = exam.attempts.length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <Link
        href={`/teacher/exams/${examId}/results`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to results
      </Link>

      <h1 className="text-2xl font-serif font-semibold">{exam.title} — Analytics</h1>
      <p className="text-sm text-muted-foreground">
        Based on {attemptCount} graded attempt{attemptCount === 1 ? "" : "s"}.
      </p>

      {attemptCount === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center text-muted-foreground">
          No graded attempts yet — analytics will appear once students have submitted.
        </div>
      ) : (
        <div className="space-y-4">
          {exam.questions.map((q, index) => {
            const answers = exam.attempts.map((a) =>
              a.answers.find((ans) => ans.questionId === q.id),
            );
            const answered = answers.filter((a): a is NonNullable<typeof a> => !!a);
            const correctCount = answered.filter((a) => a.isCorrect).length;
            const percentCorrect =
              attemptCount === 0 ? 0 : Math.round((correctCount / attemptCount) * 100);
            const avgPoints =
              answered.length === 0
                ? 0
                : answered.reduce((sum, a) => sum + a.pointsAwarded, 0) / attemptCount;

            const optionCounts =
              q.type === "SHORT_TEXT"
                ? null
                : q.options.map((opt) => ({
                    ...opt,
                    pickCount: answered.filter((a) =>
                      a.selectedOptions.some((o) => o.optionId === opt.id),
                    ).length,
                  }));

            return (
              <div
                key={q.id}
                className="rounded-2xl border border-border bg-card shadow-card p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Q{index + 1} · {q.points} pt{q.points === 1 ? "" : "s"} max
                    </p>
                    <p className="font-medium mt-1">{q.text}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-semibold text-primary">{percentCorrect}%</p>
                    <p className="text-xs text-muted-foreground">fully correct</p>
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Average score: {avgPoints.toFixed(2)} / {q.points} pts
                </p>

                {optionCounts && (
                  <ul className="mt-3 space-y-1">
                    {optionCounts.map((opt) => {
                      const pct =
                        attemptCount === 0
                          ? 0
                          : Math.round((opt.pickCount / attemptCount) * 100);
                      return (
                        <li key={opt.id} className="text-sm">
                          <div className="flex items-center justify-between">
                            <span className={opt.isCorrect ? "text-success-foreground font-medium" : "text-muted-foreground"}>
                              {opt.isCorrect ? "✓ " : "· "}
                              {opt.text}
                            </span>
                            <span className="text-muted-foreground">
                              {opt.pickCount} ({pct}%)
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                            <div
                              className={`h-1.5 rounded-full ${opt.isCorrect ? "bg-success-strong" : "bg-muted-foreground"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
