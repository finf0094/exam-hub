import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function TeacherExamsPage() {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") redirect("/login");

  const exams = await prisma.exam.findMany({
    where: { teacherId: session.sub },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true, attempts: true } } },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">My Exams</h1>
        <Link
          href="/teacher/exams/new"
          className="rounded-md bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700"
        >
          + New Exam
        </Link>
      </div>

      {exams.length === 0 ? (
        <div className="rounded-md border border-dashed border-neutral-300 py-16 text-center text-neutral-500">
          You haven&apos;t created any exams yet.
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white shadow-sm p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-medium">{exam.title}</h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      exam.isPublished
                        ? "bg-green-100 text-green-700"
                        : "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {exam.isPublished ? "Published" : "Draft"}
                  </span>
                </div>
                <p className="text-sm text-neutral-500 mt-1">
                  {exam._count.questions} question
                  {exam._count.questions === 1 ? "" : "s"} · {exam.durationMinutes} min ·{" "}
                  {exam._count.attempts} attempt
                  {exam._count.attempts === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href={`/teacher/exams/${exam.id}/results`}
                  className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
                >
                  Results
                </Link>
                <Link
                  href={`/teacher/exams/${exam.id}/edit`}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
