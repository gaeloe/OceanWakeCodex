import IORedis from "ioredis";

let redisClient: IORedis | null = null;

export function getRedisClient() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  if (!redisClient) {
    redisClient = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });
  }

  return redisClient;
}

export function isRedisEnabled() {
  return Boolean(process.env.REDIS_URL && process.env.ENABLE_REDIS === "true");
}
