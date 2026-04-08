# RabbitMQ Changes

## Why is RabbitMQ used in this project?

RabbitMQ is used to move non-critical background work out of the main booking request flow.

Background Jobs (Async Processing)
RabbitMQ is very commonly used here.
🔹 Typical Use Cases
Sending emails (welcome emails, OTPs)
Image/video processing
Generating reports (PDFs, analytics)
Data syncing between services
Order processing in e-commerce
🔹 How It Works
Your app receives a request (e.g., user signs up)
Instead of doing heavy work immediately, it:
Sends a message to RabbitMQ (queue)
A worker service consumes the message
Worker processes the job in the background
🔹 Why Use RabbitMQ Here?
Non-blocking (faster API responses)
Retry mechanisms (if job fails)
Load balancing across workers
Handles spikes smoothly

✔ Use RabbitMQ for Background Jobs when:
Task is time-consuming
Doesn’t need immediate response
Can be retried

🚫 When NOT Ideal
Real-time low-latency APIs → better use HTTP/gRPC
Streaming large-scale events → consider Apache Kafka
🧠 Quick Summary
Background jobs → primary use case ✅
Request-response (RPC) → possible but secondary ⚠️
Great for decoupling, reliability, and async workflows

👉 Example:
A web app queues “send email” → worker sends it later.

In this project, the first RabbitMQ use case is ticket email delivery after a booking is confirmed.

Without a queue, the API had to:
- confirm the booking
- update the database
- invalidate the Redis seat-map cache
- send the ticket email in the same request path

That creates unnecessary latency and makes the booking API depend directly on the email provider.

With RabbitMQ, the flow is:

User -> API -> Redis seat lock -> payment confirmation -> MongoDB booking write -> RabbitMQ job -> worker sends ticket email

This keeps the critical booking path synchronous and reliable, while background work is handled separately.

## Why RabbitMQ was chosen instead of Apache Kafka?

RabbitMQ was chosen because this project currently needs a job queue, not an event-streaming platform.

RabbitMQ is a better fit here because:
- the current backend is a single application, not a large event-driven microservice system
- the main async need is background job processing such as ticket emails and notifications
- RabbitMQ is simpler to introduce for worker queues, acknowledgements, and durable messages
- it matches the "do work later in a worker" pattern more directly

Apache Kafka was not chosen because:
- Kafka is stronger for large-scale event streaming and replayable logs
- this project does not yet need multiple services consuming the same booking stream
- this project does not currently need retained event history and replay
- Kafka would add more infrastructure and operational complexity than needed for the current scope

## What RabbitMQ is used for right now?

Current use:
- ticket email jobs after successful booking
- failed ticket email jobs first move through delayed retry queues and finally to a dead-letter queue (`ticket_email_v2_dlq` by default)

Good future candidates:
- SMS/notification jobs
- booking audit logs
- analytics fan-out
- retryable background tasks

## What RabbitMQ is not used for?

RabbitMQ is not used for the core booking write itself.

This project still keeps the critical path synchronous:
- Redis handles temporary seat locks
- payment is confirmed synchronously
- MongoDB stores the final booking synchronously
- RabbitMQ is used only after booking success for async side work

That avoids eventual-consistency problems in seat allocation and booking confirmation.

## Differences between RabbitMQ and Apache Kafka

### 1. Primary purpose

RabbitMQ:
- Message broker for task queues and routed background jobs

Kafka:
- Event-streaming platform for durable, replayable event logs

### 2. Typical use pattern

RabbitMQ:
- Producer sends a job to a queue
- Worker consumes the job and acknowledges it

Kafka:
- Producer writes events to a topic
- Consumers read from partitions and track offsets

### 3. Retention model

RabbitMQ:
- Messages are usually processed and removed after acknowledgement

Kafka:
- Messages remain for a configured retention period and can be replayed

### 4. Best fit for this codebase today

RabbitMQ:
- Better for ticket emails, notifications, retries, and worker-based async processing

Kafka:
- Better if the system later becomes a multi-service event-driven platform with replay and multiple independent consumers

### 5. Complexity

RabbitMQ:
- Easier to adopt for straightforward queue-based background jobs

Kafka:
- More operationally complex and more useful when streaming requirements are already clear

## Summary

