"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";

type AppStatus = "active" | "soon";

type AppLink = {
  id: string;
  name: string;
  description: string;
  href: string;
  logoSrc: string;
  brandColor: string;
  status: AppStatus;
  group: "Workspace" | "Operación" | "Próximamente";
};

type SiteOption = {
  id: string;
  name: string | null;
  site_type?: string | null;
};

type AppSwitcherProps = {
  sites?: SiteOption[];
  activeSiteId?: string;
};

function DotsIcon() {
  return (
    <span className="grid grid-cols-3 gap-0.5">
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className="h-1.5 w-1.5 rounded-sm bg-[var(--ui-muted)]" />
      ))}
    </span>
  );
}

function StatusPill({ status }: { status: AppStatus }) {
  const label = status === "active" ? "Activo" : "Próximamente";
  const cls = status === "active" ? "ui-app-status ui-app-status--active" : "ui-app-status ui-app-status--soon";

  return <span className={cls}>{label}</span>;
}

function AppTile({ app, onNavigate }: { app: AppLink; onNavigate: () => void }) {
  const isActive = app.status === "active";
  const [logoError, setLogoError] = useState(false);
  const fallback = app.name.slice(0, 1);

  const logoNode = logoError ? (
    <div className="ui-app-logo-fallback" style={{ "--app-color": app.brandColor } as CSSProperties}>
      {fallback}
    </div>
  ) : (
    <Image
      src={app.logoSrc}
      alt={`Logo ${app.name}`}
      className="ui-app-logo"
      width={28}
      height={28}
      onError={() => setLogoError(true)}
    />
  );

  if (!isActive) {
    return (
      <div className="ui-app-tile ui-app-tile--soon" style={{ "--app-color": app.brandColor } as CSSProperties}>
        <div className="flex items-center gap-2">{logoNode}</div>
        <div className="mt-3 text-sm font-semibold text-[var(--ui-text)]">{app.name}</div>
        <div className="mt-1">
          <StatusPill status={app.status} />
        </div>
      </div>
    );
  }

  return (
    <a
      href={app.href}
      onClick={onNavigate}
      className="ui-app-tile ui-app-tile--active"
      style={{ "--app-color": app.brandColor } as CSSProperties}
    >
      <div className="flex items-center gap-2">{logoNode}</div>
      <div className="mt-3 text-sm font-semibold text-[var(--ui-text)]">{app.name}</div>
      <div className="mt-1">
        <StatusPill status={app.status} />
      </div>
    </a>
  );
}

export function AppSwitcher(props: AppSwitcherProps) {
  void props;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const apps = useMemo<AppLink[]>(
    () => [
      {
        id: "hub",
        name: "Hub",
        description: "Launcher del ecosistema.",
        logoSrc: "/apps/hub.png",
        brandColor: "#111827",
        href: "https://os.ventogroup.co",
        status: "active",
        group: "Workspace",
      },
      {
        id: "nexo",
        name: "NEXO",
        description: "Inventario y logística.",
        logoSrc: "/apps/nexo.svg",
        brandColor: "#F59E0B",
        href: "https://nexo.ventogroup.co",
        status: "active",
        group: "Operación",
      },
      {
        id: "origo",
        name: "ORIGO",
        description: "Compras y proveedores.",
        logoSrc: "/apps/origo.svg",
        brandColor: "#0EA5E9",
        href: "https://origo.ventogroup.co",
        status: "active",
        group: "Operación",
      },
      {
        id: "pulso",
        name: "PULSO",
        description: "POS y ventas.",
        logoSrc: "/apps/pulso.svg",
        brandColor: "#EF4444",
        href: "https://pulso.ventogroup.co",
        status: "active",
        group: "Operación",
      },
      {
        id: "viso",
        name: "VISO",
        description: "Gerencia y auditoría.",
        logoSrc: "/apps/viso.svg",
        brandColor: "#6366F1",
        href: "https://viso.ventogroup.co",
        status: "soon",
        group: "Próximamente",
      },
      {
        id: "fogo",
        name: "FOGO",
        description: "Recetas y producción.",
        logoSrc: "/apps/fogo.svg",
        brandColor: "#FB7185",
        href: "https://fogo.ventogroup.co",
        status: "soon",
        group: "Próximamente",
      },
      {
        id: "aura",
        name: "AURA",
        description: "Marketing y contenido.",
        logoSrc: "/apps/aura.svg",
        brandColor: "#A855F7",
        href: "https://aura.ventogroup.co",
        status: "soon",
        group: "Próximamente",
      },
    ],
    []
  );

  const workspace = apps.filter((a) => a.group === "Workspace");
  const operacion = apps.filter((a) => a.group === "Operación");
  const proximamente = apps.filter((a) => a.group === "Próximamente");

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!open) return;
      const t = e.target as Node;
      if (rootRef.current && !rootRef.current.contains(t)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-12 items-center gap-2 rounded-xl bg-[var(--ui-surface)] px-4 text-base font-semibold text-[var(--ui-text)] ring-1 ring-inset ring-[var(--ui-border)] hover:bg-[var(--ui-surface-2)]"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Abrir launcher de apps"
      >
        <DotsIcon />
        Apps
      </button>

      {open ? (
        <div className="ui-app-launcher fixed inset-x-3 top-[76px] z-50 max-h-[calc(100dvh-92px)] animate-[launcherIn_160ms_ease-out] rounded-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:max-h-none sm:w-[min(92vw,460px)]">
          <div className="ui-app-launcher-header">
            <div>
              <div className="text-sm font-semibold text-[var(--ui-text)]">Apps del ecosistema</div>
              <div className="text-xs text-[var(--ui-muted)]">Accede rápido a cada módulo del ecosistema.</div>
            </div>
          </div>

          <div className="ui-app-launcher-scroll ui-scrollbar-subtle max-h-[min(74vh,560px)] space-y-5 overflow-y-auto p-4">
            {workspace.length > 0 ? (
              <section>
                <div className="mb-2 text-xs font-semibold tracking-wide text-[var(--ui-muted)]">WORKSPACE</div>
                <div className="ui-app-launcher-grid">
                  {workspace.map((app) => (
                    <AppTile key={app.id} app={app} onNavigate={() => setOpen(false)} />
                  ))}
                </div>
              </section>
            ) : null}

            {operacion.length > 0 ? (
              <section>
                <div className="mb-2 text-xs font-semibold tracking-wide text-[var(--ui-muted)]">OPERACIÓN</div>
                <div className="ui-app-launcher-grid">
                  {operacion.map((app) => (
                    <AppTile key={app.id} app={app} onNavigate={() => setOpen(false)} />
                  ))}
                </div>
              </section>
            ) : null}

            {proximamente.length > 0 ? (
              <section>
                <div className="mb-2 text-xs font-semibold tracking-wide text-[var(--ui-muted)]">PRÓXIMAMENTE</div>
                <div className="ui-app-launcher-grid">
                  {proximamente.map((app) => (
                    <AppTile key={app.id} app={app} onNavigate={() => setOpen(false)} />
                  ))}
                </div>
              </section>
            ) : null}

            {!workspace.length && !operacion.length && !proximamente.length ? (
              <div className="ui-empty">No hay apps disponibles.</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
