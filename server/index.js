import express from "express";
import http from "http";
import { Server } from "socket.io";
import { Queue } from "bullmq";
import Redis from "ioredis";
import dotenv from "dotenv";
import client from "prom-client";

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

// Track throttled workers
const throttledWorkers = new Set();

// Server state
let producerSpeed = 50;
let lastBackpressureWorker = null;

// ── Prometheus metrics ──────────────────────────────────────────
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const queueDepthGauge = new client.Gauge({
  name: "queue_depth",
  help: "Total jobs in queue (waiting + active)",
  registers: [register],
});

const jobsWaitingGauge = new client.Gauge({
  name: "jobs_waiting",
  help: "Jobs waiting in queue",
  registers: [register],
});

const jobsActiveGauge = new client.Gauge({
  name: "jobs_active",
  help: "Jobs currently being processed",
  registers: [register],
});

const producerSpeedGauge = new client.Gauge({
  name: "producer_speed_ms",
  help: "Current producer interval in milliseconds",
  registers: [register],
});

const backpressureCounter = new client.Counter({
  name: "backpressure_events_total",
  help: "Total number of backpressure signals received",
  registers: [register],
});

const allClearCounter = new client.Counter({
  name: "allclear_events_total",
  help: "Total number of all-clear signals received",
  registers: [register],
});
// ────────────────────────────────────────────────────────────────

// Metrics endpoint for Prometheus to scrape
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// Express route
app.get("/", (req, res) => {
  res.send("Backpressure Server Running");
});

// Socket.io
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("backpressure", (data) => {
    throttledWorkers.add(data.worker);
    producerSpeed = 500;
    lastBackpressureWorker = data.worker;
    backpressureCounter.inc();
    console.log(`Backpressure from ${data.worker} | throttled: [${[...throttledWorkers]}]`);

    io.emit("backpressure", {
      worker: data.worker,
      producerSpeed,
      timestamp: Date.now(),
    });
  });

  socket.on("all-clear", (data) => {
    throttledWorkers.delete(data.worker);
    console.log(`All-clear from ${data.worker} | still throttled: [${[...throttledWorkers]}]`);

    if (throttledWorkers.size === 0) {
      producerSpeed = 50;
      allClearCounter.inc();
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

// Stats loop — emit to dashboard + update Prometheus gauges
setInterval(async () => {
  const waiting = await jobQueue.getWaitingCount();
  const active = await jobQueue.getActiveCount();
  const depth = waiting + active;

  // Update gauges
  queueDepthGauge.set(depth);
  jobsWaitingGauge.set(waiting);
  jobsActiveGauge.set(active);
  producerSpeedGauge.set(producerSpeed);

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