import crypto from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as XLSX from "xlsx";

import { requireAppAccess } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

const APP_ID = "pulso";
const PAGE_PATH = "/sales-imports";

type SearchParams = {
  site_id?: string;
  ok?: string;
  error?: string;
};

type SiteRow = {
  id: string;
  name: string | null;
  code: string | null;
};

type CatalogItemRow = {
  id: string;
  site_id: string | null;
  product_id: string | null;
  code: string | null;
  name: string | null;
  category_label: string | null;
  price_amount: number | null;
  is_active: boolean | null;
};

type ImportBatchRow = {
  id: string;
  sales_date: string;
  source_file_name: string;
  status: string;
  row_count: number;
  matched_row_count: number;
  warning_count: number;
  total_quantity: number;
  subtotal_amount: number;
  tax_amount: number;
  discount_amount: number;
  return_amount: number;
  net_sales_amount: number;
  imported_at: string;
};

type PendingConsumptionRow = {
  batch_id: string;
  issue_code: string | null;
};

type ParsedSalesRow = {
  sourceRowNumber: number;
  externalItemId: string;
  externalItemName: string;
  externalCategory: string;
  quantity: number;
  subtotalAmount: number;
  taxAmount: number;
  discountAmount: number;
  returnAmount: number;
};

type ExternalItemMappingRow = {
  id: string;
  site_id: string;
  source: string;
  external_item_id: string;
  external_item_name: string | null;
  external_category: string | null;
  catalog_item_id: string;
  product_id: string | null;
  is_active: boolean;
};

type MatchedSalesRow = ParsedSalesRow & {
  catalogItemId: string | null;
  productId: string | null;
  matchStatus: "matched_mid" | "matched_code" | "matched_name" | "unmatched";
  matchReason: string | null;
};

function asText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function buildReturnUrl(status: { siteId?: string | null; ok?: string; error?: string }) {
  const params = new URLSearchParams();
  if (status.siteId) params.set("site_id", status.siteId);
  if (status.ok) params.set("ok", status.ok);
  if (status.error) params.set("error", status.error);
  const query = params.toString();
  return query ? `${PAGE_PATH}?${query}` : PAGE_PATH;
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function parseNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const raw = String(value ?? "")
    .replace(/\s+/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  const parsed = new Date(`${value}T00:00:00-05:00`);
  if (!Number.isFinite(parsed.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeZone: "America/Bogota",
  }).format(parsed);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(parsed);
}

function formatMoney(value: number | null | undefined) {
  const numericValue = Number(value ?? 0);
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(numericValue) ? numericValue : 0);
}

function formatQty(value: number | null | undefined) {
  const numericValue = Number(value ?? 0);
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 3,
  }).format(Number.isFinite(numericValue) ? numericValue : 0);
}

function parseMakosWorkbook(buffer: ArrayBuffer): ParsedSalesRow[] {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
    raw: true,
  });

  const headerIndex = rows.findIndex((row) => {
    const normalized = row.map(normalizeText);
    return normalized.includes("ID") && normalized.includes("PRODUCTO") && normalized.includes("CANTIDAD");
  });

  if (headerIndex < 0) return [];

  const header = rows[headerIndex].map(normalizeText);
  const indexOf = (label: string) => header.indexOf(normalizeText(label));
  const indexes = {
    id: indexOf("ID"),
    product: indexOf("PRODUCTO"),
    category: indexOf("Categoría"),
    quantity: indexOf("CANTIDAD"),
    subtotal: indexOf("SUBTOTAL"),
    taxes: indexOf("IMPUESTOS"),
    discounts: indexOf("DESCUENTOS"),
    returns: indexOf("DEVOLUCIONES"),
  };

  if (indexes.product < 0 || indexes.quantity < 0 || indexes.subtotal < 0) return [];

  const parsedRows: ParsedSalesRow[] = [];

  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    const row = rows[index];
    const externalItemName = String(row[indexes.product] ?? "").trim();
    const externalItemId = indexes.id >= 0 ? String(row[indexes.id] ?? "").trim() : "";
    const quantity = parseNumber(row[indexes.quantity]);

    if (!externalItemName && !externalItemId) continue;
    if (normalizeText(externalItemName) === "TOTAL") continue;
    if (quantity <= 0) continue;

    parsedRows.push({
      sourceRowNumber: index + 1,
      externalItemId,
      externalItemName,
      externalCategory: indexes.category >= 0 ? String(row[indexes.category] ?? "").trim() : "",
      quantity,
      subtotalAmount: parseNumber(row[indexes.subtotal]),
      taxAmount: indexes.taxes >= 0 ? parseNumber(row[indexes.taxes]) : 0,
      discountAmount: indexes.discounts >= 0 ? parseNumber(row[indexes.discounts]) : 0,
      returnAmount: indexes.returns >= 0 ? parseNumber(row[indexes.returns]) : 0,
    });
  }

  return parsedRows;
}

