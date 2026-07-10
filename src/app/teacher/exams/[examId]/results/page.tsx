import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PercentageBadge } from "@/components/ScoreBadge";

type Params = { params: Promise<{ examId: string }> };

export default async function ExamResultsPage({ params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") redirect("/login");

  const { examId } = await params;

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      questions: { select: { points: true } },
      attempts: {
        include: { student: { select: { id: true, name: true, email: true } } },
        orderBy: { startedAt: "desc" },
      },
    },
  });

  if (!exam || exam.teacherId !== session.sub) notFound();

  const totalPoints = exam.questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      <Link
        href="/teacher/exams"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to exams
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif font-semibold">{exam.title} — Results</h1>
        <div className="flex items-center gap-4">
          <Link
            href={`/teacher/exams/${examId}/analytics`}
            className="text-sm font-medium text-primary hover:text-primary-hover"
          >
            Analytics
          </Link>
          <a
            href={`/api/exams/${examId}/results/export`}
            className="text-sm font-medium text-primary hover:text-primary-hover"
          >
            Export CSV
          </a>
        </div>
      </div>

      {exam.attempts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center text-muted-foreground">
          No students have attempted this exam yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Student</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Score</th>
                <th className="px-4 py-2 font-medium">Submitted</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {exam.attempts.map((attempt) => (
                <tr key={attempt.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="font-medium">{attempt.student.name}</div>
                    <div className="text-muted-foreground">{attempt.student.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        attempt.status === "IN_PROGRESS"
                          ? "bg-warning text-warning-foreground"
                          : "bg-success text-success-foreground"
                      }`}
                    >
                      {attempt.status === "IN_PROGRESS" ? "In progress" : "Graded"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {attempt.score === null ? (
                      "—"
                    ) : (
                      <PercentageBadge score={attempt.score} totalPoints={totalPoints} />
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {attempt.submittedAt ? attempt.submittedAt.toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {attempt.status !== "IN_PROGRESS" && (
                      <Link
                        href={`/teacher/exams/${examId}/results/${attempt.id}`}
                        className="font-medium text-primary hover:text-primary-hover"
                      >
                        View
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
