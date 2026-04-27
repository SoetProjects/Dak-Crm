/**
 * SnelStart integration — PREPARATION ONLY
 *
 * Real API is NOT implemented yet.
 * Required before implementation:
 *   1. SnelStart API portal credentials (client_id, client_secret)
 *   2. Administration connection key (koppelsleutel)
 *   3. Confirm REST API endpoint base URL (versioned)
 *   4. Test environment / sandbox access
 *   5. Decide on credential encryption (KMS, Vault, or env-based)
 *   6. Map DakCRM Invoice fields → SnelStart Factuur fields
 *   7. Map DakCRM Customer fields → SnelStart Relatie fields
 *
 * Placeholder codes returned:
 *   SNELSTART_NOT_CONFIGURED  — no integration row found for this company
 *   SNELSTART_API_NOT_IMPLEMENTED — function reached but real API not called yet
 */

import { db } from "@/lib/db/prisma";
import { isDatabaseReady } from "@/lib/db/db-ready";
import type { Prisma } from "@prisma/client";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type SnelStartResult = {
  success: boolean;
  code: string;
  message: string;
  data?: Record<string, unknown>;
};

export type SnelStartConfig = {
  administrationName: string | null;
  syncCustomers: boolean;
  syncInvoices: boolean;
  syncPayments: boolean;
};

// ─────────────────────────────────────────────
// Internal: write an integration log record
// ─────────────────────────────────────────────

async function writeLog(opts: {
  companyId: string;
  integrationId: string | null;
  type: string;
  direction: "outbound" | "inbound" | "internal";
  entityType?: string;
  entityId?: string;
  status: "success" | "error" | "skipped" | "pending";
  message: string;
  payload?: Record<string, unknown>;
}) {
  if (!isDatabaseReady()) return;
  try {
    await db.integrationLog.create({
      data: {
        companyId: opts.companyId,
        integrationId: opts.integrationId,
        type: opts.type,
        direction: opts.direction,
        entityType: opts.entityType ?? null,
        entityId: opts.entityId ?? null,
        status: opts.status,
        message: opts.message,
        payload: opts.payload ? (opts.payload as Prisma.InputJsonValue) : undefined,
      },
    });
  } catch {
    // Never let logging crash the caller
  }
}

// ─────────────────────────────────────────────
// getSnelStartConfig
// ─────────────────────────────────────────────

export async function getSnelStartConfig(
  companyId: string,
): Promise<{ integration: Awaited<ReturnType<typeof db.integration.findFirst>>; config: SnelStartConfig | null }> {
  if (!isDatabaseReady()) {
    return { integration: null, config: null };
  }

  const integration = await db.integration.findFirst({
    where: { companyId, provider: "SNELSTART" },
  });

  if (!integration) {
    return { integration: null, config: null };
  }

  const raw = integration.config as Record<string, unknown> | null;
  const config: SnelStartConfig = {
    administrationName: (raw?.administrationName as string) ?? null,
    syncCustomers: Boolean(raw?.syncCustomers ?? false),
    syncInvoices: Boolean(raw?.syncInvoices ?? false),
    syncPayments: Boolean(raw?.syncPayments ?? false),
  };

  return { integration, config };
}

// ─────────────────────────────────────────────
// syncCustomerToSnelStart
// ─────────────────────────────────────────────

export async function syncCustomerToSnelStart(
  companyId: string,
  customerId: string,
): Promise<SnelStartResult> {
  const { integration, config } = await getSnelStartConfig(companyId);

  if (!integration) {
    return {
      success: false,
      code: "SNELSTART_NOT_CONFIGURED",
      message: "SnelStart koppeling is niet geconfigureerd voor dit bedrijf.",
    };
  }

  if (!config?.syncCustomers) {
    await writeLog({
      companyId,
      integrationId: integration.id,
      type: "SYNC_CUSTOMER",
      direction: "outbound",
      entityType: "customer",
      entityId: customerId,
      status: "skipped",
      message: "Klant-synchronisatie staat uit in de SnelStart instellingen.",
    });
    return {
      success: false,
      code: "SNELSTART_SYNC_DISABLED",
      message: "Klant-synchronisatie staat uit in de SnelStart instellingen.",
    };
  }

  // TODO: Implement real SnelStart API call here
  // POST /relaties with mapped customer fields
  // Required mapping:
  //   Customer.name            → Relatie.naam
  //   Customer.kvkNumber       → Relatie.kvkNummer
  //   Customer.vatNumber       → Relatie.btwNummer
  //   Customer.billingAddress  → Relatie.adres
  //   Customer.billingCity     → Relatie.plaats

  await writeLog({
    companyId,
    integrationId: integration.id,
    type: "SYNC_CUSTOMER",
    direction: "outbound",
    entityType: "customer",
    entityId: customerId,
    status: "pending",
    message: "SNELSTART_API_NOT_IMPLEMENTED — echte API koppeling nog niet beschikbaar.",
    payload: { customerId, note: "Implementatie volgt na ontvangst API-credentials." },
  });

  // Mark customer as pending sync
  await db.customer.updateMany({
    where: { id: customerId, companyId },
    data: { accountingSyncStatus: "pending" },
  });

  return {
    success: false,
    code: "SNELSTART_API_NOT_IMPLEMENTED",
    message: "SnelStart API is nog niet gekoppeld. Implementatie volgt zodra API-credentials beschikbaar zijn.",
  };
}