function matchRows(
  rows: ParsedSalesRow[],
  catalogItems: CatalogItemRow[],
  mappings: ExternalItemMappingRow[]
): MatchedSalesRow[] {
  const byMid = new Map<string, ExternalItemMappingRow>();
  const byCode = new Map<string, CatalogItemRow>();
  const byName = new Map<string, CatalogItemRow>();

  for (const mapping of mappings) {
    if (!mapping.is_active) continue;
    const midKey = normalizeText(mapping.external_item_id);
    if (midKey && !byMid.has(midKey)) byMid.set(midKey, mapping);
  }

  for (const item of catalogItems) {
    if (!item.is_active) continue;
    const codeKey = normalizeText(item.code);
    const nameKey = normalizeText(item.name);
    if (codeKey && !byCode.has(codeKey)) byCode.set(codeKey, item);
    if (nameKey && !byName.has(nameKey)) byName.set(nameKey, item);
  }

  return rows.map((row) => {
    const midMatch = row.externalItemId ? byMid.get(normalizeText(row.externalItemId)) : undefined;
    const codeMatch = row.externalItemId ? byCode.get(normalizeText(row.externalItemId)) : undefined;
    const nameMatch = byName.get(normalizeText(row.externalItemName));
    const catalogMatch = codeMatch ?? nameMatch ?? null;

    if (midMatch) {
      return {
        ...row,
        catalogItemId: midMatch.catalog_item_id,
        productId: midMatch.product_id,
        matchStatus: "matched_mid",
        matchReason: "Coincidencia por MID",
      };
    }

    return {
      ...row,
      catalogItemId: catalogMatch?.id ?? null,
      productId: catalogMatch?.product_id ?? null,
      matchStatus: codeMatch ? "matched_code" : nameMatch ? "matched_name" : "unmatched",
      matchReason: codeMatch ? "Coincidencia por código" : nameMatch ? "Coincidencia por nombre" : "Sin producto del catálogo",
    };
  });
}

async function saveMakosMapping(formData: FormData) {
  "use server";

  const siteId = asText(formData.get("site_id"));
  const catalogItemId = asText(formData.get("catalog_item_id"));
  const externalItemId = asText(formData.get("external_item_id"));
  const externalItemName = asText(formData.get("external_item_name"));
  const externalCategory = asText(formData.get("external_category"));

  if (!siteId || !catalogItemId) {
    redirect(buildReturnUrl({ siteId, error: "Selecciona sede y producto." }));
  }

  const { supabase, user } = await requireAppAccess({
    appId: APP_ID,
    returnTo: buildReturnUrl({ siteId }),
    siteId,
    permissionCode: ["pos.main"],
    requireAppAccessPermission: true,
  });

  if (!externalItemId) {
    const { error } = await supabase
      .from("pulso_external_sales_item_mappings")
      .update({ is_active: false, updated_by: user.id })
      .eq("site_id", siteId)
      .eq("source", "makos")
      .eq("catalog_item_id", catalogItemId);

    if (error) redirect(buildReturnUrl({ siteId, error: error.message }));
    revalidatePath(PAGE_PATH);
    redirect(buildReturnUrl({ siteId, ok: "mapping_saved" }));
  }

  const { error } = await supabase
    .from("pulso_external_sales_item_mappings")
    .upsert(
      {
        site_id: siteId,
        source: "makos",
        external_item_id: externalItemId,
        external_item_name: externalItemName || null,
        external_category: externalCategory || null,
        catalog_item_id: catalogItemId,
        is_active: true,
        created_by: user.id,
        updated_by: user.id,
        metadata: { source_label: "Makos ID" },
      },
      { onConflict: "site_id,source,catalog_item_id" }
    );

  if (error) redirect(buildReturnUrl({ siteId, error: error.message }));

  revalidatePath(PAGE_PATH);
  redirect(buildReturnUrl({ siteId, ok: "mapping_saved" }));
}

