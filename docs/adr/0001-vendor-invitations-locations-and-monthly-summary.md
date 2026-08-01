# ADR-0001: Vendor invitations, owned locations, and monthly reporting

## Status

Accepted

## Context

A shared four-digit vendor code cannot identify which vendor used it, cannot be safely consumed once, and cannot support an auditable relationship between a vendor, its customer pickup location, and its orders. The business also needs admin-controlled customer visibility and a monthly email summary without introducing a separate vendor application or service.

## Decision

- Store vendor invitations as UUID-identified records. The four-digit code is an onboarding secret, not a primary key.
- Store an HMAC of each code for verification and an authenticated encrypted copy so an administrator can reveal it.
- Link a claimed invitation to one vendor through `users.vendor_invitation_id`, protected by a unique database constraint. Reassigning a four-digit value revokes its previous invitation and creates a new UUID invitation.
- Let administrators create and edit locations, optionally associate each location with a vendor, and control customer visibility with the location's `active` flag.
- Attribute confirmed case deliveries to the vendor account and completed bottle pickups to the vendor associated with the pickup location.
- Generate the month-to-date summary on the 28th through an authenticated Vercel Cron route and record delivery state in Postgres for idempotency and troubleshooting.
- Keep the existing Next.js backend and Neon Postgres deployment; no additional service is introduced.

## Consequences

### Positive

- Every vendor signup is attributable to a unique invitation even when four-digit values are reused.
- The admin controls every customer-visible location and its prices, stock, service code, and vendor association.
- Monthly totals exclude unconfirmed case orders and uncompleted customer pickups.
- Email retries are deduplicated by Resend and recorded in the database.

### Negative

- Four-digit codes remain low-entropy and therefore require the existing IP attempt limit.
- Customer location selection now requires a mobile update because the previous app hardcoded one location.
- The summary sent on the 28th is month-to-date and intentionally excludes activity after it is sent.

### Neutral

- Legacy vendors without an invitation remain valid, but new vendors are created through invitations.
- Locations without a vendor remain supported for Orit Tej-owned or legacy pickup points.

## Alternatives Considered

- Use the four-digit code as the vendor primary key: rejected because values are reusable and have only 10,000 combinations.
- Keep one universal code and let the admin promote accounts later: rejected because signup cannot be reliably attributed.
- Let vendors create and publish their own locations: rejected because the business requires admin ownership of customer visibility.
- Add a separate reporting worker: rejected because one monthly Vercel Cron invocation is sufficient for the current scale.

## Failure Modes and Mitigations

- Concurrent code claims: the unique invitation link allows only one vendor account to claim a code.
- Duplicate cron invocation: the monthly delivery table and Resend idempotency key suppress repeated sends.
- Email provider failure: the delivery is marked failed and can be retried through the protected endpoint.
- Missing vendor location: case ordering is blocked with a clear setup-pending message until the admin adds one.

## References

- Vercel Cron Jobs: https://vercel.com/docs/cron-jobs
- Resend idempotency keys: https://resend.com/docs/dashboard/emails/idempotency-keys
- Neon Postgres with Drizzle: https://neon.com/docs/guides/drizzle