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
        <h1 className="text-2xl font-serif font-semibold">My Exams</h1>
        <Link
          href="/teacher/exams/new"
          className="rounded-lg bg-primary text-primary-foreground text-sm font-medium px-4 py-2 hover:bg-primary-hover"
        >
          + New Exam
        </Link>
      </div>

      {exams.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center text-muted-foreground">
          You haven&apos;t created any exams yet.
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="flex items-center justify-between rounded-2xl border border-border bg-card shadow-card p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-medium">{exam.title}</h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      exam.isPublished
                        ? "bg-success text-success-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {exam.isPublished ? "Published" : "Draft"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {exam._count.questions} question
                  {exam._count.questions === 1 ? "" : "s"} · {exam.durationMinutes} min ·{" "}
                  {exam._count.attempts} attempt
                  {exam._count.attempts === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href={`/teacher/exams/${exam.id}/results`}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Results
                </Link>
                <Link
                  href={`/teacher/exams/${exam.id}/edit`}
                  className="text-sm font-medium text-primary hover:text-primary-hover"
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
