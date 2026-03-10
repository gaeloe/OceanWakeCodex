import { Worker } from "bullmq";
import { redis } from "./redis";
import { runSequenceStep } from "./sequence";

export const sequenceWorker =
  process.env.ENABLE_QUEUE_WORKER === "true"
    ? new Worker(
        "sequence",
        async (job) => {
          await runSequenceStep(job.data.sequenceRunId, job.data.stepOrder);
        },
        { connection: redis },
      )
    : null;
