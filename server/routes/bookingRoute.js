const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  makePayment,
  bookShow,
  getAllBookings,
  createCheckoutSession,
  confirmCheckoutSession,
} = require("../controller/booking");
// Route to process payment
router.post("/make-payment", makePayment);
router.post("/book-show", bookShow);
router.post("/create-checkout-session", authMiddleware, createCheckoutSession);
router.post("/confirm-checkout-session", authMiddleware, confirmCheckoutSession);
router.get("/:userId", authMiddleware, getAllBookings);

module.exports = router;