RabbitMQ was added to this project to queue ticket email jobs after booking confirmation.

It was chosen over Apache Kafka because the current need is asynchronous background job processing, not high-throughput event streaming.

The booking flow remains synchronous where correctness matters, and RabbitMQ handles only the side work that can safely happen after the booking has been confirmed.

## What changes were made and why?

### 1. Added RabbitMQ dependency

File: `server/package.json`

What changed:

- Added `amqplib`
- Added `worker:bookings` script

Why:

- `amqplib` is required to connect the Node.js backend to RabbitMQ.
- The worker script starts a dedicated consumer process for booking-related jobs.

### 2. Added RabbitMQ configuration

File: `server/config/rabbitmq.js`

What changed:

- Added shared RabbitMQ connection logic
- Added queue declaration for `ticket_email_v2`
- Added queue declaration for `ticket_email_v2_dlq`
- Added helper functions to publish and consume queue messages
- Added readiness helper `isRabbitReady()`

Why:

- RabbitMQ connection handling should be centralized, similar to Redis configuration.
- Publishing and consuming should use one shared setup instead of duplicating connection code.
- A dead-letter queue preserves failed email jobs for inspection and retry instead of silently dropping them.

### 3. Connected RabbitMQ during server startup

File: `server/server.js`

What changed:

- The server now initializes RabbitMQ along with MongoDB and Redis
- `/readyz` now includes RabbitMQ readiness state

Why:

- The queue connection should be established when the backend starts.
- Readiness output should reflect whether RabbitMQ is available.

### 4. Added a booking queue publisher

File: `server/queues/bookingQueue.js`

What changed:

- Added `enqueueTicketEmail()` to publish ticket email jobs to RabbitMQ
- Added direct email fallback if RabbitMQ is unavailable

Why:

- The booking controller should not need to know queue internals.
- The fallback keeps the current booking flow usable even if RabbitMQ is down or not started yet.

### 5. Extracted ticket email payload creation

File: `server/utils/ticketEmail.js`

What changed:

- Added a helper to build the ticket email payload from booking data
- Added a shared sender function used by the worker and fallback path

Why:

- Email data preparation should be reusable.
- Both the queue worker and the fallback path should use the same email-building logic.

### 6. Updated booking flow to queue email jobs

File: `server/controller/booking.js`

What changed:

- Removed direct ticket email sending from the booking request flow
- After successful booking creation, the backend now publishes a `ticket_email` job
- If RabbitMQ is unavailable, the code falls back to direct email sending

Why:

- Booking confirmation and seat updates are critical and should finish first.
- Ticket email sending is asynchronous work and should be offloaded to RabbitMQ when possible.
- Fallback behavior prevents the feature from becoming fully dependent on the queue.

### 7. Added a RabbitMQ worker

File: `server/workers/bookingWorker.js`

What changed:

- Added a worker process that consumes the `ticket_email` queue
- Added delayed retry queues for ticket email jobs
- The worker sends ticket emails using the existing email helper flow
- Failed worker jobs are republished to retry queues with TTL delays and return to the main queue
- After the final retry, failed jobs are moved to `ticket_email_v2_dlq`

Why:

- Background jobs should be processed outside the API process.
- A worker can be scaled separately if email load grows.
- Delayed retries handle transient email/provider failures without blocking bookings.
- DLQ routing still prevents permanently failed jobs from being lost.

### 8. Added environment configuration

File: `server/.env`

What changed:

- Added `RABBITMQ_URL`

Why:

- RabbitMQ connection details should remain configurable by environment.

### 9. Added environment and optional container support for RabbitMQ

Files:
- `server/.env`
- `docker-compose.yml`

What changed:

- Added `RABBITMQ_URL`
- Restored optional `docker-compose.yml` support for running RabbitMQ in containers

Why:

- The backend and worker both need a configurable RabbitMQ connection string.
- Container support is available if needed, but it is optional and does not change the current runtime setup by itself.

## Local machine fix that was applied

What happened:

- The backend was logging `RabbitMQ connection failed: connect ECONNREFUSED 127.0.0.1:5672`

Root cause:

- RabbitMQ was not installed or running locally, while `server/.env` pointed to `amqp://127.0.0.1:5672`

What was done:

