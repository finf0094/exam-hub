import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { questionSchema } from "@/lib/validation";

type Params = { params: Promise<{ examId: string; questionId: string }> };

async function assertOwnedQuestion(
  examId: string,
  questionId: string,
  teacherId: string,
) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { exam: true },
  });
  if (!question || question.examId !== examId) {
    return { error: "Question not found", status: 404 as const };
  }
  if (question.exam.teacherId !== teacherId) {
    return { error: "Forbidden", status: 403 as const };
  }
  return { question };
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await getSession();
  if (!hasRole(session, ["TEACHER"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { examId, questionId } = await params;

  const owned = await assertOwnedQuestion(examId, questionId, session.sub);
  if ("error" in owned) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = questionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.option.deleteMany({ where: { questionId } });
    return tx.question.update({
      where: { id: questionId },
      data: {
        text: parsed.data.text,
        type: parsed.data.type,
        points: parsed.data.points,
        options: { create: parsed.data.options },
      },
      include: { options: true },
    });
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!hasRole(session, ["TEACHER"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { examId, questionId } = await params;

  const owned = await assertOwnedQuestion(examId, questionId, session.sub);
  if ("error" in owned) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }

  await prisma.question.delete({ where: { id: questionId } });

  return NextResponse.json({ ok: true });
}
