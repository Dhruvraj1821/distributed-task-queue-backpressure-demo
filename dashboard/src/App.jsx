import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3001");

function App() {
  const [stats, setStats] = useState({});
  const [logs, setLogs] = useState([]);
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
    });

    socket.on("backpressure", (data) => {
      addLog(
        `BACKPRESSURE from ${data.worker} → producer slowed to ${data.producerSpeed}ms`,
        "error"
      );
    });

    socket.on("all-clear", (data) => {
      addLog(
        `ALL-CLEAR from ${data.worker} → producer speed ${data.producerSpeed}ms`,
        "success"
      );
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
      {/* Terminal Header */}
      <div className="border border-green-500 p-2 mb-4 flex justify-between">
        <span>backpressure-monitor</span>
        <span>connected</span>
      </div>

      {/* Stats Panel */}
      <div className="border border-green-500 p-4 mb-4">
        <div>{">"} system.stats</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>Queue Depth: {stats.depth}</div>
          <div>Waiting Jobs: {stats.waiting}</div>
          <div>Active Jobs: {stats.active}</div>
          <div>Producer Speed: {stats.producerSpeed} ms/job</div>
          <div>Last Backpressure Worker:</div>
          <div>{stats.lastBackpressureWorker}</div>
        </div>
      </div>

      {/* Logs Panel */}
      <div className="border border-green-500 p-4 h-96 overflow-y-auto" ref={logRef}>
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

      {/* Fake Terminal Prompt */}
      <div className="mt-4">
        <span className="text-green-500">monitor@system:~$ </span>
        <span className="animate-pulse">█</span>
      </div>
    </div>
  );
}

export default App;