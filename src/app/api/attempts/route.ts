import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";

const startSchema = z.object({ examId: z.string().min(1) });

export async function POST(request: Request) {
  const session = await getSession();
  if (!hasRole(session, ["STUDENT"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = startSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { examId } = parsed.data;

  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam || !exam.isPublished) {
    return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  }

  const now = new Date();
  if (now < exam.startAt || now > exam.endAt) {
    return NextResponse.json(
      { error: "This exam is not currently available" },
      { status: 403 },
    );
  }

  const existing = await prisma.examAttempt.findUnique({
    where: { examId_studentId: { examId, studentId: session.sub } },
  });

  if (existing) {
    if (existing.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "You have already completed this exam" },
        { status: 409 },
      );
    }
    return NextResponse.json(existing);
  }

  const attempt = await prisma.examAttempt.create({
    data: { examId, studentId: session.sub },
  });

  return NextResponse.json(attempt, { status: 201 });
}
