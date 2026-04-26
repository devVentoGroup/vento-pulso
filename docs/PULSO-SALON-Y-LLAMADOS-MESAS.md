# PULSO - Salon, Mesas y Llamados

## 1. Objetivo

Definir una arquitectura de producto y tecnica para que `vento-pulso` evolucione de forma progresiva desde un modulo operativo de salon hacia capacidades de POS, sin mezclar todo desde el inicio.

El primer problema a resolver es operativo:

- visualizar el salon de forma clara
- saber que mesa necesita atencion
- permitir que caja o coordinacion vea alertas en tiempo real
- integrar llamados electronicos desde las mesas

La meta no es habilitar todo el POS de una vez, sino construir una base correcta para:

- plano de salon
- estados de mesa
- alertas de servicio
- integracion progresiva con pedidos, cuenta y cobro

## 2. Principio de producto

Para `vento-pulso`, la vista principal del modulo no debe ser una lista. Debe ser un **plano del salon**.

La razon es operativa:

- el personal piensa en espacio fisico, no en tablas abstractas
- la coordinacion de servicio depende de zonas y cercania
- una lista sirve para buscar o filtrar, pero no para operar el piso

Patrones observados en productos actuales:

- Square for Restaurants usa `floor plans`, secciones y colores por estado/tiempo
- Lightspeed Restaurant modela `floors` y mesas con posicion, tamano y rotacion
- TouchBistro combina plano con monitoreo de mesas en tiempo real
- Toast Tables usa actualizacion en vivo de estado de mesas y rotacion

Fuentes:

- https://squareup.com/help/us/en/article/6427-create-a-floor-plan
- https://squareup.com/help/us/en/article/8146-customize-table-management-settings
- https://resto-support.lightspeedhq.com/hc/en-us/articles/226404308-About-floor-plans
- https://resto-support.lightspeedhq.com/hc/en-us/articles/226405368-Editing-floors-and-tables-in-Restaurant-POS
- https://www.touchbistro.com/features/floor-plan-table-management/
- https://pos.toasttab.com/products/toast-tables

## 3. Vision de modulo en PULSO

El modulo debe llamarse algo como:

- `Salon`
- `Mesas`
- `Operacion de salon`

Recomendacion: usar `Salon` como nombre principal.

### 3.1 Vista principal

La home del modulo debe ser:

- un plano del salon
- organizado por zonas
- con mesas en posicion real
- con alertas visibles sin abrir la mesa

### 3.2 Vistas secundarias

Ademas del plano, el modulo debe tener:

- `Cola operativa`: lista de excepciones y alertas activas
- `Lista de mesas`: vista compacta para mobile o busqueda rapida
- `Configuracion de plano`: backoffice para editar zonas y mesas

## 4. Modulos funcionales

## 4.1 Plano de salon

Debe ser la vista primaria.

Capacidades:

- tabs por zona: `Salon`, `Terraza`, `Barra`, `VIP`, etc.
- mesas posicionadas en coordenadas reales
- formas basicas: redonda, cuadrada, rectangular, barra
- capacidad visible
- color por estado
- badge por alerta activa

Estados sugeridos de mesa:

- `available`
- `occupied`
- `ordering`
- `served`
- `bill_requested`
- `attention_requested`
- `reserved`
- `blocked`

Datos visibles por mesa:

- numero o nombre
- capacidad
- tiempo ocupada
- mesero asignado
- alerta activa

## 4.2 Cola operativa

Vista enfocada en excepciones.

Debe mostrar:

- llamados pendientes
- mesas que pidieron cuenta
- mesas con mucho tiempo sin atencion
- mesas bloqueadas o en incidencia

Orden sugerido:

1. urgentes
2. llamadas sin tomar
3. mesas con mas tiempo esperando
4. resto de excepciones

Acciones rapidas:

- `Tomar`
- `Asignar`
- `Resolver`
- `Silenciar`

## 4.3 Detalle de mesa

Al tocar una mesa se abre panel lateral o drawer.

Contenido inicial:

- mesa
- zona
- capacidad
- estado
- mesero asignado
- covers
- tiempo ocupada
- llamados activos
- historial reciente

Acciones progresivas:

