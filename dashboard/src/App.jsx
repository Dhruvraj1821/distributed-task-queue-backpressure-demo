import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const socket = io("http://localhost:3001");

function App() {
  const [stats, setStats] = useState({});
  const [logs, setLogs] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [workers, setWorkers] = useState({
    worker1: "normal",
    worker2: "normal",
    worker3: "normal",
  });

  const logRef = useRef(null);

  function addLog(message, type = "info") {
    setLogs((prev) => [
      {
        text: `${new Date().toLocaleTimeString()}  ${message}`,
        type,
      },
      ...prev.slice(0, 50),
    ]);
  }

  useEffect(() => {
    socket.on("stats", (data) => {
      setStats(data);

      setChartData((prev) => {
        const newData = [
          ...prev,
          {
            time: new Date().toLocaleTimeString(),
            depth: data.depth,
          },
        ];
        return newData.slice(-30);
      });
    });

    socket.on("backpressure", (data) => {
      addLog(
        `BACKPRESSURE from ${data.worker} → producer slowed to ${data.producerSpeed}ms`,
        "error"
      );
      setWorkers((prev) => ({ ...prev, [data.worker]: "throttled" }));
    });

    socket.on("all-clear", (data) => {
      addLog(
        `ALL-CLEAR from ${data.worker} → producer speed ${data.producerSpeed}ms`,
        "success"
      );
      setWorkers((prev) => ({ ...prev, [data.worker]: "normal" }));
    });

    socket.on("connect", () => {
      addLog("Connected to server");
    });
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = 0;
    }
  }, [logs]);

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono p-4">
      {/* Header */}
      <div className="border border-green-500 p-2 mb-4 flex justify-between">
        <span>backpressure-monitor</span>
        <span>connected</span>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-2 gap-4">

        {/* Queue Chart */}
        <div className="border border-green-500 p-4">
          <div>{">"} queue.depth.chart</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <XAxis dataKey="time" hide />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="depth"
                stroke="#00ff9c"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Stats Panel */}
        <div className="border border-green-500 p-4">
          <div>{">"} system.stats</div>
          <div className="mt-2">
            <div>Queue Depth: {stats.depth}</div>
            <div>Waiting Jobs: {stats.waiting}</div>
            <div>Active Jobs: {stats.active}</div>
            <div>Producer Speed: {stats.producerSpeed} ms/job</div>
            <div>Last Backpressure Worker: {stats.lastBackpressureWorker}</div>
          </div>
        </div>

        {/* Worker Status */}
        <div className="border border-green-500 p-4">
          <div>{">"} worker.status</div>
          <div className="mt-2">
            {Object.entries(workers).map(([name, status]) => (
              <div key={name}>
                {name}:{" "}
                <span
                  className={
                    status === "throttled"
                      ? "text-red-400"
                      : "text-green-400"
                  }
                >
                  {status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Logs Panel */}
        <div
          className="border border-green-500 p-4 h-64 overflow-y-auto"
          ref={logRef}
        >
          <div>{">"} system.logs</div>
          <div className="mt-2">
            {logs.map((log, index) => (
              <div
                key={index}
                className={
                  log.type === "error"
                    ? "text-red-400"
                    : log.type === "success"
                    ? "text-green-400"
                    : "text-green-300"
                }
              >
                {">"} {log.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Terminal Prompt */}
      <div className="mt-4">
        <span className="text-green-500">monitor@system:~$ </span>
        <span className="animate-pulse">█</span>
      </div>
    </div>
  );
}

export default App;