import { Queue } from "bullmq";
import { getRedisClient, isRedisEnabled } from "./redis";

let sequenceQueue: Queue | null = null;

export function getSequenceQueue() {
  if (!isRedisEnabled()) return null;

  if (!sequenceQueue) {
    const redis = getRedisClient();
    if (!redis) return null;
    sequenceQueue = new Queue("sequence", { connection: redis });
  }

  return sequenceQueue;
}
