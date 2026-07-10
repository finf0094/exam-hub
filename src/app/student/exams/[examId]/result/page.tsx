import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ examId: string }> };

export default async function ExamResultPage({ params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") redirect("/login");

  const { examId } = await params;

  const attempt = await prisma.examAttempt.findUnique({
    where: { examId_studentId: { examId, studentId: session.sub } },
    include: {
      exam: {
        include: { questions: { orderBy: { order: "asc" }, include: { options: true } } },
      },
      answers: { include: { selectedOptions: true } },
    },
  });

  if (!attempt) notFound();
  if (attempt.status === "IN_PROGRESS") redirect(`/student/exams/${examId}/take`);

  const answersByQuestionId = new Map(attempt.answers.map((a) => [a.questionId, a]));
  const totalPoints = attempt.exam.questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <Link href="/student/exams" className="text-sm text-neutral-500 hover:text-neutral-900">
        ← Back to exams
      </Link>

      <div>
        <h1 className="text-2xl font-semibold">{attempt.exam.title}</h1>
        <p className="text-lg font-medium text-neutral-700 mt-2">
          Score: {attempt.score} / {totalPoints}
        </p>
      </div>

      <div className="space-y-4">
        {attempt.exam.questions.map((q, index) => {
          const answer = answersByQuestionId.get(q.id);
          const selectedIds = new Set(answer?.selectedOptions.map((o) => o.optionId) ?? []);

          return (
            <div key={q.id} className="rounded-lg border border-neutral-200 bg-white shadow-sm p-4">
              <div className="flex items-start justify-between">
                <p className="text-sm text-neutral-500">
                  Q{index + 1} · {q.points} pt{q.points === 1 ? "" : "s"}
                </p>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    answer?.isCorrect
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {answer?.isCorrect ? `+${answer.pointsAwarded} pts` : "0 pts"}
                </span>
              </div>
              <p className="font-medium mt-1 mb-3">{q.text}</p>
              <ul className="space-y-1">
                {q.options.map((opt) => {
                  const wasSelected = selectedIds.has(opt.id);
                  const isCorrectOption = opt.isCorrect;
                  return (
                    <li
                      key={opt.id}
                      className={`text-sm rounded px-2 py-1 flex items-center gap-2 ${
                        isCorrectOption
                          ? "bg-green-50 text-green-800"
                          : wasSelected
                            ? "bg-red-50 text-red-700"
                            : "text-neutral-600"
                      }`}
                    >
                      <span>{wasSelected ? "●" : "○"}</span>
                      {opt.text}
                      {isCorrectOption && <span className="text-xs">(correct)</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