async function importDailySales(formData: FormData) {
  "use server";

  const siteId = asText(formData.get("site_id"));
  const salesDate = asText(formData.get("sales_date"));
  const file = formData.get("sales_file");

  if (!siteId || !salesDate) {
    redirect(buildReturnUrl({ siteId, error: "Selecciona sede y fecha." }));
  }

  if (!(file instanceof File) || file.size === 0) {
    redirect(buildReturnUrl({ siteId, error: "Sube un archivo XLSX válido." }));
  }

  const { supabase, user } = await requireAppAccess({
    appId: APP_ID,
    returnTo: buildReturnUrl({ siteId }),
    siteId,
    permissionCode: ["pos.main"],
    requireAppAccessPermission: true,
  });

  const buffer = await file.arrayBuffer();
  const fileHash = crypto.createHash("sha256").update(Buffer.from(buffer)).digest("hex");
  const parsedRows = parseMakosWorkbook(buffer);

  if (parsedRows.length === 0) {
    redirect(buildReturnUrl({ siteId, error: "No encontré filas de ventas en el archivo." }));
  }

  const [{ data: catalogData, error: catalogError }, { data: mappingsData, error: mappingsError }] = await Promise.all([
    supabase
      .from("catalog_items")
      .select("id,site_id,product_id,code,name,category_label,price_amount,is_active")
      .eq("site_id", siteId)
      .eq("is_active", true)
      .limit(2000),
    supabase
      .from("pulso_external_sales_item_mappings")
      .select("id,site_id,source,external_item_id,external_item_name,external_category,catalog_item_id,product_id,is_active")
      .eq("site_id", siteId)
      .eq("source", "makos")
      .eq("is_active", true)
      .limit(2000),
  ]);

  if (catalogError || mappingsError) {
    redirect(buildReturnUrl({ siteId, error: catalogError?.message ?? mappingsError?.message ?? "No se pudo cargar el mapeo." }));
  }

  const matchedRows = matchRows(
    parsedRows,
    (catalogData ?? []) as CatalogItemRow[],
    (mappingsData ?? []) as ExternalItemMappingRow[]
  );
  const totals = matchedRows.reduce(
    (acc, row) => {
      acc.quantity += row.quantity;
      acc.subtotal += row.subtotalAmount;
      acc.taxes += row.taxAmount;
      acc.discounts += row.discountAmount;
      acc.returns += row.returnAmount;
      if (row.matchStatus === "unmatched") acc.warnings += 1;
      else acc.matched += 1;
      return acc;
    },
    { quantity: 0, subtotal: 0, taxes: 0, discounts: 0, returns: 0, warnings: 0, matched: 0 }
  );

  const { data: batch, error: batchError } = await supabase
    .from("pulso_daily_sales_import_batches")
    .insert({
      site_id: siteId,
      sales_date: salesDate,
      source_file_name: file.name,
      source_file_hash: fileHash,
      status: totals.warnings === 0 ? "validated" : "draft",
      row_count: matchedRows.length,
      matched_row_count: totals.matched,
      warning_count: totals.warnings,
      total_quantity: totals.quantity,
      subtotal_amount: totals.subtotal,
      tax_amount: totals.taxes,
      discount_amount: totals.discounts,
      return_amount: totals.returns,
      net_sales_amount: totals.subtotal - totals.discounts - totals.returns,
      imported_by: user.id,
      metadata: {
        parser: "makos_sales_by_item_v1",
        sheet: "Reporte",
      },
    })
    .select("id")
    .single();

  if (batchError || !batch) {
    redirect(buildReturnUrl({ siteId, error: batchError?.message ?? "No se pudo crear el lote." }));
  }

  const rowsPayload = matchedRows.map((row) => ({
    batch_id: batch.id,
    site_id: siteId,
    sales_date: salesDate,
    source_row_number: row.sourceRowNumber,
    external_item_id: row.externalItemId || null,
    external_item_name: row.externalItemName,
    external_category: row.externalCategory || null,
    quantity: row.quantity,
    subtotal_amount: row.subtotalAmount,
    tax_amount: row.taxAmount,
    discount_amount: row.discountAmount,
    return_amount: row.returnAmount,
    net_sales_amount: row.subtotalAmount - row.discountAmount - row.returnAmount,
    gross_sales_amount: row.subtotalAmount + row.taxAmount,
    catalog_item_id: row.catalogItemId,
    product_id: row.productId,
    match_status: row.matchStatus,
    match_reason: row.matchReason,
    row_status: row.matchStatus === "unmatched" ? "draft" : "validated",
    metadata: {
      source: "makos_excel",
    },
  }));

  const { error: rowsError } = await supabase
    .from("pulso_daily_sales_import_rows")
    .insert(rowsPayload);

  if (rowsError) {
    redirect(buildReturnUrl({ siteId, error: rowsError.message }));
  }

  revalidatePath(PAGE_PATH);
  redirect(buildReturnUrl({ siteId, ok: totals.warnings ? "imported_with_warnings" : "imported" }));
}

