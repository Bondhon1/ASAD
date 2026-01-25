"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function ManageTasksPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [tasks, setTasks] = useState<Array<any>>([]);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push('/auth');
      return;
    }
    (async () => {
      try {
        const res = await fetch('/api/tasks?limit=50');
        if (!res.ok) return;
        const data = await res.json();
        setTasks(data.tasks || []);
      } catch (e) {
        // ignore
      }
    })();
  }, [status, router]);

  const displayName = (session as any)?.user?.name || (session as any)?.user?.email || "User";

  return (
    <DashboardLayout userRole={(session as any)?.user?.role || "HR"} userName={displayName} userEmail={(session as any)?.user?.email || ""} userId={(session as any)?.user?.id || ""}>
      <div className="min-h-[calc(100vh-140px)] py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-[#0b1c33]">Tasks</p>
              <h1 className="text-3xl md:text-4xl font-semibold text-[#0b1c33]">Manage Tasks</h1>
              <p className="text-sm text-[#0b1c33]">Edit or view task details (placeholder page).</p>
            </div>
          </div>

          <div className="space-y-4">
            {tasks.length === 0 ? (
              <div className="p-6 bg-white border border-slate-200 rounded-lg text-sm text-slate-600">No tasks found. This is a placeholder — add tasks elsewhere or create new ones.</div>
            ) : (
              tasks.map((t:any) => (
                <div key={t.id || t.title} className="bg-white border border-slate-200 rounded-lg p-4 flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">{t.title}</h3>
                    <p className="text-sm text-slate-600">{t.description || ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 bg-white border border-slate-200 rounded-md text-sm">Details</button>
                    <button className="px-3 py-1.5 bg-[#2b6cb0] text-white rounded-md text-sm">Edit</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
