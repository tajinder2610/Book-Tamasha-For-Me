const { createClient } = require("redis");

// old code:
// There was no Redis config file before Redis integration.

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const redisClient = createClient({
  url: redisUrl,
});

redisClient.on("error", (err) => {
  console.error("Redis error:", err.message);
});

const connectRedis = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
      console.log("connected to redis");
    }
  } catch (err) {
    console.error("Redis connection failed:", err.message);
  }
};

// old code:
// const isRedisReady = () => redisClient.isOpen;
// `isOpen` only means the client opened its socket machinery, not that Redis is ready to serve commands.
const isRedisReady = () => redisClient.isReady;

module.exports = { redisClient, connectRedis, isRedisReady };
