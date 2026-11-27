import {
  SyncPushResultItemSchema,
  type SyncPushResultItem,
} from '@kova/contracts';

export interface DispatchOutcome {
  status: 'acked' | 'conflict' | 'rejected';
  serviceName: 'sale' | 'inventory' | 'accounting';
  serverSnapshot?: Record<string, unknown>;
  reason?: string;
}

const SERVICE_BASE_URLS: Record<string, string> = {
  sale: process.env.SALE_SERVICE_URL ?? 'http://kova-sale:8083',
  inventory: process.env.INVENTORY_SERVICE_URL ?? 'http://kova-inventory:8084',
  accounting: process.env.ACCOUNTING_SERVICE_URL ?? 'http://kova-accounting:8085',
};

export async function dispatchToDomainService(
  tenantId: string,
  branchId: string,
  mutation: {
    entityType: string;
    entityId: string;
    operation: string;
    payload: Record<string, unknown>;
    idempotencyKey: string;
  }
): Promise<DispatchOutcome> {
  const serviceMap: Record<string, 'sale' | 'inventory' | 'accounting'> = {
    SaleInvoice: 'sale',
    PosOrder: 'sale',
    GoodsReceipt: 'inventory',
    StockCount: 'inventory',
    JournalEntry: 'accounting',
  };

  const serviceName = serviceMap[mutation.entityType];
  if (!serviceName) {
    return {
      status: 'rejected',
      serviceName: 'sale',
      reason: `Unknown entity type: ${mutation.entityType}`,
    };
  }

  const baseUrl = SERVICE_BASE_URLS[serviceName];
  const applyUrl = `${baseUrl}/internal/sync/apply`;

  try {
    const res = await fetch(applyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': tenantId,
        'X-Branch-Id': branchId,
      },
      body: JSON.stringify({
        tenantId,
        branchId,
        idempotencyKey: mutation.idempotencyKey,
        entityId: mutation.entityId,
        operation: mutation.operation,
        payload: mutation.payload,
      }),
    });

    if (!res.ok) {
      return { status: 'rejected', serviceName, reason: `HTTP ${res.status}` };
    }

    const body = (await res.json()) as { status?: string; reason?: string };
    if (body.status === 'acked' || body.status === 'duplicate') {
      return { status: 'acked', serviceName };
    }
    return { status: 'conflict', serviceName, reason: body.reason };
  } catch (err) {
    return {
      status: 'rejected',
      serviceName,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}
