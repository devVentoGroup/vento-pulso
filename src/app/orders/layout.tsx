import type { ReactNode } from "react";

import { DeliveryDispatchBridge } from "./delivery-dispatch-bridge";
import { DeliveryOverrideBridge } from "./delivery-override-bridge";

export default function OrdersLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <DeliveryDispatchBridge />
      <DeliveryOverrideBridge />
    </>
  );
}
