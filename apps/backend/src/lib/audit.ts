/**
 * Audit log helper.
 * Records administrative and security-relevant events.
 */
import { prisma } from '@anzara/database';

export interface AuditEvent {
  adminId?: string;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function recordAudit(event: AuditEvent): Promise<void> {
  try {
    const data: Record<string, unknown> = {
      action: event.action,
      entity: event.entity ?? null,
      entityId: event.entityId ?? null,
      metadata: event.metadata ?? undefined,
      ipAddress: event.ipAddress ?? null,
      userAgent: event.userAgent ?? null,
    };
    if (event.adminId) data['adminId'] = event.adminId;
    await prisma.auditLog.create({ data: data as never });
  } catch (err) {
    // Never let audit logging break the request flow
    process.stderr.write(`[AUDIT ERROR] ${event.action}: ${(err as Error).message}\n`);
  }
}