- abrir servicio
- mover mesa
- unir o separar
- marcar pedido en curso
- pedir cuenta
- resolver alerta

## 4.4 Editor de plano

Modulo administrativo.

Debe permitir:

- crear zonas
- crear mesas
- configurar forma y capacidad
- definir posicion `x/y`
- definir ancho, alto y rotacion
- activar o desactivar mesa

Esto es clave para que el plano sea una representacion operativa real y no una grilla artificial.

## 4.5 Centro de alertas

Aunque las alertas deben verse en el plano, conviene tener una vista dedicada.

Objetivo:

- ver todos los llamados activos
- filtrar por zona o tipo
- medir tiempos de respuesta
- auditar resolucion

Tipos de alerta sugeridos:

- `attention`
- `bill`
- `order`
- `urgent`
- `manual`

Estados de alerta:

- `pending`
- `acknowledged`
- `resolved`
- `cancelled`

## 5. Por que no usar solo lista o solo tarjetas

### 5.1 Solo lista

Problemas:

- pierde contexto espacial
- dificulta coordinar zonas
- no escala bien cuando el salon esta lleno

### 5.2 Solo tarjetas

Problemas:

- funcionan para resumen, no para operacion de piso
- ocupan mucho espacio
- empeoran la lectura de 20 o 30 mesas

### 5.3 Cuadricula generica

Problemas:

- sirve si el salon es muy simple
- deja de representar el local real
- no ayuda a moverse ni a asignar servicio

Conclusión:

- vista principal: plano
- vista secundaria: cola operativa
- vista terciaria: lista compacta

## 6. Integracion de llamados desde las mesas

## 6.1 Objetivo

Permitir que una mesa genere un evento de servicio para que `vento-pulso` lo muestre en tiempo real a caja o coordinacion.

Casos:

- cliente pide atencion
- cliente pide cuenta
- cliente quiere ordenar
- cliente cancela el llamado

## 6.2 Principio tecnico

La mesa no deberia escribir directamente en el POS.

Debe existir una capa de eventos:

1. dispositivo o mecanismo de llamado
2. gateway o receptor
3. backend de eventos
4. `vento-pulso` consume esos eventos

Eso permite empezar con alertas y luego integrarlo con POS.

## 7. Opciones de hardware evaluadas

## 7.1 Boton RF comercial por mesa

Es la opcion mas fuerte para el problema actual.

Ventajas:

- no depende del celular del cliente
- baja friccion
- respuesta inmediata
- mejor adopcion
- funciona aun si el cliente no quiere escanear QR

Limitaciones:

- muchos kits son cerrados
- antes de comprar volumen hay que validar integracion

Opciones observadas:

### Retekess

Productos relevantes:

- T117: boton de servicio con funciones `Call`, `Cancel`, `Pay`, `Order`
- TD112 / TD113: receptores tipo reloj para staff
- TD154: sistemas de paging para staff y clientes

Referencias:

- https://www.retekess.com/products/td112-watch-receiver-with-t117-call-buttons
- https://www.retekess.com/products/retekess-waiter-call-system-td113-watch-pager
- https://www.retekess.com/retekess-td154-kitchen-paging-waiter-system-with-t117-service-call-button
- https://www.retekess.com/pages/staff-paging-system

Observaciones:

- son utiles para piloto operativo rapido
- no vi una API web publica clara en la documentacion revisada
- deben validarse opciones de receptor para PC, serial o integracion por proveedor

### Syscall

Productos relevantes:

- ST-600: `CALL`, `BILL`, `CLEAR`
- ST-300-2B: `CALL`, `CLEAR`
- ST-900: boton unico resistente al agua

Referencias:

- https://syscallglobal.com/wireless-communication-system/push-button-paging/waiter-calling-system/st-600/
- https://syscallglobal.com/wireless-communication-system/push-button-paging/waiter-calling-system/st-300-2b/
- https://syscallglobal.com/wireless-communication-system/push-button-paging/wireless-call-button/st-900/
- https://syscallglobal.com/wireless-communication-system/push-button-paging/waiter-calling-system/

Observaciones:

- mejor opcion si el proveedor confirma salida integrable
- Syscall menciona compatibilidades y soluciones de paging mas industriales
- hay equipos con `dry contact connection available` en ciertas lineas, lo cual es prometedor
- debe validarse si el receptor final puede entregar eventos a PC o gateway

