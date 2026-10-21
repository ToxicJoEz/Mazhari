# Mazhari

React/Vite storefront and Express/MongoDB backend, deployed together on Vercel.

## Local development

1. Run npm ci.
2. Copy .env.example to .env and supply MONGODB_URI and a unique JWT_SECRET of at least 32 characters. Never commit credentials.
3. Run npm run server and npm run dev in separate terminals, or use start_all.bat. Vite proxies /api to localhost:5000.

## Vercel

The project deploys main from ToxicJoEz/Mazhari. Configure MONGODB_URI and JWT_SECRET in each deployed environment. Environment changes require a new deployment.

api/index.js is the single Vercel Function entry; server/ contains the modular backend. vercel.json routes /api/* to that entry and browser routes to index.html. Do not put backend helper modules under api/, where Vercel can discover them as separate functions.

GET /api/health waits for MongoDB and performs a database ping. It returns 200 and database: connected only when configuration and the connection are available. Configuration/connection failures return 503; production never acknowledges scaffold writes.

## Accounts

- /register creates a customer using POST /api/auth/register.
- /login signs in using POST /api/auth/login.
- /profile reads the current user's details from GET /api/users/profile with a Bearer token.
- Sign out removes the session. Tokens are kept in sessionStorage (per browser tab), survive reloads, and expire after seven days by default. Closing the tab ends the saved browser session. Passwords are never stored in browser storage.
- Registration requires name, email, mobile, and a password of at least 8 characters, no more than 72 UTF-8 bytes. Passwords are bcrypt hashes in MongoDB. Client-provided roles are ignored.

## Checks

npm test exercises password hashing, JWT configuration/signatures, registration input validation, and rejection of disconnected mock logins.
npm run lint
npm run build

## Remaining work

The catalog, cart, checkout, and admin dashboard still have demo frontend behavior and need separate integration and order/inventory hardening before accepting real orders. Cloudinary uploads are deferred; existing local images remain in place. Do not treat the current checkout success screen as a saved order.
