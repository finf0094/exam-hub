import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { gradeAnswer } from "@/lib/grading";

type Params = { params: Promise<{ attemptId: string }> };

const submitSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      selectedOptionIds: z.array(z.string().min(1)),
    }),
  ),
});

export async function POST(request: Request, { params }: Params) {
  const session = await getSession();
  if (!hasRole(session, ["STUDENT"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { attemptId } = await params;

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: { exam: { include: { questions: { include: { options: true } } } } },
  });

  if (!attempt || attempt.studentId !== session.sub) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }
  if (attempt.status !== "IN_PROGRESS") {
    return NextResponse.json(
      { error: "This attempt has already been submitted" },
      { status: 409 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const answersByQuestionId = new Map(
    parsed.data.answers.map((a) => [a.questionId, a.selectedOptionIds]),
  );

  let totalScore = 0;

  const graded = await prisma.$transaction(async (tx) => {
    for (const question of attempt.exam.questions) {
      const selectedOptionIds = answersByQuestionId.get(question.id) ?? [];
      const { isCorrect, pointsAwarded } = gradeAnswer(question, selectedOptionIds);
      totalScore += pointsAwarded;

      await tx.answer.create({
        data: {
          attemptId: attempt.id,
          questionId: question.id,
          isCorrect,
          pointsAwarded,
          selectedOptions: {
            create: selectedOptionIds.map((optionId) => ({ optionId })),
          },
        },
      });
    }

    return tx.examAttempt.update({
      where: { id: attempt.id },
      data: {
        status: "GRADED",
        submittedAt: new Date(),
        score: totalScore,
      },
    });
  });

  return NextResponse.json(graded);
}
