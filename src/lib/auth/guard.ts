import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { buildShellLoginUrl } from "@/lib/auth/sso";
import { normalizePermissionCode } from "@/lib/auth/permissions";
import {
  canUseRoleOverride,
  getRoleOverrideFromCookies,
  isPermissionAllowedForRole,
} from "@/lib/auth/role-override";

type GuardOptions = {
  appId: string;
  returnTo: string;
  supabase?: Awaited<ReturnType<typeof createClient>>;
  permissionCode?: string | string[];
  siteId?: string | null;
  areaId?: string | null;
  requireAppAccessPermission?: boolean;
};

async function resolveEffectiveSiteId(
  client: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  preferredSiteId?: string | null
) {
  if (preferredSiteId) return preferredSiteId;

  const { data: employeeSite } = await client
    .from("employee_sites")
    .select("site_id")
    .eq("employee_id", userId)
    .eq("is_active", true)
    .order("is_primary", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (employeeSite?.site_id) return String(employeeSite.site_id);

  const { data: employee } = await client
    .from("employees")
    .select("site_id")
    .eq("id", userId)
    .maybeSingle();

  return employee?.site_id ? String(employee.site_id) : null;
}

export async function requireAppAccess({
  appId,
  returnTo,
  supabase,
  permissionCode,
  siteId,
  areaId,
  requireAppAccessPermission = true,
}: GuardOptions) {
  const client = supabase ?? (await createClient());

  const { data: userRes } = await client.auth.getUser();
  const user = userRes.user ?? null;

  if (!user) {
    redirect(await buildShellLoginUrl(returnTo));
  }

  const effectiveSiteId = await resolveEffectiveSiteId(client, user.id, siteId ?? null);

  if (requireAppAccessPermission) {
    const { data: canAccess, error: accessErr } = await client.rpc("has_permission", {
      p_permission_code: `${appId}.access`,
      p_site_id: effectiveSiteId ?? null,
      p_area_id: areaId ?? null,
    });

    if (accessErr || !canAccess) {
      const qs = new URLSearchParams();
      qs.set("returnTo", returnTo);
      if (accessErr) qs.set("reason", "no_access");
      redirect(`/no-access?${qs.toString()}`);
    }
  }

  const permissionCodes = Array.isArray(permissionCode)
    ? permissionCode.filter(Boolean)
    : permissionCode
      ? [permissionCode]
      : [];

  if (permissionCodes.length) {
    const normalizedCodes = permissionCodes.map((code) =>
      normalizePermissionCode(appId, code)
    );
    const overrideRole = await getRoleOverrideFromCookies();
    let canOverride = false;
    let actualRole = "";
    let defaultSiteId: string | null = null;

    if (overrideRole) {
      const { data: employee } = await client
        .from("employees")
        .select("role,site_id")
        .eq("id", user.id)
        .maybeSingle();
      actualRole = String(employee?.role ?? "");
      defaultSiteId = effectiveSiteId ?? employee?.site_id ?? null;
      canOverride = canUseRoleOverride(actualRole, overrideRole);
    }

    if (canOverride) {
      const checks = await Promise.all(
        normalizedCodes.map((code) =>
          isPermissionAllowedForRole(client, overrideRole!, appId, code, {
            siteId: defaultSiteId ?? effectiveSiteId,
            areaId: areaId ?? null,
          })
        )
      );
      const deniedIndex = checks.findIndex((allowed) => !allowed);
      const deniedCode = deniedIndex >= 0 ? normalizedCodes[deniedIndex] : null;
      if (deniedCode) {
        const qs = new URLSearchParams();
        qs.set("returnTo", returnTo);
        qs.set("reason", "role_override");
        qs.set("permission", String(deniedCode ?? ""));
        redirect(`/no-access?${qs.toString()}`);
      }
    } else {
      const checks = await Promise.all(
        normalizedCodes.map((code) =>
          client.rpc("has_permission", {
            p_permission_code: code,
            p_site_id: effectiveSiteId ?? null,
            p_area_id: areaId ?? null,
          })
        )
      );

      const deniedIndex = checks.findIndex((res) => res.error || !res.data);
      if (deniedIndex !== -1) {
        const qs = new URLSearchParams();
        qs.set("returnTo", returnTo);
        qs.set("reason", "no_permission");
        qs.set("permission", String(normalizedCodes[deniedIndex] ?? ""));
        redirect(`/no-access?${qs.toString()}`);
      }
    }
  }

  return { supabase: client, user, siteId: effectiveSiteId };
}
