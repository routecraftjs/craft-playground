import { log, craft, simple } from "@routecraft/routecraft";

/**
 * Content-based routing with `choice()`.
 *
 * Each ticket is sent down exactly one branch based on its severity, much like
 * a switch statement for your pipeline. `when()` takes a predicate and a branch
 * builder; `otherwise()` is the fallback. Here every branch tags the ticket
 * with a target queue, and the main pipeline logs the routed result.
 */

type Severity = "critical" | "high" | "normal";

interface Ticket {
  id: string;
  subject: string;
  severity: Severity;
}

interface RoutedTicket extends Ticket {
  queue: string;
}

export default craft()
  .id("ticket-router")
  .title("Ticket router")
  .description("Route support tickets to a queue based on severity.")
  .from(
    simple<Ticket[]>([
      {
        id: "T-1",
        subject: "Checkout is completely down",
        severity: "critical",
      },
      { id: "T-2", subject: "Search is slow at peak hours", severity: "high" },
      { id: "T-3", subject: "Typo on the about page", severity: "normal" },
    ]),
  )
  .split()
  .choice<RoutedTicket>((c) =>
    c
      .when(
        (ex) => ex.body.severity === "critical",
        (b) =>
          b.transform<RoutedTicket>((t) => ({ ...t, queue: "page-on-call" })),
      )
      .when(
        (ex) => ex.body.severity === "high",
        (b) => b.transform<RoutedTicket>((t) => ({ ...t, queue: "priority" })),
      )
      .otherwise((b) =>
        b.transform<RoutedTicket>((t) => ({ ...t, queue: "backlog" })),
      ),
  )
  .to(log(({ body }) => `[${body.queue}] ${body.id}: ${body.subject}`));
