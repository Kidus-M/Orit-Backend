# Orit Tej backend

Next.js API backend for the Orit Tej member app. It uses Neon Postgres, Drizzle ORM, Stripe, four-digit PIN authentication, persistent device sessions, automatic membership renewal, pickup orders, read-only notifications, inventory status, and complimentary-bottle benefits.

## Initial setup

1. Copy .env.example to .env.local and fill every required value.
2. In Neon, copy the pooled URL to DATABASE_URL and the direct URL to DATABASE_URL_UNPOOLED.
3. Generate long random values for PASSWORD_PEPPER, SESSION_TOKEN_PEPPER, PICKUP_SECURITY_PEPPER, ADMIN_API_KEY, and CRON_SECRET. Set PUBLIC_APP_URL to the deployed HTTPS site and choose Leyou Ethiopian's four-digit LEYOU_SERVICE_CODE.
4. Run:

~~~powershell
npm install
npm run db:migrate
npm run db:seed
npm run dev
~~~

db:seed is safe to rerun. Reference plans and Leyou Ethiopian are upserted, and demo users/orders are only inserted when the users table is empty.

Demo PIN for the seeded member, store owner, and admin:

~~~text
2468
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

Members register with first name, email, and a four-digit numeric PIN. PINs are scrypt-hashed with PASSWORD_PEPPER. Incorrect sign-in attempts are limited per email and device for 15 minutes. The server returns an opaque one-year device session; only its SHA-256 hash is stored in Neon. The Flutter app stores the raw session in Android Keystore/iOS Keychain through flutter_secure_storage, so users remain signed in between launches.

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
- Read or change membership status: GET/PATCH /api/membership
- Pickup locations and stock: GET /api/locations
- Member orders: GET/POST /api/orders
- Regenerate a pending order QR: POST /api/orders/:id/pickup
- Verify pickup service code: POST /api/pickup/verify
- Complete one-time pickup: POST /api/pickup/complete
- Submit a concern (signed-in session, no extra PIN): POST /api/concerns
- Read-only inbox: GET /api/messages
- Mark message read: POST /api/messages/:id/read
- Complimentary benefit: GET /api/member-benefit
- Store order queue: GET /api/store/orders
- Complete pickup: POST /api/store/orders/:id/complete
- Stock status/broadcast: PATCH /api/store/inventory
- Scan complimentary code: POST /api/admin/benefits/scan
- Verify universal vendor code: POST /api/auth/vendors/code/verify
- Register a passwordless vendor business: POST /api/auth/vendors/register
- Save a vendor card: POST /api/stripe/payment-sheet/vendor-card and POST /api/account/payment-method/vendor
- Read vendor access and case pricing: GET /api/vendor-orders
- Place a paid vendor case order: POST /api/vendor-orders
- Confirm an emailed vendor order link: POST /api/vendor-orders/confirm

Completing an order keeps it in the queue with status=completed, so the store UI can render it unhighlighted and disable the Complete action. Out-of-stock updates broadcast a read-only message to all active member accounts.

## Customer pickup QR website

Each paid order receives a cryptographically random one-time URL at `/pickup/<token>`. A phone camera can open that URL, but customer details remain hidden until the employee enters the pickup location's four-digit service code. The page then shows the member name, email, quantity, and a large green Complete button.

The root website, invalid tokens, expired tokens, and completed tokens return 404. Only an active QR URL can reach the page. Tokens are stored only as keyed hashes, service codes are keyed hashes, and incorrect service-code attempts are limited to five per order and IP in 15 minutes.

The Flutter My orders page calls `POST /api/orders/:id/pickup` when a member reopens a pending purchase. This rotates the token, invalidates any older QR copy, and returns a new QR URL. Completed orders remain visible in history without a QR.

For local testing, the seeded Leyou code defaults to `1100`. Change `LEYOU_SERVICE_CODE` before seeding a real environment. `PUBLIC_APP_URL` must be the reachable HTTPS address of this Next.js deployment; `localhost` QR links will not work from an employee's phone.

## Admin dashboard

Open `/admin` and sign in with an account whose role is `admin`. The dashboard uses a secure HttpOnly cookie and is blocked from search indexing. Admins can review customer and vendor orders, update the universal four-digit vendor code, manage concerns, update membership programs, and search accounts.

Members submit concerns from the app while signed in; the concern form does not ask for their PIN again.
## Vendor ordering

Customer and vendor onboarding are separate. The admin sets one universal four-digit code under Admin Dashboard > Vendor Orders. A new vendor verifies that code, registers with only a business name and business email, saves a card, and orders cases. Returning vendors keep a persistent device session and go from Welcome directly to case ordering. Incorrect vendor-code attempts are limited to five per IP every 15 minutes. The initial case price is $85 with a $50 transportation fee.

Each successful paid case order is stored in vendor_orders and emailed only to orittej@gmail.com through Resend. The message contains a cryptographically random /vendor-order/<token> link with the vendor name, email, quantity, fees, and total. The recipient presses Confirm once the order has been accepted.

Set RESEND_API_KEY and VENDOR_ORDER_FROM_EMAIL in Vercel. The sender must use a domain verified in Resend. If email is not configured or Resend is unavailable, payment and order creation still complete, and the server logs that notification delivery failed.
## Flutter development

Android emulator:

~~~powershell
flutter run --dart-define=ORIT_API_BASE_URL=https://orit-backend.vercel.app --dart-define=ORIT_PAYMENT_MODE=mock
~~~

Stripe test mode:

~~~powershell
flutter run --dart-define=ORIT_API_BASE_URL=https://orit-backend.vercel.app --dart-define=ORIT_PAYMENT_MODE=stripe
~~~

The deployed backend is the default API. Override ORIT_API_BASE_URL only when intentionally testing another backend.

## Checks

~~~powershell
npm run check
npm run build
~~~

The generated SQL migration is in drizzle/. Do not run db:generate again unless the schema changes; deploy with npm run db:migrate.




## Android tester releases

The app checks `/downloads/android-update.json` at startup. A required release blocks the old app, downloads the versioned APK inside the app, verifies its SHA-256 checksum natively, and opens Android's installer.

Build each release from the Flutter project after increasing both the version name and build number. Then publish it from this project:

~~~powershell
npm run release:android -- --apk "..\orit_tej_app\build\app\outputs\flutter-apk\app-release.apk" --version 0.0.3 --build 3 --note "What changed"
npm run check
npm run build
~~~

The publisher copies the APK into `public/downloads`, calculates its checksum and size, and updates the manifest and website download button. By default, the published build is required for every older build. Android build numbers must always increase, and every APK must use the same signing key as the first tester release.

## Permanent Wolf Den menu QR

The printable QR in `public/qr/wolf-den-menu-qr.png` and its vector equivalent in `public/qr/wolf-den-menu-qr.svg` both encode:

~~~text
https://orit-backend.vercel.app/wolf-den-menu
~~~

That server route permanently redirects to `https://www.wolfdenaddis.com/menu`. Keeping the printed code pointed at the Orit Tej route allows the final destination to be changed later without reprinting the QR. Regenerate both print assets with
pm run generate:menu-qr`.
