import { Queue } from "bullmq";
import { redis } from "./redis";

export const sequenceQueue = new Queue("sequence", { connection: redis });
