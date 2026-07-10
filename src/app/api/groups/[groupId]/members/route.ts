import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";

type Params = { params: Promise<{ groupId: string }> };

const memberSchema = z.object({ studentId: z.string().min(1) });

export async function POST(request: Request, { params }: Params) {
  const session = await getSession();
  if (!hasRole(session, ["ADMIN"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { groupId } = await params;

  const body = await request.json().catch(() => null);
  const parsed = memberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const [group, student] = await Promise.all([
    prisma.group.findUnique({ where: { id: groupId } }),
    prisma.user.findUnique({ where: { id: parsed.data.studentId } }),
  ]);
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
  if (!student || student.role !== "STUDENT") {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: student.id },
    data: { groupId },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await getSession();
  if (!hasRole(session, ["ADMIN"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { groupId } = await params;

  const body = await request.json().catch(() => null);
  const parsed = memberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const student = await prisma.user.findUnique({ where: { id: parsed.data.studentId } });
  if (!student || student.groupId !== groupId) {
    return NextResponse.json({ error: "Student not in this group" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: student.id },
    data: { groupId: null },
  });

  return NextResponse.json({ ok: true });
}
