"use client";

import { useState } from "react";

type UserRole = "ADMIN" | "CASHIER" | "CLIENT" | "MANAGER";

type DashboardUser = {
  id: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  email: string | null;
  phone: string | null;
};

const roleLabel: Record<UserRole, string> = {
  ADMIN: "Admin",
  CASHIER: "Cashier",
  CLIENT: "Client",
  MANAGER: "Manager",
};

export default function UsersManager({ initialUsers }: { initialUsers: DashboardUser[] }) {
  const [users, setUsers] = useState<DashboardUser[]>(initialUsers);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateUser(userId: string, payload: { role?: "ADMIN" | "CASHIER" | "CLIENT"; isActive?: boolean }) {
    try {
      setSavingId(userId);
      setError(null);

      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...payload }),
      });

      const json = (await response.json()) as {
        ok?: boolean;
        error?: string;
        data?: DashboardUser;
      };

      if (!response.ok || !json.ok || !json.data) {
        throw new Error(json.error || "UPDATE_FAILED");
      }

      setUsers((prev) => prev.map((user) => (user.id === json.data!.id ? { ...user, ...json.data! } : user)));
    } catch (err) {
      const code = err instanceof Error ? err.message : "UPDATE_FAILED";
      if (code === "CANNOT_DEMOTE_SELF") {
        setError("لا يمكنك خفض صلاحية حسابك الحالي.");
      } else {
        setError("تعذر تحديث المستخدم.");
      }
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black text-on-surface">إدارة المستخدمين</h1>
        <p className="text-sm text-secondary">أي حساب جديد سيظهر هنا ويمكنك تغييره إلى Admin أو Cashier أو Client.</p>
      </div>

      {error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}

      <div className="overflow-hidden rounded-3xl bg-surface-container-lowest shadow-ambient">
        <div className="overflow-x-auto">
        <div className="grid min-w-[860px] grid-cols-6 bg-surface-container-low px-5 py-3 text-xs font-bold text-secondary">
          <div>الاسم</div>
          <div>الدور</div>
          <div>البريد</div>
          <div>الهاتف</div>
          <div>الحالة</div>
          <div>إجراءات</div>
        </div>

        {users.length === 0 ? (
          <div className="p-8 text-center text-sm text-secondary">لا يوجد مستخدمون بعد.</div>
        ) : (
          users.map((user) => {
            const isSaving = savingId === user.id;
            const allowedRole = user.role === "MANAGER" ? "CASHIER" : user.role;

            return (
              <div key={user.id} className="grid min-w-[860px] grid-cols-6 items-center px-5 py-4 text-sm text-on-surface even:bg-surface">
                <div className="font-semibold">{user.fullName}</div>
                <div>
                  <select
                    value={allowedRole}
                    disabled={isSaving}
                    onChange={(e) => {
                      const role = e.target.value as "ADMIN" | "CASHIER" | "CLIENT";
                      void updateUser(user.id, { role });
                    }}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-none"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="CASHIER">Cashier</option>
                    <option value="CLIENT">Client</option>
                  </select>
                  {user.role === "MANAGER" ? <p className="mt-1 text-[10px] text-amber-700">تم تحويل Manager إلى Cashier عند أول تعديل.</p> : null}
                </div>
                <div className="truncate">{user.email ?? "-"}</div>
                <div>{user.phone ?? "-"}</div>
                <div>
                  <span
                    className={
                      user.isActive
                        ? "rounded-full bg-primary-fixed px-2 py-1 text-xs"
                        : "rounded-full bg-error-container px-2 py-1 text-xs text-on-error-container"
                    }
                  >
                    {user.isActive ? "نشط" : "معطل"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={isSaving}
                    onClick={() => void updateUser(user.id, { isActive: !user.isActive })}
                    className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"
                  >
                    {user.isActive ? "تعطيل" : "تفعيل"}
                  </button>
                  <span className="text-[11px] text-slate-500">{roleLabel[user.role]}</span>
                </div>
              </div>
            );
          })
        )}
        </div>
      </div>
    </section>
  );
}
