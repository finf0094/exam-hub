import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";

const createSchema = z.object({ name: z.string().min(1, "Name is required").max(100) });

export async function GET() {
  const session = await getSession();
  if (!hasRole(session, ["ADMIN", "TEACHER"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const groups = await prisma.group.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { students: true } } },
  });

  return NextResponse.json(groups);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!hasRole(session, ["ADMIN"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const existing = await prisma.group.findUnique({ where: { name: parsed.data.name } });
  if (existing) {
    return NextResponse.json({ error: "A group with this name already exists" }, { status: 409 });
  }

  const group = await prisma.group.create({ data: { name: parsed.data.name } });
  return NextResponse.json(group, { status: 201 });
}