## 7.2 QR por mesa

Ventajas:

- barato
- no requiere bateria
- se despliega rapido

Desventajas:

- depende del celular del cliente
- friccion mayor
- peor adopcion
- no sirve bien para publico que no quiere escanear

Uso recomendado:

- como canal secundario
- no como solucion principal

## 7.3 Hardware propio

Ejemplos:

- ESP32
- LoRa
- receptor propio
- gateway local

Ventajas:

- control total
- integracion directa
- eventos limpios para backend

Desventajas:

- mas tiempo de desarrollo
- pruebas de hardware
- mantenimiento

Uso recomendado:

- solo si los kits comerciales no ofrecen salida integrable razonable

## 8. Recomendacion de hardware

Recomendacion principal:

- arrancar con boton RF por mesa
- validar proveedor con salida integrable
- evitar Wi-Fi por mesa como estrategia base

Orden recomendado:

1. piloto con kit comercial
2. validar estabilidad, alcance y uso real
3. confirmar integracion por receptor o gateway
4. integrar a `vento-pulso`
5. si el proveedor no escala, migrar a gateway propio

## 9. Arquitectura tecnica recomendada

## 9.1 Capas

### Capa 1. Dispositivo

- boton RF
- QR
- accion manual desde caja

### Capa 2. Gateway

Responsabilidad:

- recibir el evento del hardware
- traducirlo a un payload canonico
- enviarlo al backend

### Capa 3. Backend operativo

Responsabilidad:

- guardar evento
- asignar estado
- emitir realtime
- disparar notificacion si aplica

### Capa 4. `vento-pulso`

Responsabilidad:

- mostrar plano
- resaltar la mesa
- reproducir alerta sonora
- permitir tomar y resolver

## 9.2 Payload canonico sugerido

```json
{
  "site_id": "uuid",
  "floor_id": "uuid",
  "table_id": "uuid",
  "source_type": "button",
  "request_type": "attention",
  "status": "pending",
  "device_code": "M12",
  "created_at": "2026-04-01T18:30:00Z"
}
```

Campos sugeridos:

- `site_id`
- `floor_id`
- `table_id`
- `source_type`: `button`, `qr`, `manual`
- `request_type`: `attention`, `bill`, `order`, `cancel`, `urgent`
- `status`: `pending`, `acknowledged`, `resolved`, `cancelled`
- `device_code`
- `notes`
- `created_at`
- `acknowledged_at`
- `resolved_at`
- `assigned_to`

## 10. Modelo de datos sugerido

## 10.1 `service_floors`

Representa zonas o planos de salon.

Campos:

- `id`
- `site_id`
- `name`
- `sort_order`
- `is_active`
- `created_at`
- `updated_at`

## 10.2 `service_tables`

Representa la mesa fisica.

Campos:

- `id`
- `site_id`
- `floor_id`
- `code`
- `label`
- `shape`
- `capacity`
- `pos_x`
- `pos_y`
- `width`
- `height`
- `rotation`
- `is_active`
- `metadata jsonb`
- `created_at`
- `updated_at`

## 10.3 `pos_table_call_devices`

Relacion entre mesa y dispositivo de llamado.

Campos:

- `id`
- `site_id`
- `table_id`
- `device_type`
- `device_vendor`
- `device_model`
- `device_code`
- `is_active`
- `metadata jsonb`
- `created_at`
- `updated_at`

## 10.4 `pos_table_service_calls`

Evento principal de llamado.

Campos:

- `id`
- `site_id`
- `floor_id`
- `table_id`
- `device_id`
- `source_type`
- `request_type`
- `status`
- `priority`
- `notes`
- `created_by`
- `assigned_to`
- `created_at`
- `acknowledged_at`
- `resolved_at`
- `cancelled_at`

## 10.5 `table_sessions`

No es necesario para el piloto, pero deja lista la transicion hacia POS.

Campos sugeridos:

- `id`
- `site_id`
- `table_id`
- `status`
- `party_size`
- `opened_at`
- `closed_at`
- `assigned_staff_id`
- `notes`

