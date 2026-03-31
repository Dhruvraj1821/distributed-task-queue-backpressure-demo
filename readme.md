# Distributed Task Queue with Backpressure Signaling

## Overview

This project implements a distributed job processing system with backpressure signaling, dynamic producer throttling, and a real-time monitoring dashboard. The system demonstrates how producers and workers coordinate in a distributed environment to prevent overload and maintain system stability.

A producer continuously generates jobs and pushes them into a BullMQ queue backed by Redis. Multiple workers process jobs concurrently. When workers become overloaded, they send a backpressure signal that slows the producer. When workers recover, they send an all-clear signal and the producer resumes normal speed. A React dashboard displays queue depth, worker status, producer speed, and backpressure events in real time.

This project demonstrates core distributed systems concepts such as queues, worker pools, concurrency control, feedback loops, and system observability.

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
```

### Flow

1. Producer generates jobs continuously.
2. Jobs are added to a BullMQ queue stored in Redis.
3. Workers consume and process jobs concurrently.
4. Workers monitor their active job count.
5. When a worker exceeds 80% capacity, it sends a backpressure signal.
6. The server broadcasts the signal to the producer.
7. The producer slows down job creation.
8. When worker load drops below 40%, an all-clear signal is sent.
9. The producer resumes normal speed.
10. The dashboard displays queue depth, worker status, producer speed, and events in real time.

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
| Redis Deployment        | Docker            |

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
  docker-compose.yml
  README.md
```

---

## Backpressure Configuration

| Parameter                | Value           |
| ------------------------ | --------------- |
| Worker concurrency       | 10              |
| Backpressure threshold   | Active jobs > 8 |
| All-clear threshold      | Active jobs < 4 |
| Producer normal speed    | 200 ms/job      |
| Producer throttled speed | 800 ms/job      |

Workers signal backpressure at 80% capacity and recovery at 40% capacity.

---

## How to Run the System Locally

### 1. Start Redis (Docker)

From the root folder:

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

### 4. Start Workers (Open 3 Terminals)

```
cd workers
npm run worker1
```

```
cd workers
npm run worker2
```

```
cd workers
npm run worker3
```

### 5. Start Dashboard

```
cd dashboard
npm run dev
```

Open browser:

```
http://localhost:5173
```

---

## System Behavior

When the system runs:

* The producer continuously creates jobs.
* Workers process jobs concurrently.
* If workers become overloaded, they send backpressure.
* The producer slows down job creation.
* Once workers recover, they send an all-clear signal.
* The producer speeds up again.
* The dashboard shows queue depth, worker states, producer speed, and backpressure events.
* The system automatically stabilizes queue depth using feedback control.

---

## Concepts Demonstrated

This project demonstrates:

* Distributed job queues
* Worker pools
* Concurrency control
* Backpressure signaling
* Producer throttling
* Feedback control systems
* Real-time monitoring dashboards
* Queue depth visualization
* Event-driven architecture
* Redis-based message queues

---

## Possible Improvements

Future enhancements could include:

* Job retry and failure queues
* Job priority queues
* Worker autoscaling
* Rate limiting
* Authentication for dashboard
* Persistent metrics storage
* Prometheus / Grafana integration
* Kubernetes deployment
* Kafka instead of Redis
* Dead letter queues

---

## Summary

This project is a simplified distributed system that demonstrates how producers, queues, workers, and monitoring systems interact using backpressure to maintain system stability. It models real-world distributed processing systems used in large-scale applications.
