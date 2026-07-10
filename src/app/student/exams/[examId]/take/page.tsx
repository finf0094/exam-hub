import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ExamTaker } from "@/components/ExamTaker";

type Params = { params: Promise<{ examId: string }> };

export default async function TakeExamPage({ params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") redirect("/login");

  const { examId } = await params;

  const [exam, student] = await Promise.all([
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
    prisma.user.findUnique({ where: { id: session.sub }, select: { groupId: true } }),
  ]);

  if (!exam || !exam.isPublished) notFound();

  const now = new Date();
  if (now < exam.startAt || now > exam.endAt) notFound();

  if (exam.groups.length > 0) {
    const allowedGroupIds = exam.groups.map((g) => g.groupId);
    if (!student?.groupId || !allowedGroupIds.includes(student.groupId)) {
      notFound();
    }
  }

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
  const existingTextAnswers = Object.fromEntries(
    attempt.answers
      .filter((a) => a.textResponse !== null)
      .map((a) => [a.questionId, a.textResponse as string]),
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
            // Never send the accepted-answer text for short-text questions
            // to the client before grading — that would leak the answer key.
            options:
              q.type === "SHORT_TEXT"
                ? []
                : q.options.map((o) => ({ id: o.id, text: o.text })),
          })),
        }}
        initialAnswers={existingAnswers}
        initialTextAnswers={existingTextAnswers}
      />
    </div>
  );
}