## 11. Estados de mesa recomendados

La mesa visible en plano debe derivarse de una mezcla de:

- ocupacion
- cuenta o servicio abierto
- alertas activas

Propuesta:

- `available`
- `occupied`
- `attention_requested`
- `bill_requested`
- `ordering`
- `reserved`
- `blocked`

Regla:

- si hay alerta activa, el estado visual del plano debe priorizar esa alerta
- si no hay alerta, mostrar estado operativo base

## 12. UX del plano

## 12.1 Desktop

Estructura sugerida:

- header de modulo
- tabs de zona
- panel lateral de alertas
- canvas central con plano
- drawer derecho al abrir mesa

## 12.2 Mobile o tablet vertical

Estructura sugerida:

- tabs de zona
- boton de `Alertas`
- plano scrollable
- bottom sheet con detalle de mesa

## 12.3 Codigos visuales

Colores sugeridos:

- libre: neutro
- ocupada: azul suave
- atencion: rojo o coral
- cuenta: ambar
- reservada: violeta suave o gris marcado
- bloqueada: gris oscuro

Badges:

- tiempo
- numero de covers
- icono de campana si hay llamado

## 13. Flujo operativo del llamado

## 13.1 Flujo minimo viable

1. cliente pulsa boton de mesa
2. gateway recibe evento
3. backend crea `pos_table_service_calls`
4. `vento-pulso` recibe realtime
5. mesa se marca como `attention_requested`
6. suena alerta en caja
7. cajera marca `Tomar`
8. cajera avisa por radio
9. cuando el equipo atiende, se marca `Resolver`

## 13.2 Flujo con pedir cuenta

1. cliente pulsa `Bill`
2. el llamado llega como `bill`
3. `vento-pulso` marca la mesa
4. mas adelante ese evento puede abrir una accion POS

## 14. Roadmap progresivo

## Fase 1. Salon visual + alertas

Objetivo:

- tener plano operativo
- ver llamadas de mesa
- resolver en tiempo real

Incluye:

- `service_floors`
- `service_tables`
- `pos_table_call_devices`
- `pos_table_service_calls`
- vista plano
- vista alertas
- realtime

No incluye:

- pedidos
- cuentas
- cobro

## Fase 2. Coordinacion de servicio

Incluye:

- asignacion de mesero
- covers
- cronometro por mesa
- metricas de atencion
- SLA por sede o turno

## Fase 3. Pre-POS

Incluye:

- apertura de sesion de mesa
- pedir cuenta
- acciones manuales desde caja
- integracion parcial con cocina/bar si aplica

## Fase 4. POS completo

Incluye:

- pedido
- comanda
- transferencias
- split bill
- cobro

## 15. Recomendacion de implementacion

### Paso 1

Construir primero `Salon` como modulo operativo, no como POS completo.

### Paso 2

Modelar pisos, mesas y llamados con tablas propias.

### Paso 3

Integrar hardware solo si el proveedor confirma una salida tecnicamente consumible:

- USB
- serial
- RS232
- relay
- API
- middleware de PC

### Paso 4

Desplegar piloto en una sola sede o una sola zona del local.

### Paso 5

Medir:

- frecuencia de llamados
- tiempo de toma
- tiempo de resolucion
- mesas con mas incidencias

## 16. Decision recomendada

Para `vento-pulso`:

- la vista principal debe ser `plano de salon`
- las alertas de mesa deben verse tanto en el plano como en una cola operativa
- el hardware inicial debe ser boton RF por mesa, no QR como canal principal
- la integracion debe arrancar por eventos operativos, no por POS completo

## 17. Riesgos y validaciones pendientes

- confirmar proveedor con salida integrable real
- validar cobertura de radio en el local
- validar duracion de bateria de botones
- validar ergonomia del plano en tablet y desktop
- validar si caja sera el unico actor o si tambien lo vera gerencia/meseros

## 18. Siguiente entregable sugerido

Despues de este documento, el siguiente paso debe ser uno de estos dos:

1. diseno tecnico de base de datos y realtime para `Salon`
2. diseno UX de pantallas del modulo `Salon`

Recomendacion:

- arrancar por base de datos + estados + flujo de alertas
- luego disenar la UI sobre esa estructura
