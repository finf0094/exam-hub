import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ExamEditor } from "@/components/ExamEditor";

type Params = { params: Promise<{ examId: string }> };

export default async function EditExamPage({ params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") redirect("/login");

  const { examId } = await params;
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { options: true },
      },
    },
  });

  if (!exam || exam.teacherId !== session.sub) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <ExamEditor
        exam={{
          id: exam.id,
          title: exam.title,
          description: exam.description,
          durationMinutes: exam.durationMinutes,
          startAt: exam.startAt.toISOString(),
          endAt: exam.endAt.toISOString(),
          isPublished: exam.isPublished,
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
