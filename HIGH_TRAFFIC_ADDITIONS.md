# High Traffic Additions

## Clean split for this BookMyShow-style project

For this BookMyShow-style project, the clean split is:

## Direct DB

Use direct DB writes for operations that must be immediately consistent.

- user login/signup
- fetching movies, theatres, shows
- seat availability checks
- final booking confirmation
- payment verification
- marking seats/bookings as confirmed or failed

These cannot safely wait in a queue because the user needs an immediate and correct response.

## Redis

Use Redis for fast, short-lived state.

- caching movie/show/theatre lists
- caching frequently read seat maps
- temporary seat locks during checkout
- session/token-related fast lookups
- rate limiting

Redis helps reduce DB reads and is usually the first thing to add when DB load is the problem.

## RabbitMQ

Use RabbitMQ for async tasks that do not need to finish before responding to the user.

- send booking confirmation email/SMS
- generate invoice/ticket PDF
- update analytics dashboards
- write audit logs
- notify other services
- retry failed non-critical tasks
- handle booking timeout cleanup jobs

This is where queueing makes sense.

## What not to queue

Do not put the core booking write path behind a queue like:

`user selects seat -> queue -> DB later`

That creates consistency issues:

- user will not know if booking really succeeded
- seat double-booking risk increases
- payment and booking can get out of sync

## Better architecture

A safer flow is:

1. User requests seat selection.
2. Redis creates a temporary seat lock.
3. User pays.
4. Backend verifies payment and writes the confirmed booking to the DB immediately inside a transaction.
5. After success, publish async jobs to RabbitMQ for email, notifications, analytics, and similar side work.

## Better wording for the statement

Instead of:

`Instead of hitting DB directly, requests go through a queue to smooth the load on DB`

Use:

`Non-critical background tasks are sent through RabbitMQ, while Redis reduces repeated DB reads and short-lived seat-lock traffic. Critical booking and payment operations still write directly to the DB.`
