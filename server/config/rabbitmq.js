const amqp = require("amqplib");

// old code:
// There was no RabbitMQ configuration file before queue integration.

const rabbitmqUrl = process.env.RABBITMQ_URL || "amqp://127.0.0.1:5672";
const QUEUES = {
  ticketEmail: process.env.RABBITMQ_TICKET_EMAIL_QUEUE || "ticket_email_v2",
  ticketEmailDlq: process.env.RABBITMQ_TICKET_EMAIL_DLQ || "ticket_email_v2_dlq",
};

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

  await channel.assertQueue(QUEUES.ticketEmailDlq, {
    durable: true,
  });

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

    try {
      const payload = JSON.parse(message.content.toString());
      await handler(payload);
      activeChannel.ack(message);
    } catch (err) {
      console.error(`RabbitMQ consumer failed for ${queueName}:`, err.message);
      activeChannel.nack(message, false, false);
    }
  });
};

module.exports = {
  QUEUES,
  connectRabbitMQ,
  consumeQueue,
  isRabbitReady,
  publishToQueue,
};
