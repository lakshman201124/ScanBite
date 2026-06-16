import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

interface AuditEntry {
  restaurantId: string;
  userId: string;
  action: string;              // 'menu_item.create', 'order.cancel', 'table.delete'
  entityType: string;          // 'menu_item', 'order', 'table'
  entityId: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
}

export async function auditLog(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        restaurant_id: entry.restaurantId,
        user_id: entry.userId,
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        old_value: (entry.oldValue ?? {}) as Prisma.InputJsonValue,
        new_value: (entry.newValue ?? {}) as Prisma.InputJsonValue,
        ip_address: entry.ipAddress ?? 'unknown',
      },
    });
  } catch (err) {
    // Audit logging should never break the main flow
    console.error('[audit] Failed to write audit log:', err);
  }
}
