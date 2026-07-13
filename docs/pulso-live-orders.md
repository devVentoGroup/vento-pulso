# PULSO: actualización local de pedidos

La vista de pedidos usa Supabase Realtime para actualizar localmente los campos operativos de pedidos ya visibles:

- `status`
- `payment_status`
- `dispatch_status`
- `dispatch_partner`
- `dispatch_reference`

Los pedidos nuevos conservan un refresco completo porque necesitan cargar productos, conversación, facturación y demás datos relacionados.

Al recuperar foco o conexión, PULSO consulta únicamente los campos operativos de los pedidos visibles como sincronización de respaldo.
