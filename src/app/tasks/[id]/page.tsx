import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

type Props = { params: { id: string } };

export default async function TaskDetailPage({ params }: Props) {
  const { id } = params;

  let task = null;
  try {
    task = await prisma.task.findUnique({
      where: { id },
      include: { createdBy: { select: { id: true, fullName: true, email: true, role: true } } },
    });
  } catch (e) {
    // ignore
  }

  if (!task) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-2xl w-full bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Task not found</h2>
          <p className="text-slate-500 mb-6">The task you&apos;re looking for does not exist or is not accessible.</p>
          <div className="flex justify-center">
            <Link href="/dashboard/tasks" className="px-4 py-2 bg-blue-600 text-white rounded-xl">Back to Tasks</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout userRole={(task?.createdBy?.role as any) || 'VOLUNTEER'} userName={task?.createdBy?.fullName || 'User'} userEmail={task?.createdBy?.email || ''} userId={task?.createdBy?.id || ''}>
      <div className="min-h-[60vh] py-10 px-4">
        <div className="max-w-3xl mx-auto bg-white border border-slate-100 rounded-2xl p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800">{task.title}</h1>
          <div className="text-sm text-slate-500 mt-2">{task.description}</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600 mt-6">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
            <div className="text-xs text-slate-400">Points</div>
            <div className="font-bold text-slate-800">+{task.pointsPositive ?? 0}</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
            <div className="text-xs text-slate-400">Deadline</div>
            <div className="font-medium text-slate-800">{task.endDate ? new Date(task.endDate).toLocaleString() : 'No deadline'}</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
            <div className="text-xs text-slate-400">Type</div>
            <div className="font-medium text-slate-800">{task.taskType || 'YESNO'}</div>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <Link href="/dashboard/tasks" className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm">Back to Tasks</Link>
        </div>
      </div>
    </div>
    </DashboardLayout>
  );
}
