# Vento OS - Estandares Comunes (AppShell + UI Kit v1)

Objetivo: definir una base comun para todas las apps (NEXO, FOGO, etc.)
antes de construir nuevas experiencias. Esto evita inconsistencias y retrabajo.

## 1) AppShell (layout base)

**Header**
- Siempre visible (sticky), altura fija, con borde inferior suave.
- Contenido: marca (Vento OS + app), nav principal, app switcher, perfil.
- No debe cambiar entre apps (solo label de app y items de nav).

**App Switcher**
- Boton a la derecha con grid de apps.
- Incluye selector de sede y muestra sede activa.
- Links a apps internas y apps directas.

**Perfil**
- Menu con nombre, rol, email y boton "Cerrar sesion".
- Cerrar sesion debe terminar Supabase session y volver al login del shell.

**Contenido**
- La pagina ocupa todo el ancho disponible (sin max-width global).
- El contenido es el que scrollea; el header se mantiene.

## 2) UX base (comportamiento)

- Navigation: sin saltos de layout, sin cambios de altura en header.
- Feedback: toasts para acciones, errors visibles en paneles.
- Estados vacios: mensajes claros con CTA si aplica.
- Formularios: labels arriba, inputs consistentes y con foco claro.

## 3) UI Kit v1 (tokens y componentes)

**Tokens**
- Tipografia: una sola familia (Geist).
- Colores base:
  - Background: #FFFFFF / #F9FAFB
  - Text primary: #111827
  - Text secondary: #6B7280
  - Border: #E5E7EB
  - Primary: #111827 (boton oscuro)
- Radios:
  - Cards: 16px
  - Botones/inputs: 12px

**Paleta por modulo (primario + secundario + base + neutros)**

PULSO
- Base: #F5FBFF / #ECF7FF
- Texto: #0F172A
- Accent principal: #00D4FF
- Accent secundario: #0EA5E9
- Neutros: #8AA4B2, #E2EEF5

VISO (owner)
- Base: #F6F2FF / #EFE8FF
- Texto: #1B1033
- Accent principal: #A855F7
- Accent secundario: #4C1D95
- Neutros: #9B8FB6, #E6DFF5

FOGO
- Base: #FFF5EF / #FFEDE3
- Texto: #2B150A
- Accent principal: #FF6B35
- Accent secundario: #9A3412
- Neutros: #B89A8F, #F3E2DB

NEXO
- Base: #FFF7E6 / #FFF1D1
- Texto: #2A1A00
- Accent principal: #F59E0B
- Accent secundario: #92400E
- Neutros: #B8A07A, #F0E3C6

ORIGO
- Base: #ECFFF7 / #E0FFF1
- Texto: #0B2A1F
- Accent principal: #10B981
- Accent secundario: #065F46
- Neutros: #8FB8A9, #D7EFE6

ANIMA (propuesta)
- Base porcelain: #F7F5F8 / #F2EEF2
- Texto principal: #1B1A1F
- Accent electrico (principal): #E2006A
- Oro rosa (metalico): #B76E79 + brillo #F2C6C0
- Neutros: #9E9AA6, #E6E1EA

AURA (propuesta)
- Base: #FFF7F2 / #FFEFE6
- Texto: #2B1A14
- Accent principal: #FF7A59
- Accent secundario: #C2410C
- Neutros: #BFAAA2, #F2E2DC

**Componentes**
- Boton primario: fondo oscuro, texto blanco.
- Boton secundario: borde gris, fondo blanco.
- Input: borde gris, focus ring suave.
- Card: borde + sombra suave.
- Tabla: head claro, filas separadas por border.
- Empty state: mensaje + accion si aplica.

## 4) Seguridad y auth (patron)

- Guard de acceso por app: requireAppAccess(appId, returnTo).
- Si no hay sesion: redirect al login del shell con returnTo.
- Si no hay permisos: /no-access con boton "Volver al Hub".

## 5) Checklist de consistencia

- Header sticky en todas las apps.
- App switcher presente.
- Perfil con "Cerrar sesion".
- Layout full-width.
- Botones/inputs/tables del UI Kit v1.

## 6) Acciones inmediatas

1) Migrar NEXO a este estandar (header sticky + perfil logout + layout full-width).
2) Al crear FOGO, clonar este AppShell y UI Kit.
3) Evitar estilos por app fuera de este estandar.

## 7) Copiar/pegar estandar (checklist rapido)

Para una nueva app, copiar desde **NEXO**:

- `src/app/globals.css` (cambiar paleta `--ui-*` segun modulo).
- `src/app/layout.tsx` (fuente, `VentoShell` y metadata base).
- `src/components/vento/standard/` completo:
  - `vento-shell.tsx`
  - `vento-chrome.tsx`
  - `ui.tsx`
  - `table.tsx`
  - `app-switcher.tsx`
  - `profile-menu.tsx`

Luego ajustar:

- Labels de app en `vento-chrome.tsx` (nombre, subtitulo).
- Rutas/links del nav en `vento-chrome.tsx` segun la nueva app.
- `NEXT_PUBLIC_SHELL_LOGIN_URL` en `.env` si aplica.
- Permisos por app (`permissionCodes`) para mostrar solo lo permitido.

## 8) Bootstrap rapido (script)

Desde `vento-shell`:

```powershell
.\tools\bootstrap-app-shell.ps1 -TargetPath "C:\Users\vento\OneDrive\MACBOOK\Escritorio\Vento OS\vento-pulso" -AppName "PULSO" -AppCode pulso -Palette PULSO -Domain "pulso.ventogroup.co" -SetActiveApp -Force
.\tools\bootstrap-app-shell.ps1 -TargetPath "C:\Users\vento\OneDrive\MACBOOK\Escritorio\Vento OS\vento-fogo" -AppName "FOGO" -AppCode fogo -Palette FOGO -Domain "fogo.ventogroup.co" -SetActiveApp -Force
```

Notas:
- Ajusta nav/permisos en `vento-chrome.tsx` segun el modulo.
- Si quieres cambiar el tagline o description, pasa `-Tagline` / `-Description`.
- `-Force` sobreescribe archivos existentes.

