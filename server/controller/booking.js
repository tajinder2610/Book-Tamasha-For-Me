const Booking = require('../models/bookingModel');
const Show = require('../models/showModel');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Use your secret key here
// old code:
// const emailHelper = require("../utils/emailHelper");
const { redisClient, isRedisReady } = require("../config/redis");
const { invalidateSeatMapCache } = require("./show");
const { enqueueTicketEmail } = require("../queues/bookingQueue");
const { buildTicketEmailPayload } = require("../utils/ticketEmail");

const SEAT_LOCK_TTL_SECONDS = 5 * 60;

const getSeatLockKey = (showId, seatNumber) => `seatlock:${showId}:${seatNumber}`;

const lockSeats = async ({ showId, seats, userId }) => {
  // old code:
  // There was no Redis seat-lock acquisition step before checkout or booking.
  if (!isRedisReady()) {
    return;
  }

  const acquiredLocks = [];

  try {
    for (const seat of seats) {
      const lockKey = getSeatLockKey(showId, seat);
      const isLocked = await redisClient.set(lockKey, String(userId), {
        EX: SEAT_LOCK_TTL_SECONDS,
        NX: true,
      });

      if (isLocked !== "OK") {
        throw new Error(`Seat ${seat} is currently being reserved by another user`);
      }

      acquiredLocks.push(lockKey);
    }
  } catch (err) {
    if (acquiredLocks.length > 0) {
      await redisClient.del(acquiredLocks);
    }

    throw err;
  }
};

const validateSeatLocks = async ({ showId, seats, userId }) => {
  // old code:
  // There was no Redis lock validation during checkout confirmation.
  if (!isRedisReady()) {
    return;
  }

  for (const seat of seats) {
    const lockOwner = await redisClient.get(getSeatLockKey(showId, seat));
    if (lockOwner !== String(userId)) {
      throw new Error(`Seat ${seat} lock expired or belongs to another user`);
    }
  }
};

const releaseSeatLocks = async ({ showId, seats, userId }) => {
  // old code:
  // There was no Redis lock release step because no Redis seat locks existed.
  if (!isRedisReady()) {
    return;
  }

  for (const seat of seats) {
    const lockKey = getSeatLockKey(showId, seat);
    const lockOwner = await redisClient.get(lockKey);

    if (!userId || lockOwner === String(userId)) {
      await redisClient.del(lockKey);
    }
  }
};

const hydrateBooking = async (bookingId) => {
  return Booking.findById(bookingId)
    .populate({
      path: "user",
      model: "users",
    })
    .populate({
      path: "show",
      populate: {
        path: "movie",
        model: "movie",
      },
    })
    .populate({
      path: "show",
      populate: {
        path: "theatre",
        model: "theatre",
      },
    });
};

