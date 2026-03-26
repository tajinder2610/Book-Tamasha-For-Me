const express = require("express");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require('express-mongo-sanitize');
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const mongoose = require("mongoose");
const app = express();

require("dotenv").config({ path: path.join(__dirname, ".env") }); // load env from server/.env regardless of cwd

// Render sits behind a reverse proxy and forwards client IP via X-Forwarded-For.
// Trust the first proxy hop so middleware like express-rate-limit can identify clients correctly.
app.set("trust proxy", 1);

const connectDB = require("./config/db");
// old code:
// There was no RabbitMQ config import before queue integration.
const { connectRabbitMQ, isRabbitReady } = require("./config/rabbitmq");
const userRouter = require("./routes/userRoute");
const movieRouter = require("./routes/movieRoute");
const theatreRouter = require("./routes/theatreRoute");
const bookingRouter = require("./routes/bookingRoute");
const showRouter = require("./routes/showRoute");
const seedAdmin = require("./seedAdmin");

// old code:
// connectDB().then(() => {
//   seedAdmin();  // <-- SAFE, runs only if admin doesn't exist
// });
// connect to DB and RabbitMQ, then seed admin
Promise.all([connectDB(), connectRabbitMQ()]).then(() => {
  seedAdmin();  // <-- SAFE, runs only if admin doesn't exist
});

const apiLimiter = rateLimit({
    windowMs: 15*60*1000,
    max: 100,
    message: "Too many requests from this IP, plsease try again after 15 minutes."
});
app.use("/api",apiLimiter);
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(helmet());
app.use(
 helmet.contentSecurityPolicy({
   directives: {
     defaultSrc: ["'self'"],
     scriptSrc: ["'self'", "https://js.stripe.com"],
     styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
     imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
     connectSrc: ["'self'", "https://api.stripe.com", "https://checkout.stripe.com"],
     fontSrc: ["'self'", "https://fonts.gstatic.com"],
     objectSrc: ["'none'"],
   },
 })
);
// By default, $ and . characters are removed completely from user-supplied input in the following places:
// - req.body
// - req.params
// - req.headers
// - req.query

// To remove data using these defaults:
app.use(mongoSanitize());
app.use(cookieParser());
app.use(express.json());

app.get("/healthz", (req, res) => {
  res.status(200).json({ ok: true });
});

app.get("/readyz", (req, res) => {
  const isDbReady = mongoose.connection.readyState === 1;
  // old code:
  // /readyz did not exist before RabbitMQ integration.
  const rabbitReady = isRabbitReady();

  if (!isDbReady) {
    return res.status(503).json({
      ok: false,
      db: isDbReady,
      rabbitmq: rabbitReady,
    });
  }

  return res.status(200).json({
    ok: true,
    db: isDbReady,
    rabbitmq: rabbitReady,
  });
});

app.use("/api/users", userRouter);
app.use("/api/movies", movieRouter);
app.use("/api/theatres", theatreRouter);
app.use("/api/shows", showRouter);
app.use("/api/booking", bookingRouter);

// For deploying project: support both Vite (dist) and CRA (build)
const clientDistPath = path.join(__dirname, "../client/dist");
const clientBuildPath = path.join(__dirname, "../client/build");
const frontendPath = fs.existsSync(clientDistPath) ? clientDistPath : clientBuildPath;

if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));

  // Keep API 404 behavior intact and let React handle all other routes.
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) {
      return res.status(404).send("page not found");
    }
    return res.sendFile(path.join(frontendPath, "index.html"));
  });
} else {
  // 404 route, always keep at last
  app.use((req, res) => {
    res.status(404).send("page not found");
  });
}

const PORT = process.env.PORT || 8082;
app.listen(PORT, () => {
  console.log(`Server is Running on port ${PORT}`);
});
