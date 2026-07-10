import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewGroupForm } from "@/components/NewGroupForm";

export default async function AdminGroupsPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const groups = await prisma.group.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { students: true, exams: true } } },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <h1 className="text-2xl font-serif font-semibold">Groups</h1>

      <NewGroupForm />

      {groups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center text-muted-foreground">
          No groups yet. Create one above.
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <div
              key={group.id}
              className="flex items-center justify-between rounded-2xl border border-border bg-card shadow-card p-4"
            >
              <div>
                <h2 className="font-medium">{group.name}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {group._count.students} student{group._count.students === 1 ? "" : "s"} ·{" "}
                  {group._count.exams} exam{group._count.exams === 1 ? "" : "s"} restricted to it
                </p>
              </div>
              <Link
                href={`/admin/groups/${group.id}`}
                className="text-sm font-medium text-primary hover:text-primary-hover"
              >
                Manage
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