- Installed Erlang locally on Windows
- Installed RabbitMQ locally on Windows
- Verified the RabbitMQ Windows service is running
- Verified port `5672` is listening
- Restarted the backend after RabbitMQ became available

Important Windows note:

- RabbitMQ service works correctly after installation on this machine
- RabbitMQ CLI tools may still require `ERLANG_HOME` to be set at machine level if you want to use `rabbitmqctl.bat` manually from a fresh shell

Verified result:

- The backend now connects to RabbitMQ successfully
- Final readiness state after the fix:

`{"ok":true,"db":true,"redis":true,"rabbitmq":true}`

## Retry and DLQ behavior

RabbitMQ now uses delayed retry queues before sending failed ticket email jobs to the dead-letter queue.

Flow:

1. Booking API publishes a message to `ticket_email_v2`
2. Worker consumes the message
3. If email sending succeeds, the worker sends `ack`
4. If email sending fails the first time, the worker moves the message to `ticket_email_v2_retry_1`
5. `ticket_email_v2_retry_1` waits for its TTL (`5000ms` by default) and dead-letters the message back to `ticket_email_v2`
6. If email sending fails again, the worker moves the message to `ticket_email_v2_retry_2`
7. `ticket_email_v2_retry_2` waits for its TTL (`30000ms` by default) and dead-letters the message back to `ticket_email_v2`
8. If email sending still fails after the final retry, the worker moves the message to `ticket_email_v2_dlq`

Default retry chain:

- `ticket_email_v2 -> ticket_email_v2_retry_1 (5s) -> ticket_email_v2`
- `ticket_email_v2 -> ticket_email_v2_retry_2 (30s) -> ticket_email_v2`
- final failure -> `ticket_email_v2_dlq`

Why this is better than dropping failed jobs or immediately dead-lettering them:

- transient failures get another chance automatically
- retries happen with a delay instead of hammering the email provider immediately
- failed email jobs are preserved
- you can inspect the payload later
- you can retry them manually or with a future retry worker
- booking confirmation still stays independent from email provider slowness

Optional environment variables:

- `RABBITMQ_TICKET_EMAIL_RETRY_1_QUEUE`
- `RABBITMQ_TICKET_EMAIL_RETRY_2_QUEUE`
- `RABBITMQ_TICKET_EMAIL_RETRY_1_TTL_MS`
- `RABBITMQ_TICKET_EMAIL_RETRY_2_TTL_MS`

## How to access RabbitMQ Management UI and DLQ

If the RabbitMQ management plugin is enabled, open:

- `http://localhost:15672`

Typical local default login:

- username: `guest`
- password: `guest`

How to reach the DLQ in the UI:

1. Open `http://localhost:15672`
2. Sign in
3. Go to the `Queues` tab
4. Open `ticket_email_v2_dlq`
5. Use `Get messages` to inspect queued DLQ messages

If the page does not open:

- verify the RabbitMQ service is running
- verify the management plugin is enabled
- restart RabbitMQ after enabling the plugin
- check that port `15672` is listening

What you can inspect in the DLQ view:

- message payload/body
- `x-retry-count` header
- delivery headers and properties
- ready message count
- whether the same job is repeatedly failing

## How to investigate and resolve messages in the DLQ

When a message reaches `ticket_email_v2_dlq`, it means:

- the worker already tried the main queue attempt
- the worker already tried the delayed retry chain
- the job is now considered a permanent failure until someone investigates it

Typical reasons:

- email provider API outage or timeout
- invalid recipient email
- malformed payload
- template/rendering failure
- missing environment variables or credentials

Recommended investigation flow:

1. Check worker logs first

- Look for logs like:
- `RabbitMQ consumer failed for ticket_email_v2: ...`
- `RabbitMQ message moved to retry queue ...`
- `RabbitMQ message moved to DLQ ticket_email_v2_dlq after 2 retries`

2. Inspect the DLQ message payload and headers

- Use the RabbitMQ Management UI if enabled
- Open queue: `ticket_email_v2_dlq`
- Review:
- payload body
- `x-retry-count` header
- timestamp if available
- any other custom headers

3. Identify and fix the root cause

- provider issue: wait for recovery or fix credentials
- bad payload: fix the producer or data mapping
- template issue: fix template/rendering bug
- invalid email: correct data or decide to drop that message

