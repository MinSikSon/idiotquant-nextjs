"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Users, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
  plan: string;
  role: string;
  createdAt: number | null;
}

const PLAN_LABEL: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  business: "Business",
};

const PLAN_CLASS: Record<string, string> = {
  free: "bg-neutral-100 dark:bg-[#35332e] text-neutral-500 dark:text-neutral-400",
  pro: "bg-[#dcfce7] dark:bg-[#052e16]/50 text-[#16a34a] dark:text-[#16a34a]",
  business: "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400",
};

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = (session?.user as any)?.role === "admin";

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/proxy/admin/users")
      .then(r => r.json())
      .then(data => {
        if (data.success) setUsers(data.users);
        else setError(data.error ?? "불러오기 실패");
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-sm text-neutral-400">
        권한 확인 중…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-sm text-red-500">
        접근 권한이 없습니다.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-5 py-10 md:py-14">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 rounded-xl bg-[#16a34a]/10 flex items-center justify-center shrink-0">
          <Shield size={18} className="text-[#16a34a]" />
        </div>
        <div>
          <h1 className="text-xl font-black text-neutral-900 dark:text-white tracking-tight">어드민 대시보드</h1>
          <p className="text-xs text-neutral-400 mt-0.5">카카오 가입 회원 현황</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: "전체 회원",  value: users.length },
          { label: "Pro 플랜",   value: users.filter(u => u.plan === "pro").length },
          { label: "Business",   value: users.filter(u => u.plan === "business").length },
          { label: "어드민",     value: users.filter(u => u.role === "admin").length },
        ].map(stat => (
          <div key={stat.label} className="bg-white dark:bg-[#1f1e1b] border border-neutral-200/70 dark:border-[#3a3834] rounded-xl p-4">
            <p className="text-xs text-neutral-400 mb-1">{stat.label}</p>
            <p className="text-2xl font-black text-neutral-900 dark:text-white">
              {loading ? "—" : stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* User Table */}
      <div className="bg-white dark:bg-[#1f1e1b] border border-neutral-200/70 dark:border-[#3a3834] rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-neutral-100 dark:border-[#2c2b27]">
          <Users size={14} className="text-neutral-400" />
          <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">카카오 가입자 목록</span>
          {!loading && (
            <span className="ml-auto text-xs text-neutral-400">{users.length}명</span>
          )}
        </div>

        {loading && (
          <div className="p-10 text-center text-sm text-neutral-400">불러오는 중…</div>
        )}
        {error && (
          <div className="p-10 text-center text-sm text-red-500">{error}</div>
        )}
        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-[#2c2b27] bg-[#faf9f7] dark:bg-[#242320]">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">이름</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">이메일</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">플랜</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">역할</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">가입일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-[#2c2b27]">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-[#faf9f7] dark:hover:bg-[#242320] transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-[#35332e] flex items-center justify-center text-[10px] font-black text-neutral-600 dark:text-neutral-300 shrink-0">
                          {u.name?.[0] ?? "?"}
                        </div>
                        <span className="font-medium text-neutral-800 dark:text-neutral-200">{u.name ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-neutral-500 dark:text-neutral-400 text-xs">{u.email ?? "—"}</td>
                    <td className="px-5 py-3">
                      <span className={cn(
                        "text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-tight",
                        PLAN_CLASS[u.plan] ?? PLAN_CLASS.free
                      )}>
                        {PLAN_LABEL[u.plan] ?? u.plan}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {u.role === "admin" ? (
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-tight bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400">
                          Admin
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-400">user</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-neutral-400 text-xs">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString("ko-KR") : "—"}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-neutral-400 text-sm">가입자 없음</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
