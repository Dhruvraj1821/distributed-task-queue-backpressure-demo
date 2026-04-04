# Distributed Task Queue with Backpressure Signaling

## Overview

This project implements a distributed job processing system with backpressure signaling, dynamic producer throttling, a real-time monitoring dashboard, and production-grade observability using Prometheus and Grafana.

A producer continuously generates jobs and pushes them into a BullMQ queue backed by Redis. Multiple workers process jobs concurrently. When workers become overloaded, they send a backpressure signal that slows the producer. When all workers recover, they send an all-clear signal and the producer resumes normal speed. A React dashboard displays queue depth, worker status, producer speed, and backpressure events in real time. Prometheus scrapes metrics from the server every 5 seconds and Grafana visualizes them on a live dashboard.

---

## What is Backpressure?

Backpressure is a flow-control mechanism used in distributed systems where consumers signal producers to slow down when they are overloaded. Instead of allowing queues to grow indefinitely and potentially crash the system, consumers send a signal upstream to reduce the production rate. Once the system recovers and capacity becomes available again, the producer resumes normal speed.

Backpressure is commonly used in streaming systems, message queues, distributed job processors, and event-driven architectures to maintain system stability and prevent overload.

---

## System Architecture

```
                React Dashboard
                      ↑
                      |
Producer ←→ Server ←→ Workers
              |
           BullMQ
              |
            Redis
              
Prometheus ← scrapes ── Server (/metrics)
      ↑
   Grafana
```

---

## System Flow

1. Producer generates jobs continuously at 50ms intervals.
2. Jobs are added to a BullMQ queue stored in Redis.
3. Three workers consume and process jobs concurrently (concurrency: 10 each).
4. Workers monitor their active job count via BullMQ worker events.
5. When a worker exceeds 80% capacity (8/10 jobs), it sends a backpressure signal.
6. The server adds that worker to a throttled set and broadcasts the signal to the producer.
7. The producer slows down to 500ms per job.
8. When a worker's load drops below 40% (4/10 jobs), it sends an all-clear signal.
9. The server removes that worker from the throttled set.
10. Only when all workers have cleared does the producer resume at 50ms.
11. The React dashboard displays queue depth, worker states, producer speed, and events in real time.
12. Prometheus scrapes `/metrics` every 5 seconds and Grafana visualizes the data.

---

## Tech Stack

| Component               | Technology        |
| ----------------------- | ----------------- |
| Backend                 | Node.js + Express |
| Queue                   | BullMQ            |
| Queue Storage           | Redis             |
| Redis Client            | ioredis           |
| Real-time Communication | Socket.io         |
| Frontend                | React (Vite)      |
| Styling                 | Tailwind CSS      |
| Charts                  | Recharts          |
| Metrics                 | prom-client       |
| Monitoring              | Prometheus        |
| Visualization           | Grafana           |
| Containerization        | Docker            |

---

## Project Structure

```
backpressure-demo/
  producer/
    index.js
    package.json
  workers/
    worker1.js
    worker2.js
    worker3.js
    package.json
  server/
    index.js
    package.json
  dashboard/
    (React Vite App)
  prometheus.yml
  docker-compose.yml
  README.md
```

---

## Backpressure Configuration

| Parameter                  | Value                 |
| -------------------------- | --------------------- |
| Worker concurrency         | 10                    |
| Backpressure threshold     | Active jobs > 8 (80%) |
| All-clear threshold        | Active jobs < 4 (40%) |
| Producer normal speed      | 50 ms/job             |
| Producer throttled speed   | 500 ms/job            |
| Prometheus scrape interval | 5s                    |

---

## Prometheus Metrics

| Metric                    | Type    | Description                            |
| ------------------------- | ------- | -------------------------------------- |
| queue_depth               | Gauge   | Total jobs in queue (waiting + active) |
| jobs_waiting              | Gauge   | Jobs waiting to be processed           |
| jobs_active               | Gauge   | Jobs currently being processed         |
| producer_speed_ms         | Gauge   | Current producer interval in ms        |
| backpressure_events_total | Counter | Total backpressure signals received    |
| allclear_events_total     | Counter | Total all-clear signals received       |

---

## How to Run

### 1. Start Redis, Prometheus, and Grafana

```
docker-compose up -d
```

### 2. Start Server

```
cd server
npm start
```

### 3. Start Producer

```
cd producer
npm start
```

### 4. Start Workers (3 separate terminals)

```
cd workers && npm run worker1
cd workers && npm run worker2
cd workers && npm run worker3
```

### 5. Start Dashboard

```
cd dashboard
npm run dev
```

---

## Access Points

| Service          | URL                                                            |
| ---------------- | -------------------------------------------------------------- |
| React Dashboard  | [http://localhost:5173](http://localhost:5173)                 |
| Server           | [http://localhost:3001](http://localhost:3001)                 |
| Metrics Endpoint | [http://localhost:3001/metrics](http://localhost:3001/metrics) |
| Prometheus       | [http://localhost:9090](http://localhost:9090)                 |
| Grafana          | [http://localhost:3000](http://localhost:3000)                 |

Grafana default credentials: **admin / admin**

---

## Concepts Demonstrated

* Distributed job queues
* Worker pools and concurrency control
* Backpressure signaling and producer throttling
* Feedback control systems
* Per-worker throttle state tracking
* Real-time monitoring with Socket.io
* Production observability with Prometheus and Grafana
* Queue depth visualization
* Event-driven architecture
* Containerized infrastructure with Docker

---

## Possible Improvements

* Job retry and dead letter queues
* Job priority queues
* Worker autoscaling based on queue depth
* Rate limiting
* Kubernetes deployment
* Kafka instead of Redis
* Persistent Grafana dashboards via provisioning
* Alerting rules in Prometheus

---

## Summary

This project demonstrates a distributed job processing system with dynamic backpressure control, real-time monitoring, and production-style observability using Prometheus and Grafana. It models real-world distributed processing architectures used in large-scale backend systems.
