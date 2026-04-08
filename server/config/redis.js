const { createClient } = require("redis");

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const redisClient = createClient({
  url: redisUrl,
});

redisClient.on("error", (err) => {
  console.error("Redis error:", err.message);
});

let connectPromise = null;

const connectRedis = async () => {
  if (redisClient.isReady) {
    return redisClient;
  }

  if (!connectPromise) {
    connectPromise = redisClient.connect().catch((err) => {
      connectPromise = null;
      throw err;
    });
  }

  await connectPromise;
  return redisClient;
};

const isRedisReady = () => redisClient.isReady;

module.exports = {
  redisClient,
  connectRedis,
  isRedisReady,
};
