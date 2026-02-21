import { ScannerPage } from "@/modules/pos/components/scanner-page";
import { requireAppAccess } from "@/lib/auth/guard";

export default async function PulsoScannerPage({
  searchParams,
}: {
  searchParams: Promise<{ site_id?: string }>;
}) {
  const params = await searchParams;
  const returnTo = params?.site_id ? `/?site_id=${params.site_id}` : "/";

  const { siteId: resolvedSiteId } = await requireAppAccess({
    appId: "pulso",
    returnTo,
    siteId: params?.site_id ?? null,
    permissionCode: ["pos.main"],
    requireAppAccessPermission: false,
  });

  const siteId = params?.site_id ?? resolvedSiteId ?? "";

  return <ScannerPage siteId={siteId} />;
}

