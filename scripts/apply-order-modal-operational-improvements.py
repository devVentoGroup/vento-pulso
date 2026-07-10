from pathlib import Path


def replace_once(source: str, old: str, new: str, label: str) -> str:
    if old not in source:
        raise RuntimeError(f"Missing block: {label}")
    return source.replace(old, new, 1)


page_path = Path("src/app/orders/page.tsx")
page = page_path.read_text(encoding="utf-8")

if "deliveryDistanceKm:" not in page:
    page = replace_once(
        page,
        '''  payment_status: string | null;\n  total_amount: number | string | null;''',
        '''  payment_status: string | null;\n  subtotal_amount: number | string | null;\n  delivery_fee_amount: number | string | null;\n  total_amount: number | string | null;''',
        "page order money fields",
    )

    page = replace_once(
        page,
        '''"id,created_at,status,payment_status,total_amount,fulfillment_type,dispatch_status,site_id,source,guest_info,contact_phone,notes,delivery_address,delivery_zone,dispatch_partner,dispatch_reference"''',
        '''"id,created_at,status,payment_status,subtotal_amount,delivery_fee_amount,total_amount,fulfillment_type,dispatch_status,site_id,source,guest_info,contact_phone,notes,delivery_address,delivery_zone,dispatch_partner,dispatch_reference"''',
        "page order select",
    )

    page = replace_once(
        page,
        '''      guestPhone: extractText(order.guest_info, "contact_phone") || order.contact_phone,\n      fullAddress: formatAddress(order.delivery_address),\n      mapsHref: buildMapsHref(order.delivery_address),''',
        '''      guestPhone: extractText(order.guest_info, "contact_phone") || order.contact_phone,\n      fullAddress: formatAddress(order.delivery_address),\n      addressLine: extractText(order.delivery_address, "line1"),\n      addressReference: extractText(order.delivery_address, "reference"),\n      deliveryDistanceKm: extractNumber(order.delivery_address, "distance_km"),\n      billedDistanceKm: extractNumber(order.delivery_address, "billed_distance_km"),\n      mapsHref: buildMapsHref(order.delivery_address),''',
        "page board delivery data",
    )

    page_path.write_text(page, encoding="utf-8")


board_path = Path("src/app/orders/orders-board.tsx")
board = board_path.read_text(encoding="utf-8")

