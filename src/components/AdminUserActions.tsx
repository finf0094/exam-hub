"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminUserActions({
  userId,
  isActive,
}: {
  userId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggleActive() {
    setLoading(true);
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function deleteUser() {
    if (!confirm("Delete this user? This also deletes their exams/attempts.")) return;
    setLoading(true);
    try {
      await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-3">
      <button
        onClick={toggleActive}
        disabled={loading}
        className="text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        {isActive ? "Deactivate" : "Activate"}
      </button>
      <button
        onClick={deleteUser}
        disabled={loading}
        className="text-sm font-medium text-destructive-foreground hover:text-destructive-foreground disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}
