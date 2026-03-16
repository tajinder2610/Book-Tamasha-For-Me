const emailHelper = require("./emailHelper");

const buildTicketEmailPayload = (bookingData) => {
  // old code:
  // Ticket email payload preparation lived inline inside server/controller/booking.js.
  const sortedSeats = [...(bookingData.seats || [])].sort((a, b) => a - b).join(", ");
  const amount = bookingData.seats.length * bookingData.show.ticketPrice;
  const qrPayload = [
    `BookingId:${bookingData._id}`,
    `TransactionId:${bookingData.transactionId}`,
    `Movie:${bookingData.show.movie.title}`,
    `Name:${bookingData.user.name}`,
    `Theatre:${bookingData.show.theatre.name}`,
    `Date:${bookingData.show.date}`,
    `Time:${bookingData.show.time}`,
    `Seats:${sortedSeats}`,
    `Amount:${amount}`,
  ].join("|");

  return {
    receiverEmail: bookingData.user.email,
    templateName: "ticket.html",
    data: {
      movie: bookingData.show.movie.title,
      name: bookingData.user.name,
      theatre: bookingData.show.theatre.name,
      date: bookingData.show.date,
      time: bookingData.show.time,
      seats: sortedSeats,
      amount,
      transactionId: bookingData.transactionId,
      bookingId: bookingData._id,
      qrCodeUrl: `https://quickchart.io/qr?size=220&text=${encodeURIComponent(qrPayload)}`,
    },
  };
};

const sendTicketEmail = async (payload) => {
  // old code:
  // booking.js called emailHelper directly instead of using a shared ticket email utility.
  await emailHelper(payload.templateName, payload.receiverEmail, payload.data);
};

module.exports = {
  buildTicketEmailPayload,
  sendTicketEmail,
};