// ─────────────────────────────────────────────
// syncInvoiceToSnelStart
// ─────────────────────────────────────────────

export async function syncInvoiceToSnelStart(
  companyId: string,
  invoiceId: string,
): Promise<SnelStartResult> {
  const { integration, config } = await getSnelStartConfig(companyId);

  if (!integration) {
    return {
      success: false,
      code: "SNELSTART_NOT_CONFIGURED",
      message: "SnelStart koppeling is niet geconfigureerd voor dit bedrijf.",
    };
  }

  if (!config?.syncInvoices) {
    await writeLog({
      companyId,
      integrationId: integration.id,
      type: "SYNC_INVOICE",
      direction: "outbound",
      entityType: "invoice",
      entityId: invoiceId,
      status: "skipped",
      message: "Factuur-synchronisatie staat uit in de SnelStart instellingen.",
    });
    return {
      success: false,
      code: "SNELSTART_SYNC_DISABLED",
      message: "Factuur-synchronisatie staat uit in de SnelStart instellingen.",
    };
  }

  // TODO: Implement real SnelStart API call here
  // POST /verkoopfacturen with mapped invoice fields
  // Required mapping:
  //   Invoice.invoiceNumber    → Factuur.factuurnummer
  //   Invoice.totalAmount      → Factuur.totalBedragInclusiefBtw
  //   Invoice.vatAmount        → Factuur.btwBedrag
  //   Invoice.invoiceDate      → Factuur.factuurdatum
  //   Invoice.dueDate          → Factuur.vervaldatum
  //   Customer.externalAccountingId → Relatie.id (SnelStart internal ID)

  await writeLog({
    companyId,
    integrationId: integration.id,
    type: "SYNC_INVOICE",
    direction: "outbound",
    entityType: "invoice",
    entityId: invoiceId,
    status: "pending",
    message: "SNELSTART_API_NOT_IMPLEMENTED — echte API koppeling nog niet beschikbaar.",
    payload: { invoiceId, note: "Implementatie volgt na ontvangst API-credentials." },
  });

  await db.invoice.updateMany({
    where: { id: invoiceId, companyId },
    data: {
      accountingSyncStatus: "pending",
      accountingSyncError: null,
    },
  });

  return {
    success: false,
    code: "SNELSTART_API_NOT_IMPLEMENTED",
    message: "SnelStart API is nog niet gekoppeld. Implementatie volgt zodra API-credentials beschikbaar zijn.",
  };
}

// ─────────────────────────────────────────────
// getSnelStartPaymentStatus
// ─────────────────────────────────────────────

export async function getSnelStartPaymentStatus(
  companyId: string,
  invoiceId: string,
): Promise<SnelStartResult> {
  const { integration, config } = await getSnelStartConfig(companyId);

  if (!integration) {
    return {
      success: false,
      code: "SNELSTART_NOT_CONFIGURED",
      message: "SnelStart koppeling is niet geconfigureerd voor dit bedrijf.",
    };
  }

  if (!config?.syncPayments) {
    return {
      success: false,
      code: "SNELSTART_SYNC_DISABLED",
      message: "Betalings-synchronisatie staat uit in de SnelStart instellingen.",
    };
  }

  // TODO: Implement real SnelStart API call here
  // GET /verkoopfacturen/{externalId}/betalingen
  // Map payment status back to InvoiceStatus (PAID)

  await writeLog({
    companyId,
    integrationId: integration.id,
    type: "GET_PAYMENT_STATUS",
    direction: "inbound",
    entityType: "invoice",
    entityId: invoiceId,
    status: "pending",
    message: "SNELSTART_API_NOT_IMPLEMENTED — echte API koppeling nog niet beschikbaar.",
  });

  return {
    success: false,
    code: "SNELSTART_API_NOT_IMPLEMENTED",
    message: "SnelStart API is nog niet gekoppeld. Implementatie volgt zodra API-credentials beschikbaar zijn.",
  };
}
