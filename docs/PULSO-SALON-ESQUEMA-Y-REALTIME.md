# PULSO - Salon: Esquema Actual, Extension y Realtime

## 1. Objetivo

Documentar el estado actual del esquema POS en `vento-pulso` y definir la extension minima para soportar:

- visualizacion de salon
- estados de mesa
- llamados de mesa
- alertas en tiempo real

Este documento no propone rehacer el modelo desde cero. Propone **extender** lo que ya existe.

## 2. Hallazgos del esquema actual

Se revisaron:

- migraciones del repo
- base local levantada por Docker

Conclusión:

El dominio POS ya existe en el esquema `pos` y contiene la base correcta para el modulo `Salon`.

## 2.1 Tablas existentes confirmadas

En la base local existen estas tablas en `pos`:

- `pos.pos_zones`
- `pos.pos_tables`
- `pos.pos_sessions`
- `pos.pos_session_orders`
- `pos.pos_payments`

Tambien existen las compat views en `public`:

- `public.pos_zones`
- `public.pos_tables`
- `public.pos_sessions`
- `public.pos_session_orders`
- `public.pos_payments`

## 2.2 Consulta local usada

Se confirmo en Docker con:

```powershell
docker exec supabase_db_vento-shell psql -U postgres -d postgres -c "\dt pos.*"
```

Resultado relevante:

- `pos.pos_zones`
- `pos.pos_tables`
- `pos.pos_sessions`
- `pos.pos_session_orders`

No aparecieron tablas de llamados de mesa ni dispositivos.

## 3. Estructura actual util para Salon

## 3.1 `pos.pos_zones`

Responsabilidad actual:

- representar zonas o sectores del local

Columnas confirmadas:

- `id`
- `site_id`
- `name`
- `color`
- `display_order`
- `is_active`
- `created_at`

Lectura de producto:

- ya sirve para tabs por zona
- ya permite orden visual
- ya soporta color por zona

## 3.2 `pos.pos_tables`

Responsabilidad actual:

- representar mesas fisicas dentro de una zona

Columnas confirmadas:

- `id`
- `site_id`
- `zone_id`
- `name`
- `table_number`
- `shape`
- `capacity`
- `position_x`
- `position_y`
- `rotation`
- `width`
- `height`
- `is_active`
- `created_at`
- `updated_at`

Lectura de producto:

- ya soporta un plano real del salon
- ya soporta forma y tamano
- ya soporta posicionamiento visual
- no hace falta crear otra tabla de mesas para la fase inicial

## 3.3 `pos.pos_sessions`

Responsabilidad actual:

- representar una sesion activa o historica de servicio sobre una mesa

Columnas confirmadas:

- `id`
- `site_id`
- `table_id`
- `server_id`
- `status`
- `pax`
- `opened_at`
- `closed_at`
- `notes`
- `created_at`
- `updated_at`

Lectura de producto:

- ya sirve como base para saber si la mesa esta libre u ocupada
- ya permite asignar mesero
- ya permite covers (`pax`)

## 3.4 `pos.pos_session_orders`

Responsabilidad actual:

- vincular pedidos con una sesion de mesa

Columnas confirmadas:

- `id`
- `session_id`
- `order_id`
- `seat_number`
- `course`
- `course_status`
- `fired_at`
- `created_at`

Lectura de producto:

- es la base natural para evolucionar luego a servicio por tiempos o por asientos
- no es necesaria para el piloto de alertas, pero ya deja lista la expansion hacia POS real

## 4. Lo que falta hoy

El esquema actual resuelve:

- zonas
- mesas
- sesion de servicio

Pero no resuelve de forma explicita:

- llamados de mesa
- dispositivos asociados a mesa
- estado operativo de alertas
- integracion de hardware
- auditoria de tiempos de respuesta

Por eso la extension debe ser pequena y enfocada.

## 5. Decision de modelado

No crear nuevas tablas para zonas o mesas.

Se debe reutilizar:

- `pos.pos_zones`
- `pos.pos_tables`
- `pos.pos_sessions`

Y agregar solo las entidades faltantes para llamados.

## 6. Extension minima recomendada

## 6.1 `pos.pos_table_call_devices`

Responsabilidad:

- mapear una mesa con un dispositivo o fuente de llamado

Motivo:

- una mesa puede tener boton fisico
- tambien puede tener QR
- el sistema debe saber de donde vino el evento

Columnas sugeridas:

