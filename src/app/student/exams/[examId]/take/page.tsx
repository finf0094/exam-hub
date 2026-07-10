import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ExamTaker } from "@/components/ExamTaker";

type Params = { params: Promise<{ examId: string }> };

export default async function TakeExamPage({ params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") redirect("/login");

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

  if (!exam || !exam.isPublished) notFound();

  const now = new Date();
  if (now < exam.startAt || now > exam.endAt) notFound();

  let attempt = await prisma.examAttempt.findUnique({
    where: { examId_studentId: { examId, studentId: session.sub } },
    include: { answers: { include: { selectedOptions: true } } },
  });

  if (attempt && attempt.status !== "IN_PROGRESS") {
    redirect(`/student/exams/${examId}/result`);
  }

  if (!attempt) {
    attempt = await prisma.examAttempt.create({
      data: { examId, studentId: session.sub },
      include: { answers: { include: { selectedOptions: true } } },
    });
  }

  const deadline = new Date(
    attempt.startedAt.getTime() + exam.durationMinutes * 60 * 1000,
  ).toISOString();

  const existingAnswers = Object.fromEntries(
    attempt.answers.map((a) => [
      a.questionId,
      a.selectedOptions.map((o) => o.optionId),
    ]),
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <ExamTaker
        attemptId={attempt.id}
        deadline={deadline}
        exam={{
          id: exam.id,
          title: exam.title,
          description: exam.description,
          questions: exam.questions.map((q) => ({
            id: q.id,
            text: q.text,
            type: q.type,
            points: q.points,
            options: q.options.map((o) => ({ id: o.id, text: o.text })),
          })),
        }}
        initialAnswers={existingAnswers}
      />
    </div>
  );
}
