import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PercentageBadge } from "@/components/ScoreBadge";

export default async function StudentExamsPage() {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") redirect("/login");

  const now = new Date();

  const student = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { groupId: true },
  });

  const groupVisibilityFilter = student?.groupId
    ? {
        OR: [
          { groups: { none: {} } },
          { groups: { some: { groupId: student.groupId } } },
        ],
      }
    : { groups: { none: {} } };

  const [availableExams, attempts] = await Promise.all([
    prisma.exam.findMany({
      where: {
        isPublished: true,
        startAt: { lte: now },
        endAt: { gte: now },
        attempts: { none: { studentId: session.sub } },
        ...groupVisibilityFilter,
      },
      orderBy: { endAt: "asc" },
    }),
    prisma.examAttempt.findMany({
      where: { studentId: session.sub },
      include: { exam: { include: { questions: { select: { points: true } } } } },
      orderBy: { startedAt: "desc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-10">
      <div>
        <h1 className="text-2xl font-serif font-semibold mb-6">Available Exams</h1>
        {availableExams.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-12 text-center text-muted-foreground">
            No exams available right now.
          </div>
        ) : (
          <div className="space-y-3">
            {availableExams.map((exam) => (
              <div
                key={exam.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-card shadow-card p-4"
              >
                <div>
                  <h2 className="font-medium">{exam.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {exam.durationMinutes} min · Available until{" "}
                    {exam.endAt.toLocaleString()}
                  </p>
                </div>
                <Link
                  href={`/student/exams/${exam.id}/take`}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
                >
                  Start
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-6">My Attempts</h2>
        {attempts.length === 0 ? (
          <p className="text-muted-foreground">You haven&apos;t taken any exams yet.</p>
        ) : (
          <div className="space-y-3">
            {attempts.map((attempt) => {
              const totalPoints = attempt.exam.questions.reduce((sum, q) => sum + q.points, 0);
              return (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between rounded-2xl border border-border bg-card shadow-card p-4"
                >
                  <div>
                    <h3 className="font-medium">{attempt.exam.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {attempt.status === "IN_PROGRESS" ? (
                        "In progress"
                      ) : (
                        <>
                          Score:{" "}
                          <PercentageBadge score={attempt.score ?? 0} totalPoints={totalPoints} />
                        </>
                      )}
                    </p>
                  </div>
                  <Link
                    href={
                      attempt.status === "IN_PROGRESS"
                        ? `/student/exams/${attempt.examId}/take`
                        : `/student/exams/${attempt.examId}/result`
                    }
                    className="text-sm font-medium text-primary hover:text-primary-hover"
                  >
                    {attempt.status === "IN_PROGRESS" ? "Resume" : "View result"}
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