- `id uuid primary key default gen_random_uuid()`
- `site_id uuid not null`
- `table_id uuid not null references pos.pos_tables(id) on delete cascade`
- `device_type text not null`
- `device_vendor text`
- `device_model text`
- `device_code text not null`
- `is_active boolean not null default true`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Restricciones recomendadas:

- `unique (site_id, device_code)`

Valores sugeridos para `device_type`:

- `rf_button`
- `qr`
- `manual`
- `gateway_virtual`

## 6.2 `pos.pos_table_service_calls`

Responsabilidad:

- representar cada llamado o alerta generada por una mesa

Esta es la tabla central del problema operativo.

Columnas sugeridas:

- `id uuid primary key default gen_random_uuid()`
- `site_id uuid not null`
- `zone_id uuid references pos.pos_zones(id) on delete set null`
- `table_id uuid not null references pos.pos_tables(id) on delete cascade`
- `session_id uuid references pos.pos_sessions(id) on delete set null`
- `device_id uuid references pos.pos_table_call_devices(id) on delete set null`
- `source_type text not null`
- `request_type text not null`
- `status text not null default 'pending'`
- `priority text not null default 'normal'`
- `notes text`
- `payload jsonb not null default '{}'::jsonb`
- `created_by uuid references employees(id) on delete set null`
- `assigned_to uuid references employees(id) on delete set null`
- `created_at timestamptz not null default now()`
- `acknowledged_at timestamptz`
- `resolved_at timestamptz`
- `cancelled_at timestamptz`
- `updated_at timestamptz not null default now()`

Valores sugeridos para `source_type`:

- `button`
- `qr`
- `manual`
- `system`

Valores sugeridos para `request_type`:

- `attention`
- `bill`
- `order`
- `cancel`
- `urgent`

Valores sugeridos para `status`:

- `pending`
- `acknowledged`
- `resolved`
- `cancelled`

Valores sugeridos para `priority`:

- `normal`
- `high`
- `critical`

Indices recomendados:

- `(site_id, status, created_at desc)`
- `(table_id, status, created_at desc)`
- `(zone_id, status, created_at desc)`

## 6.3 Vista derivada opcional: `pos.v_table_live_status`

No es indispensable al dia uno, pero simplifica la UI.

Responsabilidad:

- devolver el estado vivo de la mesa ya calculado

Debe combinar:

- mesa
- zona
- ultima sesion abierta
- ultimo llamado activo

Campos sugeridos:

- `table_id`
- `site_id`
- `zone_id`
- `table_name`
- `table_number`
- `shape`
- `capacity`
- `position_x`
- `position_y`
- `rotation`
- `width`
- `height`
- `session_id`
- `session_status`
- `server_id`
- `pax`
- `active_call_id`
- `active_call_type`
- `active_call_status`
- `active_call_created_at`
- `derived_ui_status`

## 7. Como se conecta con lo existente

## 7.1 Relacion con `pos.pos_tables`

- `pos_table_service_calls.table_id -> pos.pos_tables.id`
- `pos_table_call_devices.table_id -> pos.pos_tables.id`

Esto evita duplicar el catalogo de mesas.

## 7.2 Relacion con `pos.pos_zones`

- `pos_table_service_calls.zone_id -> pos.pos_zones.id`

Esto facilita filtros por zona sin tener que resolver siempre via join.

## 7.3 Relacion con `pos.pos_sessions`

- si la mesa tiene una sesion abierta al momento del llamado, guardar `session_id`
- si no hay sesion abierta, el llamado igual debe poder existir

Esta decision es importante porque el llamado de una mesa no debe depender de que el POS ya haya abierto consumo.

## 8. Regla de estado visual de mesa

La UI del plano no debe depender de un solo campo guardado en `pos.pos_tables`.

Debe calcularse por prioridad:

1. si hay llamado `pending` o `acknowledged`, mostrar alerta
2. si no hay llamado y hay sesion abierta, mostrar ocupada
3. si no hay sesion abierta, mostrar libre
4. si la mesa esta inactiva, no mostrar o mostrar bloqueada

Propuesta de `derived_ui_status`:

- `attention_requested`
- `bill_requested`
- `ordering`
- `occupied`
- `available`
- `blocked`

## 9. Flujo realtime recomendado

## 9.1 Evento de entrada

El hardware o gateway no debe actualizar la UI directo.

Debe escribir en backend:

1. gateway recibe evento
2. backend inserta en `pos.pos_table_service_calls`
3. Supabase Realtime emite cambio
4. `vento-pulso` refresca la mesa afectada

## 9.2 Evento canonico

```json
{
  "site_id": "uuid",
  "table_id": "uuid",
  "device_code": "M12",
  "source_type": "button",
  "request_type": "attention"
}
```