const createBookingRecord = async ({ showId, seats, transactionId, userId }) => {
  const showData = await Show.findById(showId).populate("movie").populate("theatre");
  if (!showData) {
    throw new Error("Show not found");
  }

  const alreadyBookedSeats = seats.filter((seat) => showData.bookedSeats.includes(seat));
  if (alreadyBookedSeats.length > 0) {
    throw new Error(`Seats already booked: ${alreadyBookedSeats.join(", ")}`);
  }

  const newBooking = new Booking({
    show: showId,
    seats,
    transactionId,
    user: userId,
  });
  await newBooking.save();

  const updatedBookedSeats = [...new Set([...showData.bookedSeats, ...seats])];
  await Show.findByIdAndUpdate(showId, { bookedSeats: updatedBookedSeats });

  // old code:
  // booked seats were only updated in MongoDB and the next seat map read always hit the database.
  await invalidateSeatMapCache(showId);

  const bookingData = await hydrateBooking(newBooking._id);
  const ticketEmailPayload = buildTicketEmailPayload(bookingData);

  try {
    // old code:
    // const sortedSeats = [...(bookingData.seats || [])].sort((a, b) => a - b).join(", ");
    // const qrPayload = [
    //   `BookingId:${bookingData._id}`,
    //   `TransactionId:${bookingData.transactionId}`,
    //   `Movie:${bookingData.show.movie.title}`,
    //   `Name:${bookingData.user.name}`,
    //   `Theatre:${bookingData.show.theatre.name}`,
    //   `Date:${bookingData.show.date}`,
    //   `Time:${bookingData.show.time}`,
    //   `Seats:${sortedSeats}`,
    //   `Amount:${bookingData.seats.length * bookingData.show.ticketPrice}`,
    // ].join("|");
    // const qrCodeUrl = `https://quickchart.io/qr?size=220&text=${encodeURIComponent(qrPayload)}`;
    // await emailHelper("ticket.html", bookingData.user.email, {
    //   movie: bookingData.show.movie.title,
    //   name: bookingData.user.name,
    //   theatre: bookingData.show.theatre.name,
    //   date: bookingData.show.date,
    //   time: bookingData.show.time,
    //   seats: sortedSeats,
    //   amount: bookingData.seats.length * bookingData.show.ticketPrice,
    //   transactionId: bookingData.transactionId,
    //   bookingId: bookingData._id,
    //   qrCodeUrl,
    // });
    const queueResult = await enqueueTicketEmail(ticketEmailPayload);

    if (queueResult.queued) {
      console.log("Ticket email queued", {
        bookingId: bookingData._id,
        queue: "ticket_email",
      });
    } else {
      console.log("Ticket email sent without queue fallback", {
        bookingId: bookingData._id,
      });
    }
  } catch (queueErr) {
    console.log("Ticket email dispatch failed:", queueErr.message);
  }

  return bookingData;
};

exports.makePayment = async (req, res) => {
 try {
   const { token, amount } = req.body;
   console.log(amount);
   
   // Step 1: Create a Stripe customer using the token
   const customer = await stripe.customers.create({
     email: token.email,
     source: token.id,
   });

   // Step 2: Create a PaymentIntent
   const paymentIntent = await stripe.paymentIntents.create({
     amount: amount, // Amount is in cents
     currency: "INR",
     customer: customer.id,
     payment_method_types: ["card"],
     receipt_email: token.email,
     description: "Token has been assigned to the movie!",
   });

   const transactionId = paymentIntent.id;
   // Step 3: Send a response to the client with the transaction ID
   res.send({
     success: true,
     message: "Payment processing. You will receive a confirmation once the payment is complete",
     data: transactionId,
   });
 } catch (err) {
   res.send({
     success: false,
     message: err.message,
   });
 }
}

