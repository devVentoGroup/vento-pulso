import { ScannerPage } from "@/modules/pos/components/scanner-page";
import { requireAppAccess } from "@/lib/auth/guard";

type EmployeeSiteRow = {
  site_id: string | null;
  is_primary: boolean | null;
};

type EmployeeRow = {
  site_id: string | null;
};

type QueryBuilder = {
  eq: (column: string, value: string | boolean) => QueryBuilder;
  order: (column: string, options: { ascending: boolean }) => QueryBuilder;
  limit: (count: number) => Promise<{ data: unknown }>;
  maybeSingle: () => Promise<{ data: unknown }>;
};

type SupabaseClientLike = {
  from: (table: string) => {
    select: (columns: string) => QueryBuilder;
  };
};

async function getDefaultSiteId(userId: string, supabaseClient: unknown): Promise<string> {
  const supabase = supabaseClient as SupabaseClientLike;

  const employeeSitesResult = await supabase
    .from("employee_sites")
    .select("site_id,is_primary")
    .eq("employee_id", userId)
    .eq("is_active", true)
    .order("is_primary", { ascending: false })
    .limit(1);

  const employeeSites = (employeeSitesResult?.data ?? []) as EmployeeSiteRow[];
  const preferred = employeeSites[0]?.site_id;
  if (preferred) return preferred;

  const employeeResult = await supabase
    .from("employees")
    .select("site_id")
    .eq("id", userId)
    .maybeSingle();

  const employee = (employeeResult?.data ?? null) as EmployeeRow | null;
  return employee?.site_id ?? "";
}

export default async function PulsoScannerPage({
  searchParams,
}: {
  searchParams: Promise<{ site_id?: string }>;
}) {
  const params = await searchParams;
  const returnTo = params?.site_id ? `/?site_id=${params.site_id}` : "/";

  const { supabase, user } = await requireAppAccess({
    appId: "pulso",
    returnTo,
    permissionCode: ["pos.main"],
  });

  const siteId = params?.site_id ?? (await getDefaultSiteId(user.id, supabase));

  return <ScannerPage siteId={siteId} />;
}

