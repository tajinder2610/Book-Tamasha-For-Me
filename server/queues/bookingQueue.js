const { QUEUES, publishToQueue } = require("../config/rabbitmq");
const { sendTicketEmail } = require("../utils/ticketEmail");

const enqueueTicketEmail = async (payload) => {
  // old code:
  // Ticket emails were sent directly from the booking controller without a queue abstraction.
  const wasQueued = await publishToQueue(QUEUES.ticketEmail, payload);

  if (wasQueued) {
    return {
      queued: true,
    };
  }

  // old code:
  // There was no RabbitMQ fallback path because there was no queue integration.
  await sendTicketEmail(payload);
  return {
    queued: false,
  };
};

module.exports = {
  enqueueTicketEmail,
};
