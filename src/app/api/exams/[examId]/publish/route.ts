import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";

type Params = { params: Promise<{ examId: string }> };

const publishSchema = z.object({ isPublished: z.boolean() });

export async function PATCH(request: Request, { params }: Params) {
  const session = await getSession();
  if (!hasRole(session, ["TEACHER"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { examId } = await params;

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { _count: { select: { questions: true } } },
  });
  if (!exam) {
    return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  }
  if (exam.teacherId !== session.sub) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = publishSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (parsed.data.isPublished && exam._count.questions === 0) {
    return NextResponse.json(
      { error: "Add at least one question before publishing" },
      { status: 400 },
    );
  }

  const updated = await prisma.exam.update({
    where: { id: examId },
    data: { isPublished: parsed.data.isPublished },
  });

  return NextResponse.json(updated);
}