if "selectedProductSubtotal" not in board:
    board = replace_once(
        board,
        '''  Banknote,\n  Bike,''',
        '''  AlertTriangle,\n  Banknote,\n  Bike,''',
        "board alert icon",
    )
    board = replace_once(
        board,
        '''  Clock3,\n  History,''',
        '''  Clock3,\n  Copy,\n  History,''',
        "board copy icon",
    )

    board = replace_once(
        board,
        '''  payment_status: string | null;\n  total_amount: number | string | null;''',
        '''  payment_status: string | null;\n  subtotal_amount: number | string | null;\n  delivery_fee_amount: number | string | null;\n  total_amount: number | string | null;''',
        "board order money fields",
    )

    board = replace_once(
        board,
        '''  guestPhone: string | null;\n  fullAddress: string | null;\n  mapsHref: string | null;''',
        '''  guestPhone: string | null;\n  fullAddress: string | null;\n  addressLine: string | null;\n  addressReference: string | null;\n  deliveryDistanceKm: number | null;\n  billedDistanceKm: number | null;\n  mapsHref: string | null;''',
        "board delivery fields",
    )

    board = replace_once(
        board,
        '''function optionEffectLabel(effectType: string | null) {''',
        '''function formatDistance(value: number | null) {\n  if (value == null || !Number.isFinite(value)) return null;\n  return `${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(value)} km`;\n}\n\nfunction parseDeliveryReference(value: string | null) {\n  const result = {\n    type: null as string | null,\n    label: null as string | null,\n    details: null as string | null,\n    instructions: null as string | null,\n    fallback: null as string | null,\n  };\n\n  if (!value) return result;\n\n  const unmatched: string[] = [];\n  value.split("|").map((part) => part.trim()).filter(Boolean).forEach((part) => {\n    const separatorIndex = part.indexOf(":");\n    if (separatorIndex < 0) {\n      unmatched.push(part);\n      return;\n    }\n\n    const key = part.slice(0, separatorIndex).trim().toLowerCase();\n    const content = part.slice(separatorIndex + 1).trim();\n    if (!content) return;\n\n    if (key === "tipo") result.type = content;\n    else if (key === "etiqueta") result.label = content;\n    else if (key === "detalles") result.details = content;\n    else if (key === "entrega" || key === "instrucciones") result.instructions = content;\n    else unmatched.push(part);\n  });\n\n  result.fallback = unmatched.length > 0 ? unmatched.join(" · ") : null;\n  return result;\n}\n\nfunction optionEffectLabel(effectType: string | null) {''',
        "board delivery helpers",
    )

    board = replace_once(
        board,
        '''          {order.fulfillment_type === "delivery" ? (\n            <div className="mt-0.5 truncate text-[11px] text-slate-400">Despacho: {data.dispatchLabel}</div>\n          ) : null}''',
        '''          {order.fulfillment_type === "delivery" && order.status !== "cancelled" ? (\n            <div className="mt-0.5 truncate text-[11px] text-slate-400">Despacho: {data.dispatchLabel}</div>\n          ) : null}''',
        "card cancelled dispatch",
    )

    board = replace_once(
        board,
        '''  const [billingDetailsOpen, setBillingDetailsOpen] = useState(false);\n  const [unreadByOrder, setUnreadByOrder] = useState<Record<string, number>>({});''',
        '''  const [billingDetailsOpen, setBillingDetailsOpen] = useState(false);\n  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);\n  const [unreadByOrder, setUnreadByOrder] = useState<Record<string, number>>({});''',
        "board copied state",
    )

    board = replace_once(
        board,
        '''  const selectedBilling = selected?.billing ?? null;\n\n  const totalUnread = useMemo(''',
        '''  const selectedBilling = selected?.billing ?? null;\n  const selectedItemsSubtotal = selected\n    ? selected.items.reduce((sum, item) => sum + Number(item.total_amount || 0), 0)\n    : 0;\n  const selectedProductSubtotal = selected\n    ? Number(selected.order.subtotal_amount ?? selectedItemsSubtotal)\n    : 0;\n  const selectedDeliveryFee = selected\n    ? Number(selected.order.delivery_fee_amount ?? 0)\n    : 0;\n  const selectedAddressMeta = parseDeliveryReference(selected?.addressReference ?? null);\n\n  const totalUnread = useMemo(''',
        "board totals",
    )

    board = replace_once(
        board,
        '''  const selectTab = (tab: ModalTab) => {\n    setActiveTab(tab);\n    if (tab === "chat" && selected?.conversation) {\n      void markRead(selected.conversation.id, selected.order.id);\n    }\n  };''',
        '''  const selectTab = (tab: ModalTab) => {\n    setActiveTab(tab);\n    if (tab === "chat" && selected?.conversation) {\n      void markRead(selected.conversation.id, selected.order.id);\n    }\n  };\n\n  const copySelectedAddress = async () => {\n    const value = selected?.addressLine || selected?.fullAddress;\n    if (!selected || !value || typeof navigator === "undefined" || !navigator.clipboard) return;\n\n    await navigator.clipboard.writeText(value);\n    setCopiedOrderId(selected.order.id);\n    window.setTimeout(() => setCopiedOrderId(null), 1800);\n  };''',
        "board copy address",
    )

    board = replace_once(
        board,
        '''                  <div className="space-y-4">\n                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">''',
        '''                  <div className="space-y-4">\n                    {selected.order.status === "cancelled" ? (\n                      <section className="rounded-2xl border border-red-200 bg-red-50 p-4">\n                        <div className="flex items-start gap-3">\n                          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />\n                          <div>\n                            <div className="text-sm font-black text-red-950">\n                              {selected.order.payment_status === "failed" ? "Pago fallido" : "Pedido cancelado"}\n                            </div>\n                            <div className="mt-1 text-sm font-semibold text-red-800">\n                              {selected.order.payment_status === "failed"\n                                ? "El pedido fue cancelado porque el pago no fue aprobado."\n                                : "Este pedido ya no requiere preparación ni despacho."}\n                            </div>\n                          </div>\n                        </div>\n                      </section>\n                    ) : null}\n\n                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">''',
        "board cancelled alert",
    )

    board = replace_once(
        board,
        '''                        <div className="text-lg font-black text-slate-950">{formatMoney(selected.order.total_amount)}</div>''',
        '''                        <div className="text-lg font-black text-slate-950">{formatMoney(selectedProductSubtotal)}</div>''',
        "products subtotal",
    )

    old_actions = '''                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">\n                      <div className="mb-3">\n                        <div className="text-sm font-black text-slate-950">Acciones del pedido</div>\n                        <div className="text-xs text-slate-500">Avanza el pedido según su estado operativo.</div>\n                      </div>\n\n                      {selected.paymentBlocked ? (\n                        <div className="ui-alert ui-alert--warn mb-3">Pago pendiente: este domicilio no debe prepararse hasta que Wompi lo confirme.</div>\n                      ) : null}\n\n                      <form action={updateOperationalOrderAction} className="flex flex-wrap gap-2">\n                        <input type="hidden" name="order_id" value={selected.order.id} />\n                        <input type="hidden" name="site_id" value={siteId} />\n                        <input type="hidden" name="view" value={view} />\n                        <input type="hidden" name="fulfillment" value={fulfillment} />\n                        {selected.operationButtons.map((button) => (\n                          <button\n                            key={`${selected.order.id}-${button.op}`}\n                            type="submit"\n                            name="op"\n                            value={button.op}\n                            className={`ui-btn h-10 px-4 text-sm ${button.op === "mark_cancelled" ? "ui-btn--danger" : "ui-btn--primary"}`}\n                          >\n                            <ActionIcon op={button.op} />\n                            {button.label}\n                          </button>\n                        ))}\n                      </form>\n                    </section>'''
    new_actions = '''                    {selected.operationButtons.length > 0 || selected.paymentBlocked ? (\n                      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">\n                        <div className="mb-3">\n                          <div className="text-sm font-black text-slate-950">Acciones del pedido</div>\n                          <div className="text-xs text-slate-500">Avanza el pedido según su estado operativo.</div>\n                        </div>\n\n                        {selected.paymentBlocked ? (\n                          <div className="ui-alert ui-alert--warn mb-3">Pago pendiente: este domicilio no debe prepararse hasta que Wompi lo confirme.</div>\n                        ) : null}\n\n                        <form action={updateOperationalOrderAction} className="flex flex-wrap gap-2">\n                          <input type="hidden" name="order_id" value={selected.order.id} />\n                          <input type="hidden" name="site_id" value={siteId} />\n                          <input type="hidden" name="view" value={view} />\n                          <input type="hidden" name="fulfillment" value={fulfillment} />\n                          {selected.operationButtons.map((button) => (\n                            <button\n                              key={`${selected.order.id}-${button.op}`}\n                              type="submit"\n                              name="op"\n                              value={button.op}\n                              className={`ui-btn h-10 px-4 text-sm ${button.op === "mark_cancelled" ? "ui-btn--danger" : "ui-btn--primary"}`}\n                            >\n                              <ActionIcon op={button.op} />\n                              {button.label}\n                            </button>\n                          ))}\n                        </form>\n                      </section>\n                    ) : null}'''
    board = replace_once(board, old_actions, new_actions, "board actions visibility")

    old_delivery = '''                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">\n                      <div className="flex items-center gap-2">\n                        {selected.order.fulfillment_type === "delivery" ? <Bike className="h-4 w-4 text-cyan-600" /> : <Store className="h-4 w-4 text-cyan-600" />}\n                        <div className="text-sm font-black text-slate-950">Entrega</div>\n                      </div>\n\n                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">\n                        <div><div className="text-xs font-bold uppercase tracking-wide text-slate-400">Tipo</div><div className="font-bold text-slate-900">{selected.fulfillmentLabel}</div></div>\n                        <div><div className="text-xs font-bold uppercase tracking-wide text-slate-400">Despacho</div><div className="font-bold text-slate-900">{selected.dispatchLabel}</div></div>\n                        {selected.order.delivery_zone ? <div><div className="text-xs font-bold uppercase tracking-wide text-slate-400">Zona</div><div className="font-bold text-slate-900">{selected.order.delivery_zone}</div></div> : null}\n                        <div><div className="text-xs font-bold uppercase tracking-wide text-slate-400">Pago</div><div className="font-bold text-slate-900">{selected.paymentLabel}</div></div>\n                      </div>\n\n                      {selected.order.fulfillment_type === "delivery" ? (\n                        <div className="mt-4 border-t border-slate-100 pt-4">\n                          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Dirección</div>\n                          <div className="mt-1 text-sm font-semibold leading-6 text-slate-800">{selected.fullAddress || "Sin dirección cargada"}</div>\n                          {selected.mapsHref ? (\n                            <a href={selected.mapsHref} target="_blank" rel="noreferrer" className="mt-3 inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">\n                              <MapPin className="h-4 w-4" /> Abrir en Google Maps\n                            </a>\n                          ) : null}\n                        </div>\n                      ) : null}\n                    </section>'''
    new_delivery = '''                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">\n                      <div className="flex items-center gap-2">\n                        {selected.order.fulfillment_type === "delivery" ? <Bike className="h-4 w-4 text-cyan-600" /> : <Store className="h-4 w-4 text-cyan-600" />}\n                        <div className="text-sm font-black text-slate-950">Entrega</div>\n                      </div>\n\n                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">\n                        <div><div className="text-xs font-bold uppercase tracking-wide text-slate-400">Tipo</div><div className="font-bold text-slate-900">{selected.fulfillmentLabel}</div></div>\n                        {selected.order.status !== "cancelled" ? (\n                          <div><div className="text-xs font-bold uppercase tracking-wide text-slate-400">Despacho</div><div className="font-bold text-slate-900">{selected.dispatchLabel}</div></div>\n                        ) : null}\n                        {selected.order.fulfillment_type === "delivery" && selected.deliveryDistanceKm != null ? (\n                          <div>\n                            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Distancia real</div>\n                            <div className="font-bold text-slate-900">{formatDistance(selected.deliveryDistanceKm)}</div>\n                            {selected.billedDistanceKm != null && selected.billedDistanceKm !== selected.deliveryDistanceKm ? (\n                              <div className="mt-0.5 text-xs font-semibold text-slate-500">Tarifa: hasta {formatDistance(selected.billedDistanceKm)}</div>\n                            ) : null}\n                          </div>\n                        ) : null}\n                        <div><div className="text-xs font-bold uppercase tracking-wide text-slate-400">Pago</div><div className="font-bold text-slate-900">{selected.paymentLabel}</div></div>\n                      </div>\n\n                      {selected.order.fulfillment_type === "delivery" ? (\n                        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">\n                          <div>\n                            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Dirección</div>\n                            <div className="mt-1 text-sm font-semibold leading-6 text-slate-800">{selected.addressLine || "Sin dirección cargada"}</div>\n                          </div>\n\n                          {selectedAddressMeta.details || selectedAddressMeta.type || selectedAddressMeta.label || selectedAddressMeta.fallback ? (\n                            <div>\n                              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Detalles</div>\n                              <div className="mt-1 text-sm font-semibold leading-6 text-slate-800">\n                                {[selectedAddressMeta.type, selectedAddressMeta.label, selectedAddressMeta.details, selectedAddressMeta.fallback].filter(Boolean).join(" · ")}\n                              </div>\n                            </div>\n                          ) : null}\n\n                          {selectedAddressMeta.instructions ? (\n                            <div>\n                              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Instrucciones</div>\n                              <div className="mt-1 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950">{selectedAddressMeta.instructions}</div>\n                            </div>\n                          ) : null}\n\n                          <div className="flex flex-wrap gap-2">\n                            {selected.mapsHref ? (\n                              <a href={selected.mapsHref} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">\n                                <MapPin className="h-4 w-4" /> Abrir en Google Maps\n                              </a>\n                            ) : null}\n                            {selected.addressLine ? (\n                              <button type="button" onClick={() => void copySelectedAddress()} className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">\n                                <Copy className="h-4 w-4" /> {copiedOrderId === selected.order.id ? "Copiada" : "Copiar dirección"}\n                              </button>\n                            ) : null}\n                          </div>\n                        </div>\n                      ) : null}\n                    </section>'''
    board = replace_once(board, old_delivery, new_delivery, "board delivery section")

    board = replace_once(
        board,
        '''                    {selected.order.fulfillment_type === "delivery" ? (\n                      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">''',
        '''                    {selected.order.fulfillment_type === "delivery" && selected.order.status !== "cancelled" ? (\n                      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">''',
        "board cancelled courier",
    )

    board = replace_once(
        board,
        '''                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">\n                      <div className="flex items-center gap-2"><Banknote className="h-4 w-4 text-cyan-600" /><div className="text-sm font-black text-slate-950">Resumen</div></div>\n                      <div className="mt-3 flex items-center justify-between gap-4"><div className="text-sm font-semibold text-slate-500">Total del pedido</div><div className="text-xl font-black text-slate-950">{formatMoney(selected.order.total_amount)}</div></div>\n                    </section>''',
        '''                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">\n                      <div className="flex items-center gap-2"><Banknote className="h-4 w-4 text-cyan-600" /><div className="text-sm font-black text-slate-950">Resumen</div></div>\n                      <div className="mt-3 space-y-2">\n                        <div className="flex items-center justify-between gap-4">\n                          <div className="text-sm font-semibold text-slate-500">Productos</div>\n                          <div className="text-sm font-black text-slate-900">{formatMoney(selectedProductSubtotal)}</div>\n                        </div>\n                        {selectedDeliveryFee > 0 ? (\n                          <div className="flex items-center justify-between gap-4">\n                            <div className="text-sm font-semibold text-slate-500">Domicilio</div>\n                            <div className="text-sm font-black text-slate-900">{formatMoney(selectedDeliveryFee)}</div>\n                          </div>\n                        ) : null}\n                        <div className="mt-2 flex items-center justify-between gap-4 border-t border-slate-200 pt-3">\n                          <div>\n                            <div className="text-sm font-black text-slate-950">Total del pedido</div>\n                            <div className="mt-0.5 text-xs font-semibold text-slate-500">Pago: {selected.paymentLabel}</div>\n                          </div>\n                          <div className="text-xl font-black text-slate-950">{formatMoney(selected.order.total_amount)}</div>\n                        </div>\n                      </div>\n                    </section>''',
        "board price breakdown",
    )

    board_path.write_text(board, encoding="utf-8")
