/**
 * Audit log helper.
 *
 * AuditLog is for administrative / security events. Customer actions have
 * their own trail (OrderStatusChange, etc.) so we skip the AuditLog table
 * when there's no admin actor. This keeps the schema's `adminId` required
 * and the log focused on real admin activity.
 */
import { prisma } from '@anzara/database';
import type { Prisma } from '@prisma/client';

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
  if (!event.adminId) {
    // Customer / system action: skip the AuditLog table. Domain tables
    // (Order, OrderStatusChange) hold the customer trail.
    return;
  }
  try {
    await prisma.auditLog.create({
      data: {
        adminId: event.adminId,
        action: event.action,
        entity: event.entity ?? null,
        entityId: event.entityId ?? null,
        metadata: (event.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        ipAddress: event.ipAddress ?? null,
        userAgent: event.userAgent ?? null,
      },
    });
  } catch (err) {
    // Never let audit logging break the request flow.
    process.stderr.write(`[AUDIT ERROR] ${event.action}: ${(err as Error).message}\n`);
  }
}
