import Link from "next/link";
import { getSession } from "@/lib/auth";
import { roleHome } from "@/lib/rbac";
import { LogoutButton } from "@/components/LogoutButton";

const NAV_LINKS: Record<string, { href: string; label: string }[]> = {
  ADMIN: [
    { href: "/admin/users", label: "Users" },
    { href: "/admin/groups", label: "Groups" },
    { href: "/admin/exams", label: "Exams" },
  ],
  TEACHER: [{ href: "/teacher/exams", label: "My Exams" }],
  STUDENT: [{ href: "/student/exams", label: "Exams" }],
};

export async function Navbar() {
  const session = await getSession();
  if (!session) return null;

  const links = NAV_LINKS[session.role] ?? [];

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link
            href={roleHome(session.role)}
            className="flex items-center gap-2 font-semibold tracking-tight text-foreground"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              E
            </span>
            ExamHub
          </Link>
          <nav className="flex items-center gap-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {session.name}{" "}
            <span className="text-muted-foreground">({session.role.toLowerCase()})</span>
          </span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
