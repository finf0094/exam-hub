import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminExamsPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const exams = await prisma.exam.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      teacher: { select: { name: true, email: true } },
      _count: { select: { questions: true, attempts: true } },
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      <h1 className="text-2xl font-serif font-semibold">All Exams</h1>

      {exams.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center text-muted-foreground">
          No exams have been created yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Exam</th>
                <th className="px-4 py-2 font-medium">Teacher</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Questions</th>
                <th className="px-4 py-2 font-medium">Attempts</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((exam) => (
                <tr key={exam.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{exam.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <div>{exam.teacher.name}</div>
                    <div>{exam.teacher.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        exam.isPublished
                          ? "bg-success text-success-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {exam.isPublished ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{exam._count.questions}</td>
                  <td className="px-4 py-3">{exam._count.attempts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