4. Decide whether the message is safe to retry

- retry if the failure was transient or has been fixed
- do not blindly retry malformed or permanently invalid messages

## How to retry a DLQ message today

Current project behavior:

- retry from the main worker is automatic only for the configured retry queues
- retry from the DLQ is still manual

Manual retry options today:

- RabbitMQ UI:
- get the message from `ticket_email_v2_dlq`
- republish the same payload to `ticket_email_v2`
- reset or remove the `x-retry-count` header before republishing if you want it to go through the retry chain again

- RabbitMQ CLI or admin script:
- read the DLQ message
- fix payload/headers if needed
- publish it back to `ticket_email_v2`

Important safety note:

- if you requeue a DLQ message with `x-retry-count` still set to the max retry count, this code will send it back to the DLQ again on the next failure
- if you want a fresh retry cycle, republish with `x-retry-count: 0` or remove that header

## What was added now in code comments

The code comments now explicitly mention:

- the retry-queue-with-TTL flow for ticket email jobs
- that retry queues act as delay buckets
- that `x-retry-count` is used to track attempts
- that DLQ handling is currently for manual operator investigation and replay

Files updated for these comments:

- `server/config/rabbitmq.js`
- `server/workers/bookingWorker.js`

## What will be added in the future for retry from DLQ

Planned future improvement:

- add a dedicated DLQ replay/admin flow instead of relying on manual requeue

Likely future behavior:

- inspect DLQ messages from an admin tool or script
- optionally edit/validate the payload before replay
- reset retry metadata safely
- republish to `ticket_email_v2`
- record audit logs for who replayed the message and when
- cap replay attempts to avoid infinite poison-message loops

Possible implementation options later:

- admin API endpoint for DLQ replay
- separate worker/script for replaying selected DLQ messages
- dashboard action from RabbitMQ management workflow
- quarantine path for messages that should not be retried

## Estimated performance improvement after RabbitMQ

These numbers are estimated from the request path and external I/O involved in this project.
They are not from a formal load test, so they should be presented as modeled estimates, not exact benchmark results.

### What changed in the request path

Before RabbitMQ:
- booking confirmed
- MongoDB updated
- Redis seat-map cache invalidated
- ticket email sent inside the same API request

After RabbitMQ:
- booking confirmed
- MongoDB updated
- Redis seat-map cache invalidated
- small queue message published
- API responds immediately
- worker sends ticket email separately

### Assumed timing breakdown

Modeled booking confirmation timings:

- MongoDB booking write + show update + cache invalidation: `150ms to 300ms`
- Direct email provider call: `500ms to 1200ms`
- RabbitMQ publish: `5ms to 30ms`

Midpoint values used for calculation:

- Core booking work: `250ms`
- Direct email call: `800ms`
- RabbitMQ publish: `20ms`

### Before vs after table

| Scenario | Core booking work | Email / Queue work | Total user-facing response |
| --- | --- | --- | --- |
| Before RabbitMQ | 250ms | 800ms email API call | 1050ms |
| After RabbitMQ | 250ms | 20ms queue publish | 270ms |

### Normal traffic improvement

Formula:

`((before - after) / before) * 100`

Calculation:

`((1050 - 270) / 1050) * 100 = 74.3%`

Estimated result:

- Normal traffic booking confirmation latency improvement: `about 70% to 75% faster`

### High traffic improvement

For high traffic, the main benefit is higher request throughput because API workers are no longer blocked on the email provider call.

Formula:

`before response time / after response time`

Calculation:

`1050 / 270 = 3.88x`

Estimated result:

- High traffic throughput improvement on booking confirmation path: `about 2x to 4x`
- Midpoint estimate: `about 3.9x`
- Percentage throughput improvement: `(3.88 - 1) * 100 = 288%`

### Final summary for reporting

Reasonable reportable numbers for this project:

- Normal traffic: `~74% faster booking confirmation response time`
- High traffic: `~288% higher booking endpoint throughput`

### Important caveat

RabbitMQ improves the asynchronous part of the booking workflow.
It does not make MongoDB or Stripe intrinsically faster.

So these gains apply mainly to:
- booking confirmation latency
- API throughput under booking load
- resilience when the email provider is slow
