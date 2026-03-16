# Project Health Check Changes

## What I checked

- Ran frontend lint with `npm.cmd run lint` inside `client`
- Ran frontend production build with `npm.cmd run build` inside `client`
- Ran a backend syntax sweep with `node --check` across all `server/**/*.js` files
- Started the backend entry once with Node to confirm it loads without immediate code crashes

## Issues found and fixed

### 1. Unused React state in Stripe integration

File:
- `client/src/Components/StripeIntegration.jsx`

Problem:
- `setSelectedSeats` was declared but never used, which failed ESLint.

Fix:
- Kept only the used state value.
- Left the old declaration in comments.

Why:
- This removes a hard lint failure without changing runtime behavior.

### 2. Redundant try/catch in current-user API helper

File:
- `client/src/api/users.js`

Problem:
- `CurrentUser` had a `try/catch` that only rethrew the same error, which triggered `no-useless-catch`.

Fix:
- Removed the redundant wrapper.
- Left the old implementation in comments.

Why:
- The behavior stays the same, but the code is cleaner and lint-safe.

### 3. Unused table render arguments in show management

File:
- `client/src/pages/Partner/ShowModal.jsx`

Problem:
- Two Ant Design table render callbacks accepted `data` but did not use it.

Fix:
- Removed the unused parameter.
- Left the old callback signatures in comments.

Why:
- This resolves lint errors without affecting UI behavior.

### 4. Stale hook dependency patterns across the frontend

Files:
- `client/src/BookShow.jsx`
- `client/src/SingleMovie.jsx`
- `client/src/pages/Admin/MovieList.jsx`
- `client/src/pages/Admin/TheatresTable.jsx`
- `client/src/pages/Forget.jsx`
- `client/src/pages/Home/index.jsx`
- `client/src/pages/Partner/ShowModal.jsx`
- `client/src/pages/Partner/TheatreList.jsx`
- `client/src/pages/User/Bookings.jsx`

Problem:
- Several `useEffect` calls referenced functions or values that were omitted from dependency arrays.
- This did not fail the build, but it created lint warnings and increased the risk of stale closures or missed refreshes.

Fix:
- Wrapped async fetch helpers in `useCallback` where needed.
- Updated `useEffect` dependencies to point at the stable callbacks or required values.
- Reworked the debounced search handler in `client/src/pages/Home/index.jsx` to use `useMemo` plus cleanup, which avoids the React Hooks warning around `debounce(...)`.
- Left the old effect/function forms in comments where the behavior was changed.

Why:
- This makes the components React-hooks-safe and removes warning noise that can hide real problems later.

### 5. Backend process exited on MongoDB startup failure

Files:
- `server/config/db.js`
- `server/server.js`

Problem:
- The server started listening, but if MongoDB connection failed later during startup, the process exited because `connectDB()` called `process.exit(1)` and the startup `Promise.all(...)` chain was not handled safely.

Fix:
- Changed `connectDB()` to return `true` or `false` instead of terminating the process.
- Replaced the startup `Promise.all(...)` with `Promise.allSettled(...)`.
- Seed admin now runs only when the DB connection is actually ready.
- Left the old code in comments.

Why:
- This keeps the API process alive for `/healthz` and `/readyz` checks during DB outages instead of crashing abruptly.

### 6. Redis readiness reported false positives

File:
- `server/config/redis.js`

Problem:
- Redis readiness used `redisClient.isOpen`, which can be true even while connection attempts are failing.
- In runtime testing, `/readyz` incorrectly reported `"redis": true` while the logs showed repeated `ECONNREFUSED` errors.

Fix:
- Switched readiness to `redisClient.isReady`.
- Left the old readiness check in comments.

Why:
- `isReady` reflects whether Redis can actually serve commands, so readiness output is now accurate.

## Verification results

- Frontend lint: passed
- Frontend production build: passed
- Backend JavaScript syntax check: passed
- Backend startup load: passed at code level
- Backend health probe: passed
- Backend readiness probe: correctly returns `503` with dependency status when services are down

## Runtime QA findings

- Docker is not installed on this machine, so local Compose-based MongoDB/Redis/RabbitMQ startup could not be used here.
- The configured MongoDB Atlas host timed out from this environment during testing.
- Redis on `127.0.0.1:6379` refused connection during testing.
- RabbitMQ on `127.0.0.1:5672` refused connection during testing.

What was verified anyway:

- The API process now remains alive during those dependency failures.
- `GET /healthz` returns `200` with `{ "ok": true }`.
- `GET /readyz` now accurately reports dependency readiness, for example:
  - `{ "ok": false, "db": false, "redis": false, "rabbitmq": false }`

## Remaining environment-dependent issues

When the backend was started locally, these services were not available:

- Redis on `127.0.0.1:6379`
- RabbitMQ on `127.0.0.1:5672`

Why this matters:
- The server code loads correctly, but Redis/RabbitMQ-backed features cannot be fully runtime-tested until those services are running.
- MongoDB-backed business routes also cannot be fully runtime-tested until the DB host is reachable from this environment.

## Non-blocking note

The frontend production build still reports a large bundle warning:

- main JS bundle is about `1.29 MB` before gzip reporting

This is not a build failure, but it is a performance optimization candidate for later code-splitting.
