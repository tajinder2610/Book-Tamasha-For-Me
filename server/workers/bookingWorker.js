require("dotenv").config();

// old code:
// There was no separate worker process for booking background jobs before RabbitMQ integration.

const { QUEUES, connectRabbitMQ, consumeQueue } = require("../config/rabbitmq");
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
  console.log(`failed jobs will be moved to DLQ: ${QUEUES.ticketEmailDlq}`);
};

startWorker().catch((err) => {
  console.error("booking worker failed:", err.message);
  process.exit(1);
});