El backend debe enriquecerlo con:

- `zone_id`
- `session_id` si existe
- `priority`
- `status = pending`

## 9.3 Eventos que la UI debe escuchar

Para la primera version basta con escuchar cambios en:

- `pos.pos_table_service_calls`
- opcionalmente `pos.pos_sessions`

Casos:

- insert en `table_service_calls`: nueva alerta
- update en `table_service_calls`: tomada o resuelta
- insert/update en `pos_sessions`: cambia estado de ocupacion

## 10. Sonido, prioridad y SLA

## 10.1 Sonido

Regla simple:

- sonido al insertar llamado `pending`
- sin sonido al resolver
- sonido distinto para `urgent` si aplica

## 10.2 Prioridad

Regla inicial:

- `urgent` => `critical`
- `bill` => `high`
- `attention` => `normal`
- `order` => `normal`

## 10.3 SLA operativo

Campos suficientes con el modelo propuesto:

- tiempo a tomar = `acknowledged_at - created_at`
- tiempo a resolver = `resolved_at - created_at`

Esto permite reporting posterior sin rediseño.

## 11. Integracion con hardware

## 11.1 Contrato de integracion

Antes de comprar hardware a volumen, el proveedor debe confirmar al menos una de estas salidas:

- USB
- serial
- RS232
- relay
- middleware para PC
- API

Si no hay una salida integrable, el kit sirve como sistema cerrado, pero no como fuente confiable para `vento-pulso`.

## 11.2 Estrategia por etapas

### Etapa A. Manual asistida

Se crea el modulo de alertas y caja puede disparar un llamado manual.

Objetivo:

- validar UI y flujo
- no bloquear avance por hardware

### Etapa B. Integracion de gateway

Un proceso externo crea registros en `pos.pos_table_service_calls`.

Objetivo:

- conectar boton fisico al backend

### Etapa C. Accion POS derivada

Ejemplo:

- `request_type = bill` puede sugerir accion de cuenta

Pero eso debe ser posterior, no parte del MVP.

## 12. Propuesta de permisos

Como el modulo ya vive dentro de PULSO y existe el permiso `salon`, la extension debe alinearse con esa capacidad.

Regla inicial sugerida:

- lectura de zonas, mesas y sesiones para roles con acceso a `salon`
- insercion y actualizacion de llamados para roles con acceso a `salon`
- escritura por gateway con `service_role`

No se recomienda dejar que `anon` cree llamados directamente si el evento viene por internet.

## 13. SQL orientativo de extension

No es una migracion final, pero sirve como referencia de diseño.

```sql
create table if not exists pos.pos_table_call_devices (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  table_id uuid not null references pos.pos_tables(id) on delete cascade,
  device_type text not null,
  device_vendor text,
  device_model text,
  device_code text not null,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, device_code)
);

create table if not exists pos.pos_table_service_calls (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  zone_id uuid references pos.pos_zones(id) on delete set null,
  table_id uuid not null references pos.pos_tables(id) on delete cascade,
  session_id uuid references pos.pos_sessions(id) on delete set null,
  device_id uuid references pos.pos_table_call_devices(id) on delete set null,
  source_type text not null,
  request_type text not null,
  status text not null default 'pending',
  priority text not null default 'normal',
  notes text,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.employees(id) on delete set null,
  assigned_to uuid references public.employees(id) on delete set null,
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists idx_table_service_calls_site_status_created
  on pos.pos_table_service_calls (site_id, status, created_at desc);

create index if not exists idx_table_service_calls_table_status_created
  on pos.pos_table_service_calls (table_id, status, created_at desc);
```

## 14. Decision recomendada

El esquema actual ya soporta el modulo `Salon` porque:

- `pos.pos_zones` resuelve sectores
- `pos.pos_tables` resuelve layout real
- `pos.pos_sessions` resuelve ocupacion y servicio

La extension minima correcta es:

- agregar `pos.pos_table_call_devices`
- agregar `pos.pos_table_service_calls`
- derivar estado vivo de mesa en UI o vista SQL

No hace falta crear otra familia paralela de tablas de mesas.

## 15. Siguiente paso recomendado

El siguiente entregable tecnico deberia ser uno de estos:

1. migracion real de Supabase para `table_call_devices` y `table_service_calls`
2. documento UX de la pantalla `Salon` basado en `pos.pos_tables` y `pos.pos_sessions`

Orden recomendado:

1. migracion de backend
2. realtime
3. pantalla `Salon`
4. integracion de hardware
