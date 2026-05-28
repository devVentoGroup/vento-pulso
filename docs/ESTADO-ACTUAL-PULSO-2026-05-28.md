# Estado actual PULSO

Fecha: 2026-05-28
Rol: salon, ordenes/POS operativo y puente con loyalty.

## Implementado

- Auth/SSO con Vento Shell y componentes estandar.
- `/salon`: modulo visual de salon.
- `/orders`: ordenes con bridge/live components.
- `/scanner`: scanner QR/camara para flujos POS/loyalty.
- Acciones POS para identificar cliente, validar redencion y acreditar loyalty.
- APIs internas para loyalty award, POS, QR scanner y redemption.
- Tipos y componentes separados en `src/modules/pos` y `src/modules/salon`.

## Estado real de integracion

- Pulso debe ser owner operacional de caja/salon; Pass es owner de cliente/loyalty/catalogo cliente.
- Los pagos y secrets no deben vivir en cliente; deben pasar por Edge Functions de Shell.
- El descuento de inventario no debe implementarse localmente en Pulso hasta definir contrato con Nexo/Shell.

## Pendiente para sinergia

1. Cierre formal de caja, pagos y sesiones POS.
2. Integracion unica con Pass para redencion/acumulacion sin duplicar ordenes.
3. Llamados de mesa persistentes/realtime si el modelo no esta migrado en Shell.
4. Estados de orden compartidos con cocina/bar y potencial Pass delivery.
5. Reporting operacional para Viso.

## Documentos anteriores

`PULSO-SALON-Y-LLAMADOS-MESAS.md` y `PULSO-SALON-ESQUEMA-Y-REALTIME.md` son diseño y descubrimiento. Este documento describe el estado actual del repo.
