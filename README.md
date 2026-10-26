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

Account orders appear in My orders. Customers may cancel their own pending orders. Guest confirmations include a private tracking key, which is required along with the order number. The key is also saved in that browser; possession grants access to the order. Guessing an order number or matching an email/phone is insufficient.

Profiles support details, saved addresses, password changes and account deactivation/restoration. Passwords use bcrypt; login tokens live in per-tab sessionStorage and survive reloads. Role/status checks come from the database on every authenticated request. Password changes/resets and account restrictions invalidate previous sessions.

## Checks

- npm test: seven focused authentication, hashing and validation tests.
- npm run test:integration: real MongoDB API/transaction suite. Uses a uniquely named mazhari_qa_<random> database on the configured Atlas cluster, creates only labelled QA fixtures, and removes that database's collections afterward. The connection must permit creating collections/databases. Store catalog, rates and accounts are not modified by this suite.
- npm run lint, npm run format:check, npm run build, npm audit.
- npm run seed:demo: creates five sample products only when the configured store has no products; never overwrites an existing catalog.

## Scope

Cloudinary powers all content photography. Blank or unavailable photos show text placeholders; no local asset photograph is selected automatically. Contact messages and password requests use the admin inbox; automatic email/SMS services are not part of the configured business flow. Public store policies are available under Delivery, Terms and Privacy.

## Cloudinary media

Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET on the server (local .env and Vercel Production/Preview). Never expose the secret through a VITE_ variable. Restart local servers after changing environment values.

Admin > Media library accepts JPEG, PNG, WebP and AVIF source photos up to 20 MB. The browser prepares a WebP version up to 3000 pixels for products and up to 6000 pixels at higher quality for banners (within 24 megapixels and 10 MB). Homepage banners use responsive high-quality delivery for large and high-density screens. In Media library, select Banner (high resolution) before uploading a banner. Admin-only signed uploads use restricted presets: mazhari_admin_images_v1 for product/collection photos and mazhari_admin_banners_v2 for banners. Banner masters are retained without an incoming recompression pass. The backend verifies each asset with Cloudinary before adding it to MongoDB. Unsigned uploads are not enabled. The library supports search, pagination, archive and restore; archiving in-use images is blocked. Archiving preserves the Cloudinary file for historical orders.

Admin > Products controls up to eight photos per product, the cover photo and gallery order. Admin > Store settings controls the homepage banner, image description and collection cover overrides. New collection covers default to an available product image until an override is saved. Removing an override image explicitly shows a placeholder. Save the product or settings form to publish image selections; uploaded files can also be reused later from the library.

Original source photos remain in src/assets for manual upload. They are not copied to the deployed site. The transition script scripts/clear-local-photo-references.js removes only local /images/ references, with an exclusive backup file required through IMAGE_BACKUP_PATH; it does not upload or delete any photo.

### Permanent image deletion

Archive is recoverable and retains the file in Cloudinary. In Media library, enable Archived / unfinished uploads and use Delete permanently to remove an unused asset from Cloudinary (including CDN invalidation) and its MongoDB media record. Product, banner, collection, saved-cart and historical-order references block deletion. Reference assignment and archive/deletion use transactional media locks to prevent assigning an image while it is being removed. If Cloudinary cannot confirm deletion, the record remains locked in deletion-pending state; Retry deletion completes cleanup safely. Expired unfinished upload records become available for cleanup after two hours, when their upload signatures have expired. Removing a photo from a product alone does not delete a reusable library image.

## Storefront and order UI

Product color names use standard CSS named colors (including spaced names such as Light Blue) or hex codes; unknown names remain plain text buttons. Product details prioritize related items from the same collection and fill remaining recommendation slots with other published products. All content images show an in-frame loading indicator.

All selection menus, confirmations, input prompts and form-validation messages use themed controls. Selectors support keyboard navigation, typeahead and Escape. Stacked dialogs retain focus in the active dialog. The order management dialog uses the available screen width and includes item photographs, quantities and readable status badges.

Fulfilment states are pending, processing, out_for_delivery, delivered and cancelled. Cash status remains separate. Customers can cancel pending orders; admins can reopen cancelled orders subject to stock checks. Existing confirmed states consolidate to processing, and shipped consolidates to out_for_delivery; scripts/simplify-order-statuses.js requires STATUS_BACKUP_PATH if legacy data exists. This does not modify inventory or cash records.

Administrator notification bells in the storefront navbar and dashboard show the actual pending-order count. They refresh every 30 seconds while the page is visible, on focus, and after admin order updates. Notifications open the corresponding order in admin management; counts remain until orders leave pending. Status filter buttons show counts and the order toolbar shows order and unit totals.
