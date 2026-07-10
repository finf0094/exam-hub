import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";

type Params = { params: Promise<{ examId: string }> };

const putSchema = z.object({ groupIds: z.array(z.string().min(1)) });

export async function PUT(request: Request, { params }: Params) {
  const session = await getSession();
  if (!hasRole(session, ["TEACHER"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { examId } = await params;

  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  if (exam.teacherId !== session.sub) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.examGroup.deleteMany({ where: { examId } });
    if (parsed.data.groupIds.length > 0) {
      await tx.examGroup.createMany({
        data: parsed.data.groupIds.map((groupId) => ({ examId, groupId })),
      });
    }
  });

  return NextResponse.json({ ok: true });
}
