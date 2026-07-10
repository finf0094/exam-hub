import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";

type Params = { params: Promise<{ examId: string }> };

function csvEscape(value: string | number) {
  const s = String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!hasRole(session, ["TEACHER"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { examId } = await params;

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      questions: { orderBy: { order: "asc" } },
      attempts: {
        where: { status: "GRADED" },
        orderBy: { submittedAt: "asc" },
        include: {
          student: { select: { name: true, email: true, group: { select: { name: true } } } },
          answers: true,
        },
      },
    },
  });

  if (!exam) {
    return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  }
  if (exam.teacherId !== session.sub) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const totalPoints = exam.questions.reduce((sum, q) => sum + q.points, 0);

  const header = [
    "Name",
    "Email",
    "Group",
    "Score",
    "MaxScore",
    "Percentage",
    "Status",
    "SubmittedAt",
    ...exam.questions.map((_, i) => `Q${i + 1}`),
  ];

  const rows = exam.attempts.map((attempt) => {
    const answersByQuestionId = new Map(attempt.answers.map((a) => [a.questionId, a]));
    const score = attempt.score ?? 0;
    const percentage = totalPoints === 0 ? 0 : Math.round((score / totalPoints) * 100);

    return [
      attempt.student.name,
      attempt.student.email,
      attempt.student.group?.name ?? "",
      score,
      totalPoints,
      `${percentage}%`,
      attempt.status,
      attempt.submittedAt ? attempt.submittedAt.toISOString() : "",
      ...exam.questions.map((q) => answersByQuestionId.get(q.id)?.pointsAwarded ?? 0),
    ];
  });

  const csv = [header, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");

  const filename = `${exam.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-results.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
