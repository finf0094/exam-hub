import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { questionSchema } from "@/lib/validation";

type Params = { params: Promise<{ examId: string }> };

async function assertOwnedExam(examId: string, teacherId: string) {
  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam) return { error: "Exam not found", status: 404 as const };
  if (exam.teacherId !== teacherId) return { error: "Forbidden", status: 403 as const };
  return { exam };
}

export async function POST(request: Request, { params }: Params) {
  const session = await getSession();
  if (!hasRole(session, ["TEACHER"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { examId } = await params;

  const owned = await assertOwnedExam(examId, session.sub);
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

  const questionCount = await prisma.question.count({ where: { examId } });

  const question = await prisma.question.create({
    data: {
      examId,
      text: parsed.data.text,
      type: parsed.data.type,
      points: parsed.data.points,
      order: questionCount + 1,
      options: { create: parsed.data.options },
    },
    include: { options: true },
  });

  return NextResponse.json(question, { status: 201 });
}
