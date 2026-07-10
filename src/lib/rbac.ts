import type { Role, SessionPayload } from "@/lib/auth";

export function hasRole(
  session: SessionPayload | null,
  roles: Role[],
): session is SessionPayload {
  return !!session && roles.includes(session.role);
}

export function roleHome(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin/users";
    case "TEACHER":
      return "/teacher/exams";
    case "STUDENT":
      return "/student/exams";
  }
}
