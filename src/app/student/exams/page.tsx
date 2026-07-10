import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function StudentExamsPage() {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") redirect("/login");

  const now = new Date();

  const [availableExams, attempts] = await Promise.all([
    prisma.exam.findMany({
      where: {
        isPublished: true,
        startAt: { lte: now },
        endAt: { gte: now },
        attempts: { none: { studentId: session.sub } },
      },
      orderBy: { endAt: "asc" },
    }),
    prisma.examAttempt.findMany({
      where: { studentId: session.sub },
      include: { exam: true },
      orderBy: { startedAt: "desc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-10">
      <div>
        <h1 className="text-2xl font-semibold mb-6">Available Exams</h1>
        {availableExams.length === 0 ? (
          <div className="rounded-md border border-dashed border-neutral-300 py-12 text-center text-neutral-500">
            No exams available right now.
          </div>
        ) : (
          <div className="space-y-3">
            {availableExams.map((exam) => (
              <div
                key={exam.id}
                className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white shadow-sm p-4"
              >
                <div>
                  <h2 className="font-medium">{exam.title}</h2>
                  <p className="text-sm text-neutral-500 mt-1">
                    {exam.durationMinutes} min · Available until{" "}
                    {exam.endAt.toLocaleString()}
                  </p>
                </div>
                <Link
                  href={`/student/exams/${exam.id}/take`}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
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
          <p className="text-neutral-500">You haven&apos;t taken any exams yet.</p>
        ) : (
          <div className="space-y-3">
            {attempts.map((attempt) => (
              <div
                key={attempt.id}
                className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white shadow-sm p-4"
              >
                <div>
                  <h3 className="font-medium">{attempt.exam.title}</h3>
                  <p className="text-sm text-neutral-500 mt-1">
                    {attempt.status === "IN_PROGRESS"
                      ? "In progress"
                      : `Score: ${attempt.score} pts`}
                  </p>
                </div>
                <Link
                  href={
                    attempt.status === "IN_PROGRESS"
                      ? `/student/exams/${attempt.examId}/take`
                      : `/student/exams/${attempt.examId}/result`
                  }
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  {attempt.status === "IN_PROGRESS" ? "Resume" : "View result"}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
