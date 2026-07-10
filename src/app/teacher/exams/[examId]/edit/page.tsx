import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ExamEditor } from "@/components/ExamEditor";

type Params = { params: Promise<{ examId: string }> };

export default async function EditExamPage({ params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") redirect("/login");

  const { examId } = await params;
  const [exam, allGroups] = await Promise.all([
    prisma.exam.findUnique({
      where: { id: examId },
      include: {
        questions: {
          orderBy: { order: "asc" },
          include: { options: true },
        },
        groups: { select: { groupId: true } },
      },
    }),
    prisma.group.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!exam || exam.teacherId !== session.sub) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <ExamEditor
        allGroups={allGroups}
        exam={{
          id: exam.id,
          title: exam.title,
          description: exam.description,
          durationMinutes: exam.durationMinutes,
          startAt: exam.startAt.toISOString(),
          endAt: exam.endAt.toISOString(),
          isPublished: exam.isPublished,
          groupIds: exam.groups.map((g) => g.groupId),
          questions: exam.questions.map((q) => ({
            id: q.id,
            text: q.text,
            type: q.type,
            points: q.points,
            order: q.order,
            options: q.options.map((o) => ({
              id: o.id,
              text: o.text,
              isCorrect: o.isCorrect,
            })),
          })),
        }}
      />
    </div>
  );
}
