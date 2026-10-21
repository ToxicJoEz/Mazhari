# Mazhari

A complete EGP / cash-on-delivery store: React 19, Vite, Tailwind 4 layout utilities and SCSS styling, Express, MongoDB/Mongoose. Frontend and API deploy together on Vercel.

## Run locally

- Install dependencies with npm ci.
- Copy .env.example to .env and supply MONGODB_URI and JWT_SECRET (at least 32 unique random characters). Keep credentials out of Git. The existing local .env is already configured.
- Run npm run dev:full or start_all.bat. Ctrl+C stops both children. Default API: localhost:5000; storefront: localhost:5173.
- Alternatively, run npm run server and npm run dev separately. PORT controls the local API; API_PORT can override the Vite proxy, and FRONTEND_PORT changes the combined launcher's frontend port.
- npm run build always bundles production React, even when the local .env has NODE_ENV=development.

## Deployment

main in ToxicJoEz/Mazhari deploys to the linked Vercel project. MONGODB_URI and JWT_SECRET must be configured in the target Vercel environment. The api/index.js function imports the modular server/ application; rewrites preserve SPA navigation and send /api/* to Express. Internal backend files stay outside api/.

GET /api/health waits for connection/index initialization and pings MongoDB. Warm invocations share the connection pool. Missing configuration or database failures return 503 rather than mock success. Account, contact, checkout, quote and tracking attempts have database-backed rate limits.

## Store administration

Sign in with an administrator account and open /admin, or use My account → Admin dashboard.

- Overview: order/customer counts, low-stock products, pending password requests and collected cash (EGP).
- Products: create/edit products, collection, price, description, material, care, images, publication and featured flags. Each color/size pair has its own available stock. Products can be soft-deleted/restored. Variants used by reserved orders cannot be removed.
- Orders: search/filter orders; inspect customer, delivery and line-item snapshots; move through all fulfilment statuses in either direction; record cash separately. Customer-visible notes appear in tracking. Cancel releases stock exactly once; reopening checks and reserves it again. Reconcile collected cash before cancellation.
- Customers: view accounts and recent orders, update name/mobile, ban/unban and soft-delete/restore customers. Administrator accounts cannot be banned/deleted/reset through customer controls.
- Delivery: set the rate for each of Egypt's 27 governorates. Empty means contact required; zero explicitly means free delivery. Disabled or unconfigured locations cannot complete checkout. The fee applies once per order.
- Support: contact messages and manual password-reset requests. Verify customers via their registered contact details before setting a temporary password; the site sends no automatic reset email/message. Resetting a password invalidates existing sessions.
- Store settings: hero title/subtitle/banner, announcement and contact email/phone/WhatsApp.

Before real orders, enter real delivery rates, contact details and products/prices/stock. The five clearly labelled sample products are editable/removable. Cloudinary is intentionally deferred. The local vector product/banner placeholders work without external image services; optional HTTPS image URLs are supported.

## Customer flows

Catalog/collections use MongoDB, with search and collection/color/size/stock/price filters and sorting. Product availability matches the exact color/size variant.

Guest bags persist in localStorage. Signed-in bags persist in MongoDB. Signing in or registering from checkout carries the guest bag over using an idempotent merge key, then returns to checkout. Cart revision checks prevent silent overwrites from another session. Stock and catalog prices are revalidated server-side.

Checkout supports guests and accounts. A server quote calculates current prices and governorate shipping. Order creation checks the displayed total, records policy acceptance, and transactionally reserves inventory, creates the order and clears the account bag. Idempotency keys prevent duplicate orders after request retries. No online payment gateway is used.

Account orders appear in My orders. Customers may cancel their own pending/confirmed orders. Guest confirmations include a private tracking key, which is required along with the order number. The key is also saved in that browser; possession grants access to the order. Guessing an order number or matching an email/phone is insufficient.

Profiles support details, saved addresses, password changes and account deactivation/restoration. Passwords use bcrypt; login tokens live in per-tab sessionStorage and survive reloads. Role/status checks come from the database on every authenticated request. Password changes/resets and account restrictions invalidate previous sessions.

## Checks

- npm test: seven focused authentication, hashing and validation tests.
- npm run test:integration: real MongoDB API/transaction suite. Uses a uniquely named mazhari_qa_<random> database on the configured Atlas cluster, creates only labelled QA fixtures, and removes that database's collections afterward. The connection must permit creating collections/databases. Store catalog, rates and accounts are not modified by this suite.
- npm run lint, npm run format:check, npm run build, npm audit.
- npm run seed:demo: creates five sample products only when the configured store has no products; never overwrites an existing catalog.

## Scope

Placeholder images are deliberate. Cloudinary uploading is the remaining deferred integration. Contact messages and password requests use the admin inbox; automatic email/SMS services are not part of the configured business flow. Public store policies are available under Delivery, Terms and Privacy.
