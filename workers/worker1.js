import { Worker } from "bullmq";
import Redis from "ioredis";
import { io } from "socket.io-client";
import dotenv from "dotenv";

dotenv.config();

const workerName = "worker1";

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
    activeJobs++;

    if (activeJobs > 8 && !throttled) {
      throttled = true;
      socket.emit("backpressure", { worker: workerName });
      console.log(`${workerName} sent BACKPRESSURE`);
    }

    await new Promise((resolve) => setTimeout(resolve, 300));

    activeJobs--;

    if (activeJobs < 4 && throttled) {
      throttled = false;
      socket.emit("all-clear", { worker: workerName });
      console.log(`${workerName} sent ALL-CLEAR`);
    }
  },
  {
    connection: redisConnection,
    concurrency: 10,
  }
);

console.log(`${workerName} started`);