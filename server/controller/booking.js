const Booking = require('../models/bookingModel');
const Show = require('../models/showModel');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Use your secret key here
// old code:
// const emailHelper = require("../utils/emailHelper");
const { enqueueTicketEmail } = require("../queues/bookingQueue");
const { buildTicketEmailPayload } = require("../utils/ticketEmail");
const User = require("../models/userModel");
const { redisClient, isRedisReady } = require("../config/redis");

const SEAT_HOLD_TTL_MS = Number(process.env.SEAT_HOLD_TTL_MS || 10 * 60 * 1000);
const SEAT_LOCK_KEY_PREFIX = "seatlock";

const ensureUserCanBook = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }
  if (user.isBlocked) {
    throw new Error(user.blockReason || "Your account has been blocked from booking");
  }
  return user;
};

const normalizeSeatNumbers = (seats = []) =>
  seats.map((seat) => Number(seat)).filter((seat) => Number.isInteger(seat) && seat > 0);

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const ensureRedisSeatLockingReady = () => {
  if (!isRedisReady()) {
    throw createHttpError("Seat locking is temporarily unavailable. Please try again in a moment.", 503);
  }
};

const getSeatLockKey = (showId, seatNumber) => `${SEAT_LOCK_KEY_PREFIX}:${showId}:${seatNumber}`;

const getSeatLockOwner = (userId) => String(userId);

const acquireSeatLocks = async ({ showId, seatNumbers, userId }) => {
  ensureRedisSeatLockingReady();

  const owner = getSeatLockOwner(userId);
  const keys = seatNumbers.map((seatNumber) => getSeatLockKey(showId, seatNumber));
  const holdExpiry = new Date(Date.now() + SEAT_HOLD_TTL_MS);

  const acquired = await redisClient.eval(
    `
      for i = 1, #KEYS do
        local current = redis.call("GET", KEYS[i])
        if current and current ~= ARGV[1] then
          return 0
        end
      end

      for i = 1, #KEYS do
        redis.call("SET", KEYS[i], ARGV[1], "PX", ARGV[2])
      end

      return 1
    `,
    {
      keys,
      arguments: [owner, String(SEAT_HOLD_TTL_MS)],
    }
  );

  return {
    acquired: acquired === 1,
    holdExpiry,
  };
};

const validateSeatLocks = async ({ showId, seatNumbers, userId }) => {
  ensureRedisSeatLockingReady();

  const owner = getSeatLockOwner(userId);
  const keys = seatNumbers.map((seatNumber) => getSeatLockKey(showId, seatNumber));
  const valid = await redisClient.eval(
    `
      for i = 1, #KEYS do
        local current = redis.call("GET", KEYS[i])
        if current ~= ARGV[1] then
          return 0
        end
      end

      return 1
    `,
    {
      keys,
      arguments: [owner],
    }
  );

  return valid === 1;
};

const releaseSeatLocks = async ({ showId, seatNumbers, userId }) => {
  if (!isRedisReady()) {
    return;
  }

  const owner = getSeatLockOwner(userId);
  const keys = seatNumbers.map((seatNumber) => getSeatLockKey(showId, seatNumber));
  await redisClient.eval(
    `
      for i = 1, #KEYS do
        local current = redis.call("GET", KEYS[i])
        if current == ARGV[1] then
          redis.call("DEL", KEYS[i])
        end
      end

      return 1
    `,
    {
      keys,
      arguments: [owner],
    }
  );
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

const createBookingRecord = async ({ showId, seats, transactionId, userId, requireSeatHold = false }) => {
  const showData = await Show.findById(showId).populate("movie").populate("theatre");
  if (!showData) {
    throw new Error("Show not found");
  }

  const alreadyBookedSeats = seats.filter((seat) => showData.bookedSeats.includes(seat));
  if (alreadyBookedSeats.length > 0) {
    throw new Error(`Seats already booked: ${alreadyBookedSeats.join(", ")}`);
  }

  if (requireSeatHold) {
    const hasValidLocks = await validateSeatLocks({ showId, seatNumbers: seats, userId });
    if (!hasValidLocks) {
      throw createHttpError("Your seat hold expired before payment confirmation", 409);
    }
  }

  const newBooking = new Booking({
    show: showId,
    seats,
    transactionId,
    user: userId,
  });
  await newBooking.save();

  const updatedBookedSeats = [...new Set([...showData.bookedSeats, ...seats])];
  await Show.findByIdAndUpdate(showId, { $set: { bookedSeats: updatedBookedSeats } });
  await releaseSeatLocks({ showId, seatNumbers: seats, userId });

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
    await ensureUserCanBook(req.userId);
    if (!showId || !Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Show and seats are required",
      });
    }

    const seatNumbers = normalizeSeatNumbers(seats);
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

    const unitAmount = Math.round(Number(showData.ticketPrice) * 100);
    if (!unitAmount || unitAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket price",
      });
    }

    const heldShowData = await acquireSeatLocks({
      showId,
      seatNumbers,
      userId: req.userId,
    });

    if (!heldShowData.acquired) {
      return res.status(409).json({
        success: false,
        message: "One or more selected seats were just reserved by another user",
      });
    }

    const clientBaseUrl = process.env.CLIENT_URL || req.headers.origin || "http://localhost:5173";
    try {
      const session = await stripe.checkout.sessions.create({
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

      res.json({
        success: true,
        message: "Checkout session created and seats reserved",
        data: {
          sessionId: session.id,
          url: session.url,
          holdExpiresAt: heldShowData.holdExpiry,
        },
      });
    } catch (stripeErr) {
      await releaseSeatLocks({
        showId,
        seatNumbers,
        userId: req.userId,
      });
      throw stripeErr;
    }
  } catch (err) {
    res.status(err.statusCode || 500).json({
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
    await ensureUserCanBook(req.userId);

    const transactionId = String(session.payment_intent || session.id);
    const existingBooking = await Booking.findOne({ transactionId });
    if (existingBooking) {
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

    const bookingData = await createBookingRecord({
      showId,
      seats: seatNumbers,
      transactionId,
      userId: req.userId,
      requireSeatHold: true,
    });

    res.json({
      success: true,
      message: "Booking confirmed",
      data: bookingData,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
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
    await ensureUserCanBook(userId);
    const normalizedSeats = normalizeSeatNumbers(seats);
    if (normalizedSeats.length !== seats.length || normalizedSeats.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking payload",
      });
    }

    const bookingData = await createBookingRecord({
      showId: show,
      seats: normalizedSeats,
      transactionId,
      userId,
    });

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
