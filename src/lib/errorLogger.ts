import { prismaAudit } from './prisma-audit';
import { NextRequest } from 'next/server';

interface ErrorLogData {
  userId?: string;
  userEmail?: string;
  endpoint: string;
  method: string;
  error: Error | unknown;
  requestBody?: any;
  userAgent?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

export async function logError(data: ErrorLogData): Promise<void> {
  try {
    const error = data.error instanceof Error ? data.error : new Error(String(data.error));
    
    // Sanitize request body - remove sensitive fields
    let sanitizedBody: string | undefined;
    if (data.requestBody) {
      const sanitized = { ...data.requestBody };
      // Remove potentially sensitive fields
      if (sanitized.password) sanitized.password = '[REDACTED]';
      if (sanitized.currentPassword) sanitized.currentPassword = '[REDACTED]';
      if (sanitized.newPassword) sanitized.newPassword = '[REDACTED]';
      if (sanitized.confirmPassword) sanitized.confirmPassword = '[REDACTED]';
      sanitizedBody = JSON.stringify(sanitized, null, 2);
    }

    await prismaAudit.errorLog.create({
      data: {
        userId: data.userId,
        userEmail: data.userEmail,
        endpoint: data.endpoint,
        method: data.method,
        errorType: error.name || 'Error',
        errorMessage: error.message || 'Unknown error',
        stackTrace: error.stack,
        requestBody: sanitizedBody,
        userAgent: data.userAgent,
        ipAddress: data.ipAddress,
        metadata: data.metadata ? JSON.stringify(data.metadata, null, 2) : undefined,
      },
    });
  } catch (logError) {
    // Fallback to console if audit logging fails
    console.error('Failed to log error to audit database:', logError);
    console.error('Original error:', data.error);
  }
}

export function getRequestMetadata(request: NextRequest) {
  return {
    userAgent: request.headers.get('user-agent') || undefined,
    ipAddress: request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               undefined,
  };
}
