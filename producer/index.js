import { Queue } from "bullmq";
import Redis from "ioredis";
import { io } from "socket.io-client";
import dotenv from "dotenv";

dotenv.config();

const redisConnection = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  maxRetriesPerRequest: null,
});

const jobQueue = new Queue("jobQueue", {
  connection: redisConnection,
});

// Socket connection
const socket = io(process.env.SERVER_URL);

let intervalTime = 50;
let jobId = 0;
let interval;

// Function to start producing jobs
function startProducing() {
  if (interval) clearInterval(interval);

  interval = setInterval(async () => {
    jobId++;
    const jobData = {
      id: jobId,
      timestamp: Date.now(),
    };

    await jobQueue.add("job", jobData);
    console.log(`Job added: ${jobId}`);
  }, intervalTime);
}

// Socket events
socket.on("connect", () => {
  console.log("Connected to server");
});

socket.on("backpressure", () => {
  console.log("Backpressure received -> slowing down producer");
  intervalTime = 500;
  startProducing();
});

socket.on("all-clear", () => {
  console.log("All-clear received -> speeding up producer");
  intervalTime = 50;
  startProducing();
});

// Start producing
startProducing();