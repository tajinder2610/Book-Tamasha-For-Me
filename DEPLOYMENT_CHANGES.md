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

## Recommended Render Environment Variables

- `DB_URL`
- `JWT_SECRET`
- `RESEND_API_KEY`
- `STRIPE_SECRET_KEY`
- `CLIENT_URL=https://book-tamasha-for-me.onrender.com`

