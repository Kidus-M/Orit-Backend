# Orit Tej Backend

The web, API, and operations service for the Orit Tej member app. This Next.js application powers member and vendor accounts, memberships, payments, pickup orders, notifications, complimentary-bottle benefits, the admin dashboard, and Android tester distribution.

## What this repository contains

- A public Orit Tej marketing website and Android download page
- REST API routes consumed by the Flutter app
- PIN-based member and store-owner authentication with persistent device sessions
- Passwordless vendor onboarding through separate, one-time four-digit codes created by an admin
- Stripe PaymentSheet flows for memberships, saved cards, bottle orders, and vendor case orders
- One-time customer pickup links and vendor confirmation links
- Membership renewal, expiration, notification, and monthly vendor-summary jobs
- An authenticated admin dashboard for accounts, orders, concerns, programs, vendor invitations, and vendor-linked pickup locations
- Android APK publishing and update-manifest tooling

## Technology

- Next.js 16 and React 19
- TypeScript
- Neon Postgres
- Drizzle ORM
- Stripe
- Resend
- Vercel

## Getting started

### Prerequisites

- Node.js and npm
- A Neon Postgres database
- Stripe test credentials for real payment testing
- Resend credentials if vendor-order emails should be delivered

### 1. Configure the environment

Copy `.env.example` to `.env.local`, then fill in the required values.

```powershell
Copy-Item .env.example .env.local
```

Important configuration groups:

| Group | Variables | Notes |
| --- | --- | --- |
| Database | `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | Use Neon's pooled URL at runtime and its direct URL for migrations. |
| Security | `PASSWORD_PEPPER`, `SESSION_TOKEN_PEPPER`, `PICKUP_SECURITY_PEPPER`, `ADMIN_API_KEY`, `CRON_SECRET` | Generate long, random, unique values. Never commit them. |
| Public URLs | `PUBLIC_APP_URL` | Set this to the deployed HTTPS origin used in pickup links. |
| Pickup | `LEYOU_SERVICE_CODE`, `PICKUP_QR_TTL_DAYS` | Choose the location's four-digit service code before seeding production. |
| Payments | `PAYMENT_MODE`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CURRENCY` | Use `mock` for UI development or `stripe` for real Stripe test/live flows. |
| Email | `RESEND_API_KEY`, `VENDOR_ORDER_FROM_EMAIL`, `ORDER_NOTIFICATION_EMAIL` | The sender domain must be verified in Resend. New-order and monthly-summary messages use the configured recipient. |
| Demo data | `SEED_IF_EMPTY`, `DEMO_MEMBER_TOKEN`, `DEMO_STORE_OWNER_TOKEN`, `DEMO_ADMIN_TOKEN` | Development-only values used by the seed process. |

See `.env.example` for the complete list and inline guidance.

### 2. Install, migrate, and seed

```powershell
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. You can verify the API at `GET /api/health`.

`npm run db:seed` is safe to rerun. It upserts reference plans and Leyou Ethiopian, and inserts demo users and orders only when the users table is empty. The seeded member, store owner, and admin use PIN `2468`; optional demo bearer tokens come from `.env.local`.

## Common commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local Next.js development server. |
| `npm run build` | Create a production build. |
| `npm run build:vercel` | Apply committed migrations, then create the Vercel production build. |
| `npm start` | Run the production build. |
| `npm run check` | Run ESLint and TypeScript checks. |
| `npm run db:migrate` | Apply committed Drizzle migrations. |
| `npm run db:seed` | Seed reference and optional demo data. |
| `npm run db:seed-member` | Seed a member using the related environment variables. |
| `npm run db:studio` | Open Drizzle Studio. |
| `npm run release:android` | Publish an APK and update the Android release manifest. |
| `npm run generate:menu-qr` | Regenerate the permanent Wolf Den menu QR assets. |

Only run `npm run db:generate` when the schema changes. Production deployments should apply the committed migrations with `npm run db:migrate`.

## Authentication and security

Members register with a first name, email address, and four-digit numeric PIN. PINs are scrypt-hashed with `PASSWORD_PEPPER`. Failed sign-in attempts are rate-limited per email and device for 15 minutes.

Successful authentication returns an opaque, one-year device session. The database stores only its SHA-256 hash; the Flutter app stores the raw value in Android Keystore or iOS Keychain through `flutter_secure_storage`.

Authenticated API requests use:

```http
Authorization: Bearer <session-token>
```

Primary authentication routes:

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/members/register` | Register a member. |
| `POST` | `/api/auth/store-owners/register` | Register a store owner. |
| `POST` | `/api/auth/login` | Sign in with email and PIN. |
| `POST` | `/api/auth/logout` | Revoke the current session. |
| `GET`, `PATCH`, `DELETE` | `/api/account` | Read, update, or delete the authenticated account. |

