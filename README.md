# Orit Tej backend

Next.js API backend for the Orit Tej member app. It uses Neon Postgres, Drizzle ORM, Stripe, password authentication, persistent device sessions, automatic membership renewal, pickup orders, read-only notifications, inventory status, and complimentary-bottle benefits.

## Initial setup

1. Copy .env.example to .env.local and fill every required value.
2. In Neon, copy the pooled URL to DATABASE_URL and the direct URL to DATABASE_URL_UNPOOLED.
3. Generate long random values for PASSWORD_PEPPER, SESSION_TOKEN_PEPPER, ADMIN_API_KEY, and CRON_SECRET.
4. Run:

~~~powershell
npm install
npm run db:migrate
npm run db:seed
npm run dev
~~~

db:seed is safe to rerun. Reference plans and Leyou Ethiopian are upserted, and demo users/orders are only inserted when the users table is empty.

Demo password for the seeded member, store owner, and admin:

~~~text
DemoPassword123!
~~~

The optional demo bearer tokens come from .env.local.

## Stripe

Start with Stripe test keys:

~~~dotenv
PAYMENT_MODE=stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CURRENCY=usd
~~~

The mobile flow creates a PaymentIntent and Stripe PaymentSheet. The first membership payment uses setup_future_usage=off_session, allowing the saved Stripe PaymentMethod to be used for bottle orders and automatic renewals. Orit Tej stores only Stripe IDs and masked card metadata, never card numbers or CVV.

For local webhook testing:

~~~powershell
stripe listen --forward-to localhost:3000/api/stripe/webhook
~~~

Put the webhook signing secret printed by Stripe CLI in STRIPE_WEBHOOK_SECRET. In the Stripe Dashboard, configure the production webhook URL for at least payment_intent.payment_failed.

Leave PAYMENT_MODE=mock during UI-only development. Mock mode still exercises the server-side membership and order rules but does not charge a card.

## Scheduled maintenance

Call the maintenance endpoint on a schedule (daily is sufficient):

~~~http
GET /api/internal/maintenance
Authorization: Bearer <CRON_SECRET>
~~~

It expires unused complimentary offers, renews due memberships automatically using the saved Stripe payment method, records the payment, and sends a member notification. A failed renewal expires the membership so the plan page appears again.

## Authentication

Members register with first name, email, and password. Passwords are scrypt-hashed with PASSWORD_PEPPER. The server returns an opaque one-year device session; only its SHA-256 hash is stored in Neon. The Flutter app stores the raw session in Android Keystore/iOS Keychain through flutter_secure_storage, so users remain signed in between launches.

Main auth endpoints:

- POST /api/auth/members/register
- POST /api/auth/store-owners/register
- POST /api/auth/login
- POST /api/auth/logout
- GET/PATCH/DELETE /api/account

Authenticated endpoints use Authorization: Bearer <session-token>.

## Main API rules

- Membership plans: GET /api/membership/plans
- Stripe membership PaymentSheet: POST /api/stripe/payment-sheet/membership
- Confirm membership purchase: POST /api/memberships/purchase
- Pickup locations and stock: GET /api/locations
- Member orders: GET/POST /api/orders
- Read-only inbox: GET /api/messages
- Mark message read: POST /api/messages/:id/read
- Complimentary benefit: GET /api/member-benefit
- Store order queue: GET /api/store/orders
- Complete pickup: POST /api/store/orders/:id/complete
- Stock status/broadcast: PATCH /api/store/inventory
- Scan complimentary code: POST /api/admin/benefits/scan

Completing an order keeps it in the queue with status=completed, so the store UI can render it unhighlighted and disable the Complete action. Out-of-stock updates broadcast a read-only message to all active member accounts.

## Flutter development

Android emulator:

~~~powershell
flutter run --dart-define=ORIT_API_BASE_URL=http://10.0.2.2:3000 --dart-define=ORIT_PAYMENT_MODE=mock
~~~

Stripe test mode:

~~~powershell
flutter run --dart-define=ORIT_API_BASE_URL=http://10.0.2.2:3000 --dart-define=ORIT_PAYMENT_MODE=stripe
~~~

For a physical phone, replace 10.0.2.2 with an HTTPS development URL or the computer's reachable LAN address.

## Checks

~~~powershell
npm run check
npm run build
~~~

The generated SQL migration is in drizzle/. Do not run db:generate again unless the schema changes; deploy with npm run db:migrate.
