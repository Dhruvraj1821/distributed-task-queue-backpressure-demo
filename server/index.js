import express from "express";
import http from "http";
import { Server } from "socket.io";
import { Queue } from "bullmq";
import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

// Redis connection
const redisConnection = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  maxRetriesPerRequest: null,
});

// BullMQ Queue
const jobQueue = new Queue("jobQueue", {
  connection: redisConnection,
});

// queue to track throttled workers
const throttledWorkers = new Set();

// Server state
let producerSpeed = 50;
let lastBackpressureWorker = null;

// Express route
app.get("/", (req, res) => {
  res.send("Backpressure Server Running");
});

// Socket.io
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Worker sends backpressure
  socket.on("backpressure", (data) => {
    throttledWorkers.add(data.worker);
    producerSpeed = 500;
    lastBackpressureWorker = data.worker;
    console.log(`Backpressure from ${data.worker} | throttled: [${[...throttledWorkers]}]`);

    io.emit("backpressure", {
      worker: data.worker,
      producerSpeed,
      timestamp: Date.now(),
    });
  });

  // Worker sends all-clear
  socket.on("all-clear", (data) => {
    throttledWorkers.delete(data.worker);
    console.log(`All-clear from ${data.worker} | still throttled: [${[...throttledWorkers]}]`);
    
    if(throttledWorkers.size === 0){
      producerSpeed = 50;
      io.emit("all-clear", {
        worker: data.worker,
        producerSpeed,
        timestamp: Date.now(),
      });
      console.log(`All workers clear → producer resuming at ${producerSpeed}ms`);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Send stats every second
setInterval(async () => {
  const waiting = await jobQueue.getWaitingCount();
  const active = await jobQueue.getActiveCount();
  const depth = waiting + active;

  io.emit("stats", {
    waiting,
    active,
    depth,
    producerSpeed,
    lastBackpressureWorker,
    timestamp: Date.now(),
  });
}, 1000);

// Start server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});