import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
        className="text-sm text-neutral-500 hover:text-neutral-900"
      >
        ← Back to exams
      </Link>

      <h1 className="text-2xl font-semibold">{exam.title} — Results</h1>

      {exam.attempts.length === 0 ? (
        <div className="rounded-md border border-dashed border-neutral-300 py-16 text-center text-neutral-500">
          No students have attempted this exam yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-500">
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
                <tr key={attempt.id} className="border-t border-neutral-200">
                  <td className="px-4 py-3">
                    <div className="font-medium">{attempt.student.name}</div>
                    <div className="text-neutral-500">{attempt.student.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        attempt.status === "IN_PROGRESS"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {attempt.status === "IN_PROGRESS" ? "In progress" : "Graded"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {attempt.score === null ? "—" : `${attempt.score} / ${totalPoints}`}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {attempt.submittedAt ? attempt.submittedAt.toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {attempt.status !== "IN_PROGRESS" && (
                      <Link
                        href={`/teacher/exams/${examId}/results/${attempt.id}`}
                        className="font-medium text-indigo-600 hover:text-indigo-700"
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
