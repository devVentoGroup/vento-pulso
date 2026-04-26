import { requireAppAccess } from "@/lib/auth/guard";
import { SalonPage } from "@/modules/salon/components/salon-page";
import type { SalonCallRow, SalonSessionRow, SalonSnapshot, SalonTableRow, SalonZoneRow } from "@/modules/salon/types";

export default async function PulsoSalonPage({
  searchParams,
}: {
  searchParams: Promise<{ site_id?: string }>;
}) {
  const params = await searchParams;
  const returnTo = params?.site_id ? `/salon?site_id=${params.site_id}` : "/salon";

  const { supabase, siteId: resolvedSiteId } = await requireAppAccess({
    appId: "pulso",
    returnTo,
    siteId: params?.site_id ?? null,
    permissionCode: ["pos.main"],
    requireAppAccessPermission: true,
  });

  const siteId = params?.site_id ?? resolvedSiteId ?? "";

  const [zonesRes, tablesRes, sessionsRes, callsRes] = await Promise.all([
    supabase
      .from("pos_zones")
      .select("id,site_id,name,color,display_order,is_active")
      .eq("site_id", siteId)
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("pos_tables")
      .select(
        "id,site_id,zone_id,name,table_number,shape,capacity,position_x,position_y,rotation,width,height,is_active"
      )
      .eq("site_id", siteId)
      .order("table_number", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true }),
    supabase
      .from("pos_sessions")
      .select("id,site_id,table_id,server_id,status,pax,opened_at,closed_at,notes")
      .eq("site_id", siteId)
      .eq("status", "open")
      .order("opened_at", { ascending: false }),
    supabase
      .from("pos_table_service_calls")
      .select(
        "id,site_id,zone_id,table_id,session_id,device_id,source_type,request_type,status,priority,notes,created_by,assigned_to,created_at,acknowledged_at,resolved_at,cancelled_at"
      )
      .eq("site_id", siteId)
      .in("status", ["pending", "acknowledged"])
      .order("created_at", { ascending: false }),
  ]);

  if (zonesRes.error) throw new Error(zonesRes.error.message);
  if (tablesRes.error) throw new Error(tablesRes.error.message);
  if (sessionsRes.error) throw new Error(sessionsRes.error.message);
  if (callsRes.error) throw new Error(callsRes.error.message);

  const initialSnapshot: SalonSnapshot = {
    zones: (zonesRes.data ?? []) as SalonZoneRow[],
    tables: (tablesRes.data ?? []) as SalonTableRow[],
    sessions: (sessionsRes.data ?? []) as SalonSessionRow[],
    calls: (callsRes.data ?? []) as SalonCallRow[],
  };

  return <SalonPage siteId={siteId} initialSnapshot={initialSnapshot} />;
}