## API overview

### Memberships and benefits

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/membership/plans` | List membership plans. |
| `GET`, `PATCH` | `/api/membership` | Read or change membership status. |
| `POST` | `/api/stripe/payment-sheet/membership` | Create a membership PaymentSheet. |
| `POST` | `/api/memberships/purchase` | Confirm a membership purchase. |
| `GET` | `/api/member-benefit` | Read the complimentary-bottle benefit. |
| `POST` | `/api/admin/benefits/scan` | Redeem a complimentary benefit. |

### Member orders, locations, and messages

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/locations` | List admin-published pickup locations and stock state. |
| `GET`, `POST` | `/api/orders` | List or place member orders. |
| `POST` | `/api/orders/:id/pickup` | Rotate and return a pending order's pickup link. |
| `POST` | `/api/pickup/verify` | Verify a pickup-location service code. |
| `POST` | `/api/pickup/complete` | Complete a pickup once. |
| `POST` | `/api/concerns` | Submit a concern from the signed-in account. |
| `GET` | `/api/messages` | Read the account inbox. |
| `POST` | `/api/messages/:id/read` | Mark a message as read. |

### Store operations

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/store/orders` | Read the store's order queue. |
| `POST` | `/api/store/orders/:id/complete` | Complete a store pickup. |
| `PATCH` | `/api/store/inventory` | Change stock status and broadcast an update. |

Completed orders remain in the queue with `status=completed`, allowing the store UI to retain them while disabling repeat completion. Out-of-stock changes send a read-only message to all active member accounts.

### Vendor ordering

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/vendors/code/verify` | Verify an unused vendor invitation code. |
| `POST` | `/api/auth/vendors/register` | Register a passwordless vendor business. |
| `POST` | `/api/stripe/payment-sheet/vendor-card` | Create a vendor card-setup PaymentSheet. |
| `POST` | `/api/account/payment-method/vendor` | Save the vendor payment method. |
| `GET`, `POST` | `/api/vendor-orders` | Read access/pricing or place a case order. |
| `POST` | `/api/vendor-orders/confirm` | Confirm an emailed vendor order link. |

The admin creates a separate one-time four-digit invitation under **Admin Dashboard → Vendors & Locations** and gives it to one vendor. Signup permanently associates the vendor account with that invitation. A used code can be reassigned by creating it again; the previous invitation remains as audit history. Failed code attempts are limited to five per IP every 15 minutes.

The admin also creates pickup locations, links each location to a vendor, and controls its **Visible to customers** status. Vendors cannot publish their own locations. The Flutter app receives only active, admin-published locations from `GET /api/locations`.

Every paid customer bottle order and vendor case order sends a `NEW ORDERS` email to `ORDER_NOTIFICATION_EMAIL`. If email is not configured or delivery fails, payment and order creation still complete and the failure is logged.

## Payments

For Stripe test mode, configure:

```dotenv
PAYMENT_MODE=stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CURRENCY=usd
```

The first membership payment uses `setup_future_usage=off_session`, which allows its saved PaymentMethod to be reused for bottle orders and automatic renewals. Orit Tej stores Stripe identifiers and masked card metadata, never card numbers or CVV values.

For local webhook testing:

```powershell
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the signing secret printed by Stripe CLI into `STRIPE_WEBHOOK_SECRET`. For the deployed sandbox, add an Account webhook destination in Stripe Workbench using `https://orit-backend.vercel.app/api/stripe/webhook`, subscribe to `payment_intent.payment_failed`, and copy that destination's `whsec_...` signing secret into Vercel. Webhook signing secrets are different for the CLI and the deployed endpoint.