async function postDailySalesImport(formData: FormData) {
  "use server";

  const siteId = asText(formData.get("site_id"));
  const batchId = asText(formData.get("batch_id"));

  if (!siteId || !batchId) {
    redirect(buildReturnUrl({ siteId, error: "Selecciona un lote validado para publicar." }));
  }

  const { supabase } = await requireAppAccess({
    appId: APP_ID,
    returnTo: buildReturnUrl({ siteId }),
    siteId,
    permissionCode: ["pos.main"],
    requireAppAccessPermission: true,
  });

  const { error } = await supabase.rpc("pulso_post_daily_sales_import", { p_batch_id: batchId });

  if (error) {
    redirect(buildReturnUrl({ siteId, error: error.message }));
  }

  revalidatePath(PAGE_PATH);
  redirect(buildReturnUrl({ siteId, ok: "posted" }));
}

export default async function SalesImportsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = (await searchParams) ?? {};
  const returnTo = buildReturnUrl({ siteId: sp.site_id ?? null });
  const { supabase, siteId } = await requireAppAccess({
    appId: APP_ID,
    returnTo,
    siteId: sp.site_id ?? null,
    permissionCode: ["pos.main"],
    requireAppAccessPermission: true,
  });

  const activeSiteId = sp.site_id ?? siteId ?? "";

  const [{ data: siteData }, { data: batchesData }, { data: catalogData }, { data: mappingsData }, { data: pendingData }] = await Promise.all([
    activeSiteId
      ? supabase.from("sites").select("id,name,code").eq("id", activeSiteId).maybeSingle()
      : Promise.resolve({ data: null }),
    activeSiteId
      ? supabase
          .from("pulso_daily_sales_import_batches")
          .select(
            "id,sales_date,source_file_name,status,row_count,matched_row_count,warning_count,total_quantity,subtotal_amount,tax_amount,discount_amount,return_amount,net_sales_amount,imported_at"
          )
          .eq("site_id", activeSiteId)
          .order("imported_at", { ascending: false })
          .limit(12)
      : Promise.resolve({ data: [] }),
    activeSiteId
      ? supabase
          .from("catalog_items")
          .select("id,site_id,product_id,code,name,category_label,price_amount,is_active")
          .eq("site_id", activeSiteId)
          .eq("is_active", true)
          .order("category_label", { ascending: true })
          .order("name", { ascending: true })
          .limit(2000)
      : Promise.resolve({ data: [] }),
    activeSiteId
      ? supabase
          .from("pulso_external_sales_item_mappings")
          .select("id,site_id,source,external_item_id,external_item_name,external_category,catalog_item_id,product_id,is_active")
          .eq("site_id", activeSiteId)
          .eq("source", "makos")
          .eq("is_active", true)
          .limit(2000)
      : Promise.resolve({ data: [] }),
    activeSiteId
      ? supabase
          .from("pulso_sales_import_rows_pending_consumption")
          .select("batch_id,issue_code")
          .eq("site_id", activeSiteId)
          .not("issue_code", "is", null)
          .limit(2000)
      : Promise.resolve({ data: [] }),
  ]);

  const site = siteData as SiteRow | null;
  const batches = (batchesData ?? []) as ImportBatchRow[];
  const catalogItems = (catalogData ?? []) as CatalogItemRow[];
  const mappings = (mappingsData ?? []) as ExternalItemMappingRow[];
  const pendingConsumptionRows = (pendingData ?? []) as PendingConsumptionRow[];
  const mappingsByCatalogItemId = new Map(mappings.map((mapping) => [mapping.catalog_item_id, mapping]));
  const pendingConsumptionByBatchId = pendingConsumptionRows.reduce((acc, row) => {
    acc.set(row.batch_id, (acc.get(row.batch_id) ?? 0) + 1);
    return acc;
  }, new Map<string, number>());
  const todayBogota = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const okMsg =
    sp.ok === "imported"
      ? "Ventas importadas y validadas."
      : sp.ok === "imported_with_warnings"
        ? "Ventas importadas con productos pendientes por mapear."
        : sp.ok === "mapping_saved"
          ? "MID guardado."
          : sp.ok === "posted"
            ? "Ventas publicadas e inventario descontado."
          : null;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 lg:px-8">
      <section className="rounded-3xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-6 shadow-[var(--ui-shadow-soft)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="ui-label">Ventas</p>
            <h1 className="ui-h1 mt-1">Importar ventas diarias</h1>
            <p className="mt-2 max-w-3xl text-sm text-[var(--ui-muted)]">
              Carga el reporte de ventas por artículo. Pulso guarda el lote por sede y fecha, valida contra el catálogo comercial y deja las filas listas para costeo.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface-2)] px-4 py-3 text-sm">
            <div className="font-semibold text-[var(--ui-text)]">{site?.name ?? "Sede activa"}</div>
            <div className="text-xs text-[var(--ui-muted)]">{site?.code ? `Código ${site.code}` : "La sede viene del selector del shell"}</div>
          </div>
        </div>

        {okMsg ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {okMsg}
          </div>
        ) : null}

        {sp.error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {sp.error}
          </div>
        ) : null}

        <form action={importDailySales} className="mt-6 grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)_auto]">
          <input type="hidden" name="site_id" value={activeSiteId} />
          <label className="flex flex-col gap-1">
            <span className="ui-label">Fecha de venta</span>
            <input name="sales_date" type="date" className="ui-input" defaultValue={todayBogota} required />
          </label>
          <label className="flex flex-col gap-1">
            <span className="ui-label">Archivo XLSX</span>
            <input name="sales_file" type="file" accept=".xlsx" className="ui-input" required />
          </label>
          <div className="flex items-end">
            <button type="submit" className="ui-btn ui-btn--brand" disabled={!activeSiteId}>
              Importar
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-6 shadow-[var(--ui-shadow-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="ui-h2">Mapeo Makos</h2>
            <p className="mt-1 text-sm text-[var(--ui-muted)]">Asigna el MID a cada producto vendible de esta sede. El importador usa este dato antes de intentar coincidencias por nombre.</p>
          </div>
          <span className="ui-chip">{mappings.length} MID activo(s)</span>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--ui-border)]">
          <table className="min-w-full divide-y divide-[var(--ui-border)] text-sm">
            <thead className="bg-[var(--ui-surface-2)]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Producto vendible</th>
                <th className="px-4 py-3 text-left font-semibold">Categoría</th>
                <th className="px-4 py-3 text-left font-semibold">MID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ui-border)] bg-white">
              {catalogItems.length ? (
                catalogItems.map((item) => {
                  const mapping = mappingsByCatalogItemId.get(item.id);
                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-[var(--ui-text)]">{item.name ?? "Producto sin nombre"}</div>
                        <div className="mt-1 text-xs text-[var(--ui-muted)]">
                          {item.code ? `Código ${item.code}` : "Sin código"} - {formatMoney(item.price_amount)}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-[var(--ui-muted)]">
                        {item.category_label ?? "Sin categoría"}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <form action={saveMakosMapping} className="grid gap-2 sm:grid-cols-[150px_auto]">
                          <input type="hidden" name="site_id" value={activeSiteId} />
                          <input type="hidden" name="catalog_item_id" value={item.id} />
                          <input type="hidden" name="external_item_name" value={mapping?.external_item_name ?? item.name ?? ""} />
                          <input type="hidden" name="external_category" value={mapping?.external_category ?? item.category_label ?? ""} />
                          <input
                            name="external_item_id"
                            className="ui-input"
                            inputMode="numeric"
                            defaultValue={mapping?.external_item_id ?? ""}
                            placeholder="Ej. 216"
                            aria-label={`MID Makos para ${item.name ?? "producto"}`}
                          />
                          <button type="submit" className="ui-btn ui-btn--ghost">
                            Guardar
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-[var(--ui-muted)]">
                    No hay productos vendibles activos para esta sede.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="rounded-3xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-6 shadow-[var(--ui-shadow-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="ui-h2">Lotes recientes</h2>
            <p className="mt-1 text-sm text-[var(--ui-muted)]">Cada lote conserva el archivo original como hash y separa impuestos, descuentos y devoluciones.</p>
          </div>
          <span className="ui-chip">{batches.length} lote(s)</span>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--ui-border)]">
          <table className="min-w-full divide-y divide-[var(--ui-border)] text-sm">
            <thead className="bg-[var(--ui-surface-2)]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Fecha</th>
                <th className="px-4 py-3 text-left font-semibold">Archivo</th>
                <th className="px-4 py-3 text-left font-semibold">Filas</th>
                <th className="px-4 py-3 text-left font-semibold">Ventas netas</th>
                <th className="px-4 py-3 text-left font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ui-border)] bg-white">
              {batches.length ? (
                batches.map((batch) => {
                  const pendingConsumptionCount = pendingConsumptionByBatchId.get(batch.id) ?? 0;
                  const canPost = batch.status === "validated" && batch.warning_count === 0 && pendingConsumptionCount === 0;
                  const statusLabel =
                    batch.status === "posted"
                      ? "Publicado"
                      : batch.status === "validated"
                        ? "Validado"
                        : batch.status === "cancelled"
                          ? "Cancelado"
                          : "Borrador";

                  return (
                    <tr key={batch.id}>
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-[var(--ui-text)]">{formatDate(batch.sales_date)}</div>
                        <div className="mt-1 text-xs text-[var(--ui-muted)]">{formatDateTime(batch.imported_at)}</div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-[var(--ui-text)]">{batch.source_file_name}</div>
                        <div className="mt-1 text-xs text-[var(--ui-muted)]">
                          Cantidad {formatQty(batch.total_quantity)} - Impuestos {formatMoney(batch.tax_amount)}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div>{batch.matched_row_count} / {batch.row_count} mapeadas</div>
                        <div className="mt-1 text-xs text-[var(--ui-muted)]">{batch.warning_count} MID pendiente(s)</div>
                        {pendingConsumptionCount ? (
                          <div className="mt-1 text-xs text-amber-700">{pendingConsumptionCount} regla(s) de consumo pendiente(s)</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 align-top font-semibold text-[var(--ui-text)]">
                        {formatMoney(batch.net_sales_amount)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col items-start gap-2">
                          <span className={batch.status === "posted" ? "ui-chip ui-chip--success" : batch.warning_count || pendingConsumptionCount ? "ui-chip ui-chip--warn" : "ui-chip ui-chip--success"}>
                            {statusLabel}
                          </span>
                          {batch.status === "validated" ? (
                            <form action={postDailySalesImport}>
                              <input type="hidden" name="site_id" value={activeSiteId} />
                              <input type="hidden" name="batch_id" value={batch.id} />
                              <button type="submit" className="ui-btn ui-btn--brand" disabled={!canPost}>
                                Publicar
                              </button>
                            </form>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[var(--ui-muted)]">
                    Aún no hay importaciones para esta sede.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}




