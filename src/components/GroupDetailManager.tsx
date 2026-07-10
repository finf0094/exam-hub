"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Student = { id: string; name: string; email: string };

export function GroupDetailManager({
  groupId,
  initialName,
  members,
  availableStudents,
}: {
  groupId: string;
  initialName: string;
  members: Student[];
  availableStudents: Student[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [selectedStudentId, setSelectedStudentId] = useState(availableStudents[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function rename(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to rename");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function deleteGroup() {
    if (!confirm("Delete this group? Students will become ungrouped.")) return;
    setLoading(true);
    try {
      await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
      router.push("/admin/groups");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function addMember() {
    if (!selectedStudentId) return;
    setLoading(true);
    try {
      await fetch(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: selectedStudentId }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function removeMember(studentId: string) {
    setLoading(true);
    try {
      await fetch(`/api/groups/${groupId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={rename} className="flex items-start gap-3">
        <div className="flex-1">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
          {error && <p className="mt-1 text-sm text-destructive-foreground">{error}</p>}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          Rename
        </button>
        <button
          type="button"
          onClick={deleteGroup}
          disabled={loading}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive disabled:opacity-50"
        >
          Delete group
        </button>
      </form>

      <div>
        <h2 className="font-medium mb-3">Members ({members.length})</h2>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No students in this group yet.</p>
        ) : (
          <div className="space-y-2">
            {members.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium">{s.name}</span>{" "}
                  <span className="text-muted-foreground">{s.email}</span>
                </div>
                <button
                  onClick={() => removeMember(s.id)}
                  disabled={loading}
                  className="text-destructive-foreground hover:opacity-70 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {availableStudents.length > 0 && (
          <div className="mt-4 flex items-center gap-3">
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              {availableStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.email})
                </option>
              ))}
            </select>
            <button
              onClick={addMember}
              disabled={loading}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
            >
              + Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