After filling `.env.local`, verify the key pair and account without printing either secret:

```bash
npm run stripe:check
```

The Flutter app fetches the publishable key from this backend. Never add `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` to Flutter, Dart defines, or Git.

Use `PAYMENT_MODE=mock` for UI-only development. Mock mode exercises server-side membership and ordering rules without charging a card.

## Scheduled maintenance

Call the internal maintenance route daily:

```http
GET /api/internal/maintenance
Authorization: Bearer <CRON_SECRET>
```

The job expires unused complimentary offers, renews due memberships with saved Stripe payment methods, records payments, and sends member notifications. A failed renewal expires the membership so the plan selection screen is shown again.

Vercel calls `GET /api/internal/monthly-summary` at 09:00 UTC on the 28th of every month. The protected job emails `ORDER_NOTIFICATION_EMAIL` a `SUMMARY` containing each vendor, cases confirmed during the current month, and customer bottles completed at locations linked to that vendor. Delivery state and idempotency prevent duplicate monthly emails.

## Pickup links

Every paid customer order receives a cryptographically random, one-time URL at `/pickup/<token>`. The page hides customer details until an employee enters the pickup location's four-digit service code, then displays the member name, email, quantity, and completion action.

Invalid, expired, and completed tokens return `404`. Tokens and service codes are stored only as keyed hashes, and failed service-code attempts are limited to five per order and IP every 15 minutes.

When a member reopens a pending order, the Flutter app calls `POST /api/orders/:id/pickup`. This rotates the token and invalidates older QR copies. Set `PUBLIC_APP_URL` to a phone-reachable HTTPS deployment; a `localhost` QR link will not work on an employee's phone.

The seeded Leyou code defaults to `1100`. Change it before seeding a real environment.

## Admin dashboard

Open `/admin` and sign in with an account whose role is `admin`. The dashboard uses a secure HttpOnly cookie and is excluded from search indexing. Admins can review customer and vendor orders, create one-time vendor invitations, add and edit pickup locations, link locations to vendors, control customer visibility, manage membership programs, handle concerns, and search accounts.

## Android tester releases

The Flutter app checks `/downloads/android-update.json` on startup. Required releases block outdated builds, download the versioned APK in-app, verify its SHA-256 checksum natively, and open the Android installer.

After increasing the version name and build number in the Flutter repository, build the signed APK there. Then publish it from this repository:

```powershell
npm run release:android -- --apk ../orit_tej_app/build/app/outputs/flutter-apk/app-release.apk --version 0.0.9 --build 9 --note 'What changed'
npm run check
npm run build
```

The publisher copies the APK into `public/downloads`, calculates its checksum and size, and updates both the release manifest and website download button. Android build numbers must always increase, and every release must use the same signing key as the first distributed build.

## Permanent Wolf Den menu QR

The printable files at `public/qr/wolf-den-menu-qr.png` and `public/qr/wolf-den-menu-qr.svg` encode:

```text
https://orit-backend.vercel.app/wolf-den-menu
```

That route redirects to `https://www.wolfdenaddis.com/menu`. Keeping the printed QR pointed at the Orit Tej route allows the final destination to change without reprinting it.

Regenerate both assets with:

```powershell
npm run generate:menu-qr
```

## Permanent Wolf Den events QR

The high-resolution printable files at `public/qr/wolf-den-events-qr.png` and `public/qr/wolf-den-events-qr.svg` encode:

```text
https://orit-backend.vercel.app/wolf-den-events
```

That route redirects to `https://www.wolfdenaddis.com/events`, so the destination can be changed later without reprinting the QR.

Regenerate both assets with:

```powershell
npm run generate:events-qr
```

## Before deploying

```powershell
npm run check
npm run build
```

Vercel runs `npm run build:vercel`, which applies committed Drizzle migrations before compiling the deployment. Also confirm that production secrets are set, `PUBLIC_APP_URL` uses HTTPS, the Stripe webhook is configured, and the Resend sender domain is verified.
