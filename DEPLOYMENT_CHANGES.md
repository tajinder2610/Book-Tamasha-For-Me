# Deployment Changes and Why

This file documents the Render deployment fixes applied to `server/server.js`.

## 1) Fixed middleware order for CORS

- Change: Moved CORS setup near the top, before route handlers.
- Why: CORS headers must be added before route responses are sent, otherwise browser requests may fail even if routes are correct.

## 2) Removed hardcoded production origin from code

- Change: Replaced hardcoded CORS origin with `process.env.CLIENT_URL || "http://localhost:5173"`.
- Why: Keeps local and production environments configurable without changing source code each deployment.

## 3) Fixed route ordering for SPA serving

- Change: Removed early 404 handler placement and moved not-found handling to the end.
- Why: A 404 handler before static/catch-all routes blocks frontend assets and React routing in production.

## 4) Added frontend build path compatibility

- Change: Added support for both:
  - `client/dist` (Vite build output)
  - `client/build` (Create React App build output)
- Why: Prevents deployment breakage if frontend tooling/output directory differs.

## 5) Protected API behavior in SPA catch-all

- Change: In `app.get("*")`, requests starting with `/api` now return 404 instead of serving `index.html`.
- Why: Prevents invalid API paths from returning frontend HTML, which makes debugging and API behavior clearer.

## 6) Render-compatible port handling

- Change: Replaced fixed `8082` with `process.env.PORT || 8082`.
- Why: Render injects the listening port through `PORT`; hardcoding a port can prevent app startup.

## 7) Cleaned deployment-breaking syntax issue

- Change: Removed stray markdown/code-fence artifacts from `server.js`.
- Why: Those artifacts caused `SyntaxError: Unexpected end of input` during startup.

## 8) Added missing `cors` dependency

- Change: Added `"cors": "^2.8.5"` to `server/package.json`.
- Why: Render startup failed with `Error: Cannot find module 'cors'` because `server.js` imports `cors` but it was not declared as a dependency.

## 9) Fixed Render UI mismatch vs local (`localhost:5173`)

- Issue: UI looked different on `https://book-tamasha-for-me.onrender.com/` compared to local, even with the same frontend code.
- Root Cause: Production requests pass through `server/server.js` where Helmet CSP was too strict. It blocked resources required by Ant Design and Stripe, while local Vite dev behavior did not expose the same restriction.
- Change:
  - Updated CORS methods to include `PATCH` and `OPTIONS`.
  - Updated CSP:
    - `scriptSrc` now allows `https://js.stripe.com`
    - `styleSrc` now allows `'unsafe-inline'` (needed for Ant Design runtime styles)
    - `connectSrc` now allows `https://api.stripe.com` and `https://checkout.stripe.com`
- Why: Aligns production security headers with actual frontend runtime dependencies so Render UI and local UI render consistently.

## 10) Fixed movie poster URLs not loading on Render

- Issue: Poster links added in admin/partner flows rendered on local but not on `https://book-tamasha-for-me.onrender.com/`.
- Root Cause: Helmet CSP in `server/server.js` allowed `imgSrc` only from `'self'` and `data:`, so external poster URLs were blocked in production.
- Change: Updated `imgSrc` to allow remote images:
  - `imgSrc: ["'self'", "data:", "https:", "http:", "blob:"]`
- Why: Lets externally hosted poster URLs render in production.
- Note: If a poster URL itself is `http://` and the app is loaded over `https://`, browsers may still block it as mixed content. Prefer `https://` poster URLs.

## Recommended Render Environment Variables

- `DB_URL`
- `JWT_SECRET`
- `RESEND_API_KEY`
- `STRIPE_SECRET_KEY`
- `CLIENT_URL=https://book-tamasha-for-me.onrender.com`
