# RabbitMQ Changes

## Why is RabbitMQ used in this project?

RabbitMQ is used to move non-critical background work out of the main booking request flow.

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
- Added queue declaration for `ticket_email`
- Added helper functions to publish and consume queue messages
- Added readiness helper `isRabbitReady()`

Why:

- RabbitMQ connection handling should be centralized, similar to Redis configuration.
- Publishing and consuming should use one shared setup instead of duplicating connection code.

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
- The worker sends ticket emails using the existing email helper flow

Why:

- Background jobs should be processed outside the API process.
- A worker can be scaled separately if email load grows.

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
