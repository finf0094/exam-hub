import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ScoreBadge, PercentageBadge } from "@/components/ScoreBadge";

type Params = { params: Promise<{ examId: string; attemptId: string }> };

export default async function AttemptDetailPage({ params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") redirect("/login");

  const { examId, attemptId } = await params;

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      student: { select: { name: true, email: true } },
      exam: {
        include: { questions: { orderBy: { order: "asc" }, include: { options: true } } },
      },
      answers: { include: { selectedOptions: true } },
    },
  });

  if (!attempt || attempt.examId !== examId) notFound();
  if (attempt.exam.teacherId !== session.sub) notFound();

  const answersByQuestionId = new Map(attempt.answers.map((a) => [a.questionId, a]));
  const totalPoints = attempt.exam.questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <Link
        href={`/teacher/exams/${examId}/results`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to results
      </Link>

      <div>
        <h1 className="text-2xl font-serif font-semibold">{attempt.student.name}</h1>
        <p className="text-sm text-muted-foreground">{attempt.student.email}</p>
        <p className="text-lg font-medium text-foreground mt-2">
          Score: <PercentageBadge score={attempt.score ?? 0} totalPoints={totalPoints} />
        </p>
      </div>

      <div className="space-y-4">
        {attempt.exam.questions.map((q, index) => {
          const answer = answersByQuestionId.get(q.id);
          const selectedIds = new Set(answer?.selectedOptions.map((o) => o.optionId) ?? []);

          return (
            <div key={q.id} className="rounded-2xl border border-border bg-card shadow-card p-4">
              <div className="flex items-start justify-between">
                <p className="text-sm text-muted-foreground">
                  Q{index + 1} · {q.points} pt{q.points === 1 ? "" : "s"}
                </p>
                <ScoreBadge
                  isCorrect={answer?.isCorrect ?? false}
                  pointsAwarded={answer?.pointsAwarded ?? 0}
                />
              </div>
              <p className="font-medium mt-1 mb-3">{q.text}</p>

              {q.type === "SHORT_TEXT" ? (
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Student&apos;s answer: </span>
                    <span className="font-medium">
                      {answer?.textResponse ? `"${answer.textResponse}"` : "(no answer)"}
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    Accepted answers: {q.options.map((o) => `"${o.text}"`).join(", ")}
                  </p>
                </div>
              ) : (
                <ul className="space-y-1">
                  {q.options.map((opt) => {
                    const wasSelected = selectedIds.has(opt.id);
                    return (
                      <li
                        key={opt.id}
                        className={`flex items-center gap-2 rounded px-2 py-1 text-sm ${
                          opt.isCorrect
                            ? "bg-success text-success-foreground"
                            : wasSelected
                              ? "bg-destructive text-destructive-foreground"
                              : "text-muted-foreground"
                        }`}
                      >
                        <span>{wasSelected ? "●" : "○"}</span>
                        {opt.text}
                        {opt.isCorrect && <span className="text-xs">(correct)</span>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
