const amqp = require("amqplib");

// old code:
// There was no RabbitMQ configuration file before queue integration.

const rabbitmqUrl = process.env.RABBITMQ_URL || "amqp://127.0.0.1:5672";
const DEFAULT_RETRY_TTLS_MS = [5000, 30000];

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const retryTtlsMs = [
  toPositiveInt(process.env.RABBITMQ_TICKET_EMAIL_RETRY_1_TTL_MS, DEFAULT_RETRY_TTLS_MS[0]),
  toPositiveInt(process.env.RABBITMQ_TICKET_EMAIL_RETRY_2_TTL_MS, DEFAULT_RETRY_TTLS_MS[1]),
];

// Current retry flow for ticket email jobs:
// main queue -> retry queue 1 (5s by default) -> main queue -> retry queue 2 (30s by default) -> main queue -> DLQ
// This gives transient email/provider failures a couple of delayed retries before we treat the job as permanently failed.
const QUEUES = {
  ticketEmail: process.env.RABBITMQ_TICKET_EMAIL_QUEUE || "ticket_email_v2",
  ticketEmailDlq: process.env.RABBITMQ_TICKET_EMAIL_DLQ || "ticket_email_v2_dlq",
  ticketEmailRetry: [
    process.env.RABBITMQ_TICKET_EMAIL_RETRY_1_QUEUE || "ticket_email_v2_retry_1",
    process.env.RABBITMQ_TICKET_EMAIL_RETRY_2_QUEUE || "ticket_email_v2_retry_2",
  ],
};

const MAX_RETRY_ATTEMPTS = QUEUES.ticketEmailRetry.length;

let connection = null;
let channel = null;
let connectPromise = null;

const resetRabbitState = () => {
  connection = null;
  channel = null;
};

const assertQueues = async () => {
  if (!channel) {
    return;
  }

  // Failed messages eventually land in the DLQ after retry queues are exhausted.
  // Today operators inspect and requeue DLQ messages manually after fixing the root cause.
  // A future improvement is a dedicated DLQ replay/admin flow with validation and capped retries.
  await channel.assertQueue(QUEUES.ticketEmailDlq, {
    durable: true,
  });

  for (const [index, retryQueueName] of QUEUES.ticketEmailRetry.entries()) {
    // Each retry queue acts as a delay bucket.
    // After the TTL expires, RabbitMQ dead-letters the message back to the main queue for another attempt.
    await channel.assertQueue(retryQueueName, {
      durable: true,
      arguments: {
        "x-message-ttl": retryTtlsMs[index],
        "x-dead-letter-exchange": "",
        "x-dead-letter-routing-key": QUEUES.ticketEmail,
      },
    });
  }

  await channel.assertQueue(QUEUES.ticketEmail, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": "",
      "x-dead-letter-routing-key": QUEUES.ticketEmailDlq,
    },
  });
};

const connectRabbitMQ = async () => {
  // old code:
  // The backend only initialized MongoDB before RabbitMQ integration.
  if (channel) {
    return channel;
  }

  if (connectPromise) {
    return connectPromise;
  }

  connectPromise = (async () => {
    try {
      connection = await amqp.connect(rabbitmqUrl);

      connection.on("error", (err) => {
        console.error("RabbitMQ error:", err.message);
      });

      connection.on("close", () => {
        console.error("RabbitMQ connection closed");
        resetRabbitState();
      });

      channel = await connection.createChannel();
      await assertQueues();
      console.log("connected to rabbitmq");
      return channel;
    } catch (err) {
      resetRabbitState();
      console.error("RabbitMQ connection failed:", err.message);
      return null;
    } finally {
      connectPromise = null;
    }
  })();

  return connectPromise;
};

const isRabbitReady = () => Boolean(connection && channel);

const publishToQueue = async (queueName, payload) => {
  // old code:
  // Background work was handled inline in the booking request instead of being published to RabbitMQ.
  const activeChannel = channel || (await connectRabbitMQ());
  if (!activeChannel) {
    return false;
  }

  await assertQueues();
  activeChannel.sendToQueue(queueName, Buffer.from(JSON.stringify(payload)), {
    persistent: true,
    contentType: "application/json",
  });

  return true;
};

const getRetryCount = (message) => {
  const retryCount = message?.properties?.headers?.["x-retry-count"];
  const parsed = Number.parseInt(retryCount, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
};

const getMessageOptions = (message, retryCount) => ({
  persistent: true,
  contentType: message?.properties?.contentType || "application/json",
  headers: {
    ...(message?.properties?.headers || {}),
    // We track retries in headers so we know which delay queue to use next
    // and so DLQ investigation can see how many attempts already happened.
    "x-retry-count": retryCount,
  },
});

const consumeQueue = async (queueName, handler) => {
  // old code:
  // There were no dedicated queue consumers or DLQ-aware worker channels before RabbitMQ integration.
  const activeChannel = channel || (await connectRabbitMQ());
  if (!activeChannel) {
    throw new Error("RabbitMQ is not connected");
  }

  await assertQueues();
  activeChannel.prefetch(1);

  await activeChannel.consume(queueName, async (message) => {
    if (!message) {
      return;
    }

    const retryCount = getRetryCount(message);

    try {
      const payload = JSON.parse(message.content.toString());
      await handler(payload);
      activeChannel.ack(message);
    } catch (err) {
      console.error(`RabbitMQ consumer failed for ${queueName}:`, err.message);

      const nextRetryCount = retryCount + 1;
      const retryQueueName = QUEUES.ticketEmailRetry[retryCount];

      if (retryQueueName) {
        // Retry-queue-with-TTL flow added for ticket email jobs:
        // on failure we publish to a delay queue instead of immediately dead-lettering.
        // RabbitMQ sends it back to the main queue after the retry queue TTL expires.
        activeChannel.sendToQueue(
          retryQueueName,
          Buffer.from(message.content),
          getMessageOptions(message, nextRetryCount)
        );
        console.warn(
          `RabbitMQ message moved to retry queue ${retryQueueName} (${nextRetryCount}/${MAX_RETRY_ATTEMPTS})`
        );
        activeChannel.ack(message);
        return;
      }

      // Final failure path:
      // after the configured delayed retries are exhausted, we move the message to the DLQ.
      // Future improvement: add a safe replay mechanism for DLQ messages after the underlying issue is fixed.
      activeChannel.sendToQueue(
        QUEUES.ticketEmailDlq,
        Buffer.from(message.content),
        getMessageOptions(message, retryCount)
      );
      console.error(
        `RabbitMQ message moved to DLQ ${QUEUES.ticketEmailDlq} after ${retryCount} retries`
      );
      activeChannel.ack(message);
    }
  });
};

module.exports = {
  QUEUES,
  MAX_RETRY_ATTEMPTS,
  retryTtlsMs,
  connectRabbitMQ,
  consumeQueue,
  isRabbitReady,
  publishToQueue,
};
