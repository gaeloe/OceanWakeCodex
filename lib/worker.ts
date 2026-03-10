import { Worker } from "bullmq";
import { getRedisClient, isRedisEnabled } from "./redis";
import { runSequenceStep } from "./sequence";

export function startSequenceWorker() {
  if (!isRedisEnabled()) return null;
  if (process.env.ENABLE_QUEUE_WORKER !== "true") return null;

  const redis = getRedisClient();
  if (!redis) return null;

  return new Worker(
    "sequence",
    async (job) => {
      await runSequenceStep(job.data.sequenceRunId, job.data.stepOrder);
    },
    { connection: redis },
  );
}
