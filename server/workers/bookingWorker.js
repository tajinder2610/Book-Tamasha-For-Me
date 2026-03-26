require("dotenv").config();

// old code:
// There was no separate worker process for booking background jobs before RabbitMQ integration.
// Current behavior:
// this worker consumes ticket email jobs from the main queue and relies on the shared RabbitMQ config
// to move failed jobs through delayed retry queues before they land in the DLQ.
// Future behavior:
// add an operator-safe DLQ replay flow so failed messages can be revalidated and retried after the root cause is fixed.

const { MAX_RETRY_ATTEMPTS, QUEUES, connectRabbitMQ, consumeQueue, retryTtlsMs } = require("../config/rabbitmq");
const { sendTicketEmail } = require("../utils/ticketEmail");

const startWorker = async () => {
  const activeChannel = await connectRabbitMQ();
  if (!activeChannel) {
    process.exitCode = 1;
    return;
  }

  await consumeQueue(QUEUES.ticketEmail, async (payload) => {
    await sendTicketEmail(payload);
  });

  console.log(`booking worker is consuming queue: ${QUEUES.ticketEmail}`);
  console.log(
    `retry queues: ${QUEUES.ticketEmailRetry
      .map((queueName, index) => `${queueName} (${retryTtlsMs[index]}ms)`)
      .join(", ")}`
  );
  console.log(`failed jobs will be moved to DLQ after ${MAX_RETRY_ATTEMPTS} retries: ${QUEUES.ticketEmailDlq}`);
};

startWorker().catch((err) => {
  console.error("booking worker failed:", err.message);
  process.exit(1);
});
