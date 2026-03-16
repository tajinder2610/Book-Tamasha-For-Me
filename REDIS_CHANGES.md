# Redis Changes

## What is Redis?

Redis is an in-memory data store. It keeps data in RAM, so reads and writes are much faster than a regular database query in most cases. Redis is commonly used for caching, OTP/session storage, rate limiting, queues, and temporary locking.

For this project, Redis is being used as a fast temporary store for password reset OTPs.
It is also being used for shared API rate limiting, temporary seat locking during bookings, and seat-map caching.

Redis runs on a central server (or cluster) that all application servers talk to.

Users never run Redis locally.

Key idea:
Both users send requests to the same backend
The backend talks to one shared Redis instance

So the seat lock lives in one place only.

Redis is not per-user memory.

It is:

Centralized shared memory

Used by all servers and all users.

Everyone reads/writes to this same RAM (Redis server RAM).

## Real Production Setup

Large systems usually run Redis like this:
           +------------------+
Users ---> | Load Balancer    |
           +------------------+
                    |
          +---------+---------+
          |                   |
   App Server 1        App Server 2
          |                   |
          +---------+---------+
                    |
              Redis Cluster
                    |
                 Database

All servers talk to the same Redis cluster.

## How does Redis prevent two users from booking the same seat?

Redis acts as a centralized in-memory lock store. When a user selects a seat, the backend performs an atomic `SET NX EX` operation. Since Redis processes commands sequentially, only one request can successfully lock the seat, preventing race conditions.

## Why This Works (Atomic Operations)?

Redis processes commands single-threadedly.

## Why should we use Redis?

Redis is useful when the data is:

- short-lived
- accessed frequently
- performance-sensitive
- shared across multiple server instances

In this codebase, OTPs are temporary values. They should expire automatically and do not need long-term storage in MongoDB. Redis is a better fit for that kind of data.

## Where Redis Memory Actually Lives?

When you start Redis, it runs as a server process on a machine.
That machine could be:
- a cloud VM
- a dedicated server
- a container (Docker/Kubernetes)
- a managed cloud service

Redis then stores all keys inside that machine's RAM.

Redis stores its data in the RAM of the machine where the Redis server process runs, acting as a centralized in-memory datastore that application servers access over the network.

## What Happens Internally?

When Redis starts as `redis-server`, the OS allocates RAM for that process.
The OS does not decide a fixed RAM amount for Redis at startup.
Instead, Redis starts with a small footprint and dynamically requests memory as it needs it, and the OS gives it memory from available RAM.

## High-Level Architecture of platforms like BookMyShow handling millions of users trying to book seats at the same time

The key challenges are:
- Massive traffic spikes
- Race conditions (two users selecting the same seat)
- Fast seat locking
- Preventing database overload

Flow:
Users
  |
CDN
  |
Load Balancer
  |
Application Servers
  |
Redis (seat locks + cache)
  |
Booking Service
  |
Database
  |
Queue for async work
  |
Workers

Each component prevents the system from collapsing under heavy traffic.

## Step 1 - Traffic Distribution
Users hit the system simultaneously. A load balancer distributes requests across many servers. This prevents a single server from crashing.

## Step 2 - Seat Availability From Cache
Seat maps are cached in Redis, not fetched from DB.

Why?
- Database queries are too slow
- Redis can handle hundreds of thousands of ops/sec

So the seat layout loads instantly.

## Step 3 - Seat Locking (Critical Step)
Seat is locked only if it is not already locked -> hold for 5 minutes

## Step 4 - Handling Huge Spikes (Queue)
Queues help absorb traffic spikes for background work, but they should not sit in front of the critical booking confirmation path.

Safer flow for this project:
Users -> App Servers -> Redis seat lock -> Payment verification -> Booking service -> Database

Queue flow for async work:
Booking confirmed -> Queue -> Email/notification/analytics workers

Example queue technologies:
- RabbitMQ for background jobs, retries, and worker queues
- Apache Kafka for large-scale event streaming across multiple services

Why this matters:
- Critical operations like payment verification and final booking creation should write to the database immediately.
- Asynchronous tasks like email, SMS, analytics, audit logs, and downstream notifications are good candidates for a queue.
- Redis reduces database pressure by handling seat locks and cached reads before the final booking write.

## Step 5 - Payment Stage
After seat locking:
Seat locked -> Payment -> Booking confirmed

If payment succeeds: insert booking in database, delete Redis lock, seat becomes permanently booked
If payment fails: Redis TTL expires, seat becomes available again

## Step 6 - Preventing Database Overload
Database writes are minimized. Only confirmed bookings reach DB.

## How does Redis help in optimisation?

Redis helps optimisation in these ways:

