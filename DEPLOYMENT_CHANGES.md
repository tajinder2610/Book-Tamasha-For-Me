# Deployment Changes and Why

This file now serves as the consolidated deployment reference for the project. It includes the backend deployment fixes, the Redis integration changes that affect runtime behavior, and the optional Docker/Kubernetes files that can be used for containerized deployment.

## 1. Backend deployment fixes

### 1.1 Fixed middleware order for CORS

- Change: Moved CORS setup near the top, before route handlers.
- Why: CORS headers must be added before route responses are sent, otherwise browser requests may fail even if routes are correct.

### 1.2 Removed hardcoded production origin from code

- Change: Replaced hardcoded CORS origin with `process.env.CLIENT_URL || "http://localhost:5173"`.
- Why: Keeps local and production environments configurable without changing source code each deployment.

### 1.3 Fixed route ordering for SPA serving

- Change: Removed early 404 handler placement and moved not-found handling to the end.
- Why: A 404 handler before static or catch-all routes blocks frontend assets and React routing in production.

### 1.4 Added frontend build path compatibility

- Change: Added support for both:
  - `client/dist` (Vite build output)
  - `client/build` (Create React App build output)
- Why: Prevents deployment breakage if frontend tooling or output directory differs.

### 1.5 Protected API behavior in SPA catch-all

- Change: In `app.get("*")`, requests starting with `/api` now return 404 instead of serving `index.html`.
- Why: Prevents invalid API paths from returning frontend HTML, which makes debugging and API behavior clearer.

### 1.6 Render-compatible port handling

- Change: Replaced fixed `8082` with `process.env.PORT || 8082`.
- Why: Render injects the listening port through `PORT`; hardcoding a port can prevent app startup.

### 1.7 Cleaned deployment-breaking syntax issue

- Change: Removed stray markdown or code-fence artifacts from `server.js`.
- Why: Those artifacts caused `SyntaxError: Unexpected end of input` during startup.

### 1.8 Added missing `cors` dependency

- Change: Added `"cors": "^2.8.5"` to `server/package.json`.
- Why: Render startup failed with `Error: Cannot find module 'cors'` because `server.js` imports `cors` but it was not declared as a dependency.

### 1.9 Fixed Render UI mismatch vs local (`localhost:5173`)

- Issue: UI looked different on `https://book-tamasha-for-me.onrender.com/` compared to local, even with the same frontend code.
- Root cause: Production requests pass through `server/server.js` where Helmet CSP was too strict. It blocked resources required by Ant Design and Stripe, while local Vite dev behavior did not expose the same restriction.
- Change:
  - Updated CORS methods to include `PATCH` and `OPTIONS`.
  - Updated CSP:
    - `scriptSrc` now allows `https://js.stripe.com`
    - `styleSrc` now allows `'unsafe-inline'` for Ant Design runtime styles
    - `connectSrc` now allows `https://api.stripe.com` and `https://checkout.stripe.com`
- Why: Aligns production security headers with actual frontend runtime dependencies so Render UI and local UI render consistently.

### 1.10 Fixed movie poster URLs not loading on Render

- Issue: Poster links added in admin and partner flows rendered locally but not on `https://book-tamasha-for-me.onrender.com/`.
- Root cause: Helmet CSP in `server/server.js` allowed `imgSrc` only from `'self'` and `data:`, so external poster URLs were blocked in production.
- Change: Updated `imgSrc` to allow remote images:
  - `imgSrc: ["'self'", "data:", "https:", "http:", "blob:"]`
- Why: Lets externally hosted poster URLs render in production.
- Note: If a poster URL itself is `http://` and the app is loaded over `https://`, browsers may still block it as mixed content. Prefer `https://` poster URLs.

### 1.11 Added Home button visibility on theatre and seat selection pages

- Change: Updated `client/src/Components/ProtectedRoute.jsx` to show the `Home` shortcut for user routes whenever the current path is not `/`.
- Why: Improves navigation flow by keeping a direct path back to Home while users are selecting theatres and seats.
- Affected routes:
  - `/movie/:id`
  - `/book-show/:id`

## 2. Redis changes affecting deployment

Redis is now part of the deployment story because the backend depends on it for temporary OTP storage, shared API rate limiting, and seat locking during checkout.

### 2.1 Added Redis configuration

- File: `server/config/redis.js`
- Change:
  - Added a Redis client using the `redis` package.
  - Added `connectRedis()` to initialize the connection.
  - Added `isRedisReady()` to expose connection state.
- Why: Centralizes Redis setup and lets the rest of the backend reuse one shared client.

### 2.2 Updated server bootstrap

- File: `server/server.js`
- Change: The server now initializes Redis along with MongoDB on startup.
- Why: Redis-backed OTPs, rate limiting, and seat locks should be available before those request flows are used.

### 2.3 Moved OTP storage from MongoDB to Redis

- File: `server/controller/user.js`
- Change:
  - In `forgetPassword`, OTP is stored in Redis with a 10-minute expiry.
  - In `resetPassword`, OTP is read from Redis and removed after successful use.
  - If Redis is unavailable, the code falls back to the older MongoDB-based OTP flow.
- Why:
  - OTPs are short-lived and fit Redis well.
  - This reduces unnecessary writes to the `users` collection.
  - The fallback avoids breaking password reset if Redis is temporarily down.

### 2.4 Moved rate limiting state to Redis

- File: `server/server.js`
- Change:
  - Added `rate-limit-redis`.
  - Added a Redis-backed rate limit store.
  - Added fallback to the memory limiter if Redis is not ready.