exports.createCheckoutSession = async (req, res) => {
  try {
    const { showId, seats } = req.body;
    if (!showId || !Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Show and seats are required",
      });
    }

    const seatNumbers = seats.map((seat) => Number(seat)).filter((seat) => Number.isInteger(seat) && seat > 0);
    if (seatNumbers.length !== seats.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid seat numbers",
      });
    }

    const showData = await Show.findById(showId).populate("movie").populate("theatre");
    if (!showData) {
      return res.status(404).json({
        success: false,
        message: "Show not found",
      });
    }

    const alreadyBookedSeats = seatNumbers.filter((seat) => showData.bookedSeats.includes(seat));
    if (alreadyBookedSeats.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Seats already booked: ${alreadyBookedSeats.join(", ")}`,
      });
    }

    // old code:
    // Checkout relied only on MongoDB booked seat validation before Stripe session creation.

    await lockSeats({
      showId,
      seats: seatNumbers,
      userId: req.userId,
    });

    const unitAmount = Math.round(Number(showData.ticketPrice) * 100);
    if (!unitAmount || unitAmount <= 0) {
      await releaseSeatLocks({
        showId,
        seats: seatNumbers,
        userId: req.userId,
      });

      return res.status(400).json({
        success: false,
        message: "Invalid ticket price",
      });
    }

    const clientBaseUrl = process.env.CLIENT_URL || req.headers.origin || "http://localhost:5173";
    let session;

    try {
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "inr",
              product_data: {
                name: `${showData.movie?.title || "Movie"} - ${showData.name}`,
              },
              unit_amount: unitAmount,
            },
            quantity: seatNumbers.length,
          },
        ],
        success_url: `${clientBaseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${clientBaseUrl}/book-show/${showId}`,
        metadata: {
          userId: String(req.userId),
          showId: String(showId),
          seats: seatNumbers.join(","),
        },
      });
    } catch (stripeErr) {
      await releaseSeatLocks({
        showId,
        seats: seatNumbers,
        userId: req.userId,
      });

      throw stripeErr;
    }

    res.json({
      success: true,
      message: "Checkout session created",
      data: {
        sessionId: session.id,
        url: session.url,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.confirmCheckoutSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "sessionId is required",
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session || session.payment_status !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Payment not completed",
      });
    }

    const { userId: sessionUserId, showId, seats } = session.metadata || {};
    if (!sessionUserId || !showId || !seats) {
      return res.status(400).json({
        success: false,
        message: "Invalid checkout metadata",
      });
    }

    if (String(sessionUserId) !== String(req.userId)) {
      return res.status(403).json({
        success: false,
        message: "Checkout session does not belong to this user",
      });
    }

    const transactionId = String(session.payment_intent || session.id);
    const existingBooking = await Booking.findOne({ transactionId });
    if (existingBooking) {
      await releaseSeatLocks({
        showId,
        seats: seats
          .split(",")
          .map((seat) => Number(seat))
          .filter((seat) => Number.isInteger(seat) && seat > 0),
        userId: req.userId,
      });

      const existingBookingData = await hydrateBooking(existingBooking._id);
      return res.json({
        success: true,
        message: "Booking already confirmed",
        data: existingBookingData,
      });
    }

    const seatNumbers = seats
      .split(",")
      .map((seat) => Number(seat))
      .filter((seat) => Number.isInteger(seat) && seat > 0);

    if (seatNumbers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No seats found in checkout metadata",
      });
    }

    // old code:
    // Booking confirmation relied only on MongoDB booked seat validation.

    await validateSeatLocks({
      showId,
      seats: seatNumbers,
      userId: req.userId,
    });

    let bookingData;

    try {
      bookingData = await createBookingRecord({
        showId,
        seats: seatNumbers,
        transactionId,
        userId: req.userId,
      });
    } finally {
      await releaseSeatLocks({
        showId,
        seats: seatNumbers,
        userId: req.userId,
      });
    }

    res.json({
      success: true,
      message: "Booking confirmed",
      data: bookingData,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.bookShow = async (req, res) => {
  try{
    const { show, seats, transactionId } = req.body;
    const userId = req.userId || req.body.user;
    if (!show || !Array.isArray(seats) || seats.length === 0 || !transactionId) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking payload",
      });
    }
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User is required for booking",
      });
    }

    // old code:
    // Direct booking flow created the booking without Redis seat locking.

    await lockSeats({
      showId: show,
      seats,
      userId,
    });

    let bookingData;

    try {
      bookingData = await createBookingRecord({
        showId: show,
        seats,
        transactionId,
        userId,
      });
    } finally {
      await releaseSeatLocks({
        showId: show,
        seats,
        userId,
      });
    }

    res.json({
      success: true,
      message: "New boking done !",
      data: bookingData
    })
  }catch(err){
    res.status(500).json({
     success: false,
     message: err.message,
   });
  }
}

exports.getAllBookings = async (req, res) => {
  try{
    const allBookings = await Booking.find({user: req.userId})
    .populate({
      path: "user",
      model: "users",
    })
    .populate({
      path: "show",
      populate: {
        path: "movie",
        model: "movie"
      }
    })
    .populate({
      path: "show",
      populate: {
        path: "theatre",
        model: "theatre"
      }
    });

    res.json({
      success: true,
      message: "bokings fetched !",
      data: allBookings
    })
  }catch(err){
    res.status(500).json({
     success: false,
     message: err.message,
   });
  }
}
