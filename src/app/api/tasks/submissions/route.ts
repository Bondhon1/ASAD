/**
 * Batch Task Submissions API
 * 
 * GET /api/tasks/submissions?taskIds=id1,id2,id3
 * 
 * Returns submission status for multiple tasks in a single request
 * This eliminates N+1 query problem on tasks page
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const taskIdsParam = url.searchParams.get('taskIds');
    
    if (!taskIdsParam) {
      return NextResponse.json({ error: 'taskIds parameter required' }, { status: 400 });
    }

    const taskIds = taskIdsParam.split(',').filter(Boolean);
    
    if (taskIds.length === 0) {
      return NextResponse.json({ submissions: {} });
    }

    if (taskIds.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 task IDs allowed' }, { status: 400 });
    }

    const requester = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, status: true },
    });

    if (!requester || requester.status === 'BANNED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Batch fetch all submissions for this user and these tasks
    const submissions = await prisma.taskSubmission.findMany({
      where: {
        taskId: { in: taskIds },
        userId: requester.id,
      },
      select: {
        id: true,
        taskId: true,
        status: true,
        submittedAt: true,
        approvedAt: true,
        approvedBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    // Convert to map: taskId -> submission
    const submissionsMap: Record<string, any> = {};
    submissions.forEach(sub => {
      submissionsMap[sub.taskId] = sub;
    });

    return NextResponse.json(
      { submissions: submissionsMap },
      {
        headers: {
          'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
        },
      }
    );
  } catch (err: any) {
    console.error('GET /api/tasks/submissions error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