- Why:
  - The old limiter stored request counts in a single Node.js process.
  - Redis makes rate limits consistent across multiple backend instances.

### 2.5 Added Redis seat locks for bookings

- File: `server/controller/booking.js`
- Change:
  - Added Redis lock keys in the format `seatlock:<showId>:<seatNumber>`.
  - Added lock acquisition before Stripe checkout session creation.
  - Added lock validation during payment confirmation.
  - Added lock release after booking creation or on Stripe session creation failure.
- Why:
  - Prevents two users from starting checkout for the same seats at the same time.
  - MongoDB remains the final source of truth, while Redis protects the short booking race window.

### 2.6 Added Redis-related dependencies

- File: `server/package.json`
- Change:
  - Added `redis`
  - Added `rate-limit-redis`
- Why: These packages are required for Redis connectivity and Redis-backed rate limiting.

### 2.7 Redis deployment notes

- `REDIS_URL` should point to a valid Redis instance.
- Local default fallback is `redis://127.0.0.1:6379`.
- If Redis is down:
  - OTP storage falls back to MongoDB.
  - API rate limiting falls back to in-memory storage.
- Seat locks are temporary and currently expire after 5 minutes.

## 3. Docker changes affecting deployment

These Docker files are optional deployment artifacts. They do not change the current local/runtime configuration unless you explicitly use them.

### 3.1 Added Docker ignore rules

- File: `.dockerignore`
- Change: Added ignore rules for `node_modules`, `.git`, `.env`, build artifacts, and logs.
- Why:
  - Keeps Docker build context smaller.
  - Avoids copying unnecessary or sensitive files into the image.

### 3.2 Added production Docker image

- File: `Dockerfile`
- Change:
  - Added a multi-stage Docker build.
  - Built the React frontend in one stage.
  - Installed backend dependencies in another stage.
  - Created a final runtime image that serves the backend and built frontend together.
- Why:
  - Produces a single production-ready container image.
  - Keeps the final image smaller than a single-stage build.
  - Matches the current server behavior where Express serves the built frontend.

### 3.3 Added local multi-service container setup

- File: `docker-compose.yml`
- Change:
  - Added an app service.
  - Added a MongoDB service.
  - Added a Redis service.
  - Added a RabbitMQ service.
  - Connected them using service names and environment variables.
- Why:
  - Runs the full project stack locally with one command if containerized setup is needed.
  - Reduces manual setup for backend dependencies.

## 4. Kubernetes changes affecting deployment

These Kubernetes manifests are optional deployment artifacts. They do not affect the current application unless you deploy them to a cluster.

### 4.1 Added Kubernetes namespace

- File: `k8s/namespace.yaml`
- Change: Added a dedicated namespace named `bookmyshow`.
- Why: Keeps application resources grouped and isolated in the cluster.

### 4.2 Added Kubernetes app configuration

- Files:
  - `k8s/app-configmap.yaml`
  - `k8s/app-secret.example.yaml`
- Change:
  - Added a ConfigMap for non-sensitive environment variables.
  - Added a Secret template for sensitive values like DB URL and API keys.
- Why: Configuration should not be hardcoded inside deployment manifests.

### 4.3 Added Redis deployment and service for Kubernetes

- Files:
  - `k8s/redis-deployment.yaml`
  - `k8s/redis-service.yaml`
- Change:
  - Added a Redis Deployment.
  - Added a Redis Service so the app can connect using the hostname `redis`.
- Why:
  - The backend already uses Redis for OTPs, rate limiting, and seat locks.
  - All backend replicas need a shared, discoverable Redis service.

### 4.4 Added RabbitMQ deployment and service guidance for Kubernetes

- Files:
  - `k8s/app-configmap.yaml`
  - `k8s/app-deployment.yaml`
- Change:
  - Added `RABBITMQ_URL` to app configuration.
  - Left room for adding a dedicated RabbitMQ deployment if cluster queue hosting is needed.
- Why:
  - The backend and worker both rely on RabbitMQ for async booking email jobs.

### 4.5 Added app deployment and service for Kubernetes

- Files:
  - `k8s/app-deployment.yaml`
  - `k8s/app-service.yaml`
- Change:
  - Added an app Deployment with 2 replicas.
  - Added readiness and liveness probes.
  - Added a Service to expose the app.
- Why:
  - Multiple replicas improve availability.
  - Health probes let Kubernetes restart unhealthy pods.
  - The Service provides stable network access to the backend.

## 5. Health endpoints for deployment

### 5.1 Added health endpoints to the backend

- File: `server/server.js`
- Change:
  - Added `/healthz`
  - Added `/readyz`
- Why: Health endpoints are useful for deployment platforms and uptime monitoring, including Docker/Kubernetes-based setups.

## 6. Recommended deployment environment variables

- `DB_URL`
- `JWT_SECRET`
- `RESEND_API_KEY`
- `STRIPE_SECRET_KEY`
- `CLIENT_URL=https://book-tamasha-for-me.onrender.com`
- `REDIS_URL`
- `RABBITMQ_URL`

## 7. Overall deployment impact

- Render deployment is now aligned with frontend runtime needs, correct CORS behavior, and proper SPA serving.
- Redis is now a runtime dependency for OTP handling, distributed rate limiting, and temporary seat locking.
- RabbitMQ is now a runtime dependency for async ticket email jobs.
- Docker/Kubernetes files are available again as optional deployment artifacts, but they do not affect the current non-containerized setup unless you use them.
- Health endpoints make the backend easier to monitor on deployment platforms.
- Secrets should not remain in committed `.env` files in any deployed environment.
