# ADR 0002: Model Member Event Purchases as Typed Customer Orders

- Status: Accepted
- Date: 2026-08-03

## Context

Active members can order two to four wine cases for an event. Event purchases use the same saved-payment, pickup-location, QR verification, and one-time completion lifecycle as personal bottle purchases, while using different pricing, readiness, and inventory rules.

Creating a second event-order table and a second pickup implementation would duplicate security-sensitive QR and completion logic.

## Decision

Store personal and event purchases in the existing `orders` table with an `order_type` discriminator.

Event orders additionally store:

- event type and date;
- the transportation fee captured at purchase;
- the earliest pickup time;
- the $150 case unit price captured at purchase.

The server is authoritative for eligibility and price. It requires an active membership, a quantity from two through four, an event date at least three days away, an active pickup location, and a saved payment method. Bottle inventory does not prevent event orders, but it continues to prevent personal bottle orders.

The existing QR token is used for both order types. Pickup verification exposes the order type and event details. Completion remains an atomic pending-to-completed update and invalidates the token. Event pickup verification is rejected until the stored pickup-ready time.

## Consequences

- Existing personal-order clients remain compatible because `order_type` defaults to `personal`.
- Payment, order history, staff verification, and completion share one lifecycle.
- Some event-only columns are nullable; API validation preserves their invariants.
- Monthly bottle reports must explicitly include only personal orders.
- Deployments must apply migration 0007 before code paths read the new columns.

## Failure handling

- Ineligible or malformed event orders fail before charging.
- Out-of-stock state blocks only personal orders.
- A failed payment creates no order or QR token.
- A QR scanned before pickup readiness returns a clear retryable message.
- A completed or expired token cannot be reused.
- Email failure is logged with the Resend response and does not roll back a successfully paid order.