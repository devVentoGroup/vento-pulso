import { ScannerPage } from "@/modules/pos/components/scanner-page";
import { requireAppAccess } from "@/lib/auth/guard";

export default async function PulsoScannerRoute({
  searchParams,
}: {
  searchParams: Promise<{ site_id?: string }>;
}) {
  const params = await searchParams;
  const returnTo = params?.site_id ? `/scanner?site_id=${params.site_id}` : "/scanner";

  const { siteId: resolvedSiteId } = await requireAppAccess({
    appId: "pulso",
    returnTo,
    siteId: params?.site_id ?? null,
    permissionCode: ["pos.main"],
    requireAppAccessPermission: true,
  });

  const siteId = params?.site_id ?? resolvedSiteId ?? "";

  return <ScannerPage siteId={siteId} />;
}

