import { log, craft, simple, direct, noop } from "@routecraft/routecraft";
import { z } from "zod";

/**
 * Fan-out / fan-in: take one order, price each line item independently, then
 * collect the priced items back into a single result with an order total.
 *
 *   process-order  --split-->  price-check (per item)  --aggregate-->  log
 *
 * `split()` turns an array body into one exchange per element. `direct()` sends
 * each item to a second capability (request/reply), and `aggregate()` waits for
 * every reply and recombines them into an array. This is the backbone of most
 * batch work.
 */

const OrderItemSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
});
type OrderItem = z.infer<typeof OrderItemSchema>;

export interface PricedItem extends OrderItem {
  total: number;
  discounted: boolean;
}

const round = (value: number): number => Math.round(value * 100) / 100;

const priceCheck = craft()
  .id("price-check")
  .title("Price check")
  .description("Apply pricing rules to a single order item.")
  .input({ body: OrderItemSchema })
  .from<OrderItem>(direct())
  .transform<PricedItem>((item) => {
    // 10% off when you order ten or more of the same item.
    const discount = item.quantity >= 10 ? 0.9 : 1;
    return {
      ...item,
      total: round(item.unitPrice * item.quantity * discount),
      discounted: discount < 1,
    };
  })
  .to(noop());

// Two .to() calls are intentional in this route: the first dispatches each item
// to the price-check worker (request/reply via direct), the second logs the
// aggregated result. This fan-out/fan-in shape is exactly what split() and
// aggregate() are for, so the single-to-per-route heuristic does not apply.
// eslint-disable-next-line @routecraft/routecraft/single-to-per-route
const processOrder = craft()
  .id("process-order")
  .from(
    simple({
      orderId: "ORD-2026-001",
      customer: "Acme Corp",
      items: [
        { sku: "WIDGET-A", name: "Widget A", quantity: 5, unitPrice: 12.99 },
        { sku: "GADGET-B", name: "Gadget B", quantity: 15, unitPrice: 8.5 },
        { sku: "GIZMO-C", name: "Gizmo C", quantity: 30, unitPrice: 3.0 },
        { sku: "THING-D", name: "Thing D", quantity: 1, unitPrice: 149.99 },
      ],
    }),
  )
  .tap(
    log(({ body }) => `Processing order ${body.orderId} for ${body.customer}`),
  )
  .transform((order) => order.items)
  .split()
  .schema(OrderItemSchema)
  .to(direct<OrderItem, PricedItem>("price-check"))
  .aggregate()
  .transform((items) => ({
    itemCount: items.length,
    orderTotal: round(items.reduce((sum, item) => sum + item.total, 0)),
    items,
  }))
  .to(log());

export default [priceCheck, processOrder];