- Faster access: OTP lookup from memory is very fast.
- Automatic expiry: Redis can delete OTPs after a fixed time using TTL, so manual cleanup logic is reduced.
- Less database load: MongoDB no longer needs to store and update OTP values for every forgot-password request.
- Better scalability: if the app runs on multiple server instances, Redis can act as a shared temporary store instead of relying on per-process memory.
- Safer concurrent booking flow: temporary seat locks reduce the chance of two users trying to reserve the same seats at the same time.
- Faster seat-map reads: the booking page can serve show seat data from Redis instead of hitting MongoDB on every request.

## What changes were made and why?

### 1. Added Redis configuration

File: `server/config/redis.js`

What changed:

- Added a Redis client using the `redis` package.
- Added a `connectRedis()` function to initialize the connection.

Why:

- To centralize Redis setup in one place and reuse the client across controllers.

### 2. Updated server bootstrap

File: `server/server.js`

What changed:

- The server now initializes Redis along with MongoDB on startup.
- The old Mongo-only startup code was kept in comments.

Why:

- Redis should be available before OTP-related routes use it.

### 3. Moved OTP storage from MongoDB to Redis

File: `server/controller/user.js`

What changed:

- In `forgetPassword`, OTP is now saved in Redis with a 10-minute expiry.
- In `resetPassword`, OTP is now read from Redis and deleted after a successful reset.
- If Redis is unavailable, the code falls back to the older MongoDB-based OTP flow so password reset still works.
- The old MongoDB OTP code was kept in comments.

Why:

- OTPs are temporary and expire quickly, which is exactly what Redis handles well.
- This reduces unnecessary writes to the `users` collection.
- The fallback avoids breaking authentication flows if Redis is not running yet.

### 4. Moved rate limiting state to Redis

File: `server/server.js`

What changed:

- Added `rate-limit-redis`.
- Added a Redis-backed rate limit store.
- Kept the old in-memory limiter logic in comments.
- Added a fallback to the memory limiter if Redis is not ready.

Why:

- The old limiter stored request counts in a single Node.js process memory.
- Redis makes rate limits consistent across multiple server instances and survives process-level scaling better.

### 5. Added Redis seat locks for bookings

File: `server/controller/booking.js`

What changed:

- Added Redis lock keys for seats in the format `seatlock:<showId>:<seatNumber>`.
- Added seat lock acquisition before Stripe checkout session creation.
- Added lock validation during payment confirmation.
- Added lock release after booking creation or on Stripe session creation failure.
- Kept the old non-Redis flow in comments at the changed sections.

Why:

- Without temporary locks, two users can begin checkout for the same seats at nearly the same time.
- MongoDB still remains the final source of truth for booked seats, but Redis now protects the short window between seat selection and booking confirmation.

### 6. Added seat-map caching in Redis

Files: `server/controller/show.js`, `server/controller/booking.js`

What changed:

- `showById` now checks Redis first for cached seat-map data before querying MongoDB.
- Seat-map cache entries use keys in the format `seatmap:show:<showId>`.
- On a cache miss, the show is fetched from MongoDB and cached in Redis for a short TTL.
- After a booking updates `bookedSeats`, the seat-map cache is invalidated so the next read gets fresh data.
- Show update and delete operations also invalidate the related seat-map cache.

Why:

- The booking screen reads show details and booked seats frequently.
- Serving that from Redis reduces repeated MongoDB reads and improves response time.
- Cache invalidation after booking/show changes keeps the cached seat map consistent.

## Dependency added

File: `server/package.json`

What changed:

- Added the `redis` package.
- Added the `rate-limit-redis` package.

Why:

- They are required to connect the backend to Redis and store API rate-limit counters in Redis.

## Notes

- Redis server must be running locally or `REDIS_URL` must point to a valid Redis instance.
- Default fallback URL in the code is `redis://127.0.0.1:6379`.
- Existing `otp` and `otpExpiry` fields in the user schema were left untouched to avoid an unnecessary schema change during this integration.
- If Redis is down, OTP storage automatically falls back to MongoDB.
- If Redis is down, API rate limiting falls back to the previous in-memory limiter.
- Seat locks are temporary and currently expire after 5 minutes.
- Seat-map cache entries currently expire after 60 seconds and are also invalidated on show/booking changes.

## Local machine fix that was applied

What happened:

- The backend was logging `Redis error: connect ECONNREFUSED 127.0.0.1:6379`

Root cause:

- Redis was not installed or running on this machine, while `server/.env` pointed to `redis://127.0.0.1:6379`

What was done:

- Installed Redis locally on Windows
- Verified the Redis Windows service is running
- Verified `redis-cli ping` returns `PONG`
- Restarted the backend after Redis was available

Additional code fix:

File: `server/config/redis.js`

What changed:

- Redis readiness now uses `redisClient.isReady` instead of `redisClient.isOpen`

Why:

- `isOpen` can be true even while Redis is not actually usable yet
- `isReady` correctly reflects whether commands can be served

Verified result:

- The backend readiness endpoint now reports Redis correctly
- Final readiness state after the fix:

`{"ok":true,"db":true,"redis":true,"rabbitmq":true}`
