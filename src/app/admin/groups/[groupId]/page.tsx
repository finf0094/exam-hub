import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GroupDetailManager } from "@/components/GroupDetailManager";

type Params = { params: Promise<{ groupId: string }> };

export default async function AdminGroupDetailPage({ params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const { groupId } = await params;

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { students: { select: { id: true, name: true, email: true } } },
  });
  if (!group) notFound();

  const availableStudents = await prisma.user.findMany({
    where: { role: "STUDENT", groupId: { not: groupId } },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <Link href="/admin/groups" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to groups
      </Link>
      <h1 className="text-2xl font-serif font-semibold">{group.name}</h1>

      <GroupDetailManager
        groupId={group.id}
        initialName={group.name}
        members={group.students}
        availableStudents={availableStudents}
      />
    </div>
  );
}
