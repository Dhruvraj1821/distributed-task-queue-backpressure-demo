import { Worker } from "bullmq";
import Redis from "ioredis";
import { io } from "socket.io-client";
import dotenv from "dotenv";

dotenv.config();

const workerName = "worker2";

const redisConnection = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  maxRetriesPerRequest: null,
});

const socket = io(process.env.SERVER_URL);

let activeJobs = 0;
let throttled = false;

const worker = new Worker(
  "jobQueue",
  async (job) => {
    // no counter tracking here (trying to solve a race condition in initail worker logic)
    // check out previous commit it had a manual counter for active jobs which causes
    // race condition(the increments and decrements interleave unpredictably)
    await new Promise((resolve) => setTimeout(resolve, 1000));
  },
  {
    connection: redisConnection,
    concurrency: 10,
  }
);
// refactored the code below to match current worker logic.

worker.on("active", () => {
  activeJobs++;

  if (activeJobs > 8 && !throttled) {
    throttled = true;
    socket.emit("backpressure", { worker: workerName });
    console.log(`${workerName} sent BACKPRESSURE`);
  }
});

worker.on("completed", () => {
  activeJobs--;

  if (activeJobs < 4 && throttled) {
    throttled = false;
    socket.emit("all-clear", { worker: workerName });
    console.log(`${workerName} sent ALL-CLEAR`);
  }
});

worker.on("failed", () => {
  activeJobs--;

  if (activeJobs < 4 && throttled) {
    throttled = false;
    socket.emit("all-clear", { worker: workerName });
    console.log(`${workerName} sent ALL-CLEAR`);
  }
});

console.log(`${workerName} started`);