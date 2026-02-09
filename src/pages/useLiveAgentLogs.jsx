import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAppContext } from "../context/AppContext";
import "./useLiveAgentLogs.css";
const WEBSOCKET_ENDPOINT =
  "wss://d6mjprxb95.execute-api.us-west-2.amazonaws.com/production";

// This replaces the complex stage-based logic with a simple log viewer
export const AiActivityPanel = () => {
  // ⭐️ Access state from the AppContext
  const { state, dispatch } = useAppContext();
  const { isProcessing, error, fileName } = state.singleUpload;
  const { criteriaKey } = state.processKeys;

  // State for live commentary logs and WebSocket status
  const [liveLogs, setLiveLogs] = useState([]);
  const [wsStatus, setWsStatus] = useState("Idle");
  const socketRef = useRef(null);

  // Connection should be active when processing starts and we have a key
  const shouldConnect = isProcessing && criteriaKey;

  // Helper to scroll to the bottom of the logs
  const logsEndRef = useRef(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // --- Core WebSocket Connection Logic ---
  useEffect(() => {
    // 1. Disconnect/Idle Logic
    if (!shouldConnect) {
      setWsStatus("Idle");
      if (socketRef.current) {
        socketRef.current.close(1000, "Process ended or key missing");
        socketRef.current = null;
      }
      if (!isProcessing && criteriaKey === null) {
            setLiveLogs([]);
        }
      if (!isProcessing && criteriaKey) {
        // Keep logs if processing just finished, only clear if we are completely idle
      } else {
        setLiveLogs([]);
      }
      return;
    }

    // 2. Connect Logic
    setWsStatus("Connecting...");
    const socket = new WebSocket(WEBSOCKET_ENDPOINT);
    socketRef.current = socket;

    socket.onopen = () => {
      setWsStatus("Connected");
      console.log("WebSocket connected for live logs");

      const subscriptionMessage = {
        action: "subscribeToLogs",
        criteriaFileKey: criteriaKey,
      };
      socket.send(JSON.stringify(subscriptionMessage));
      setLiveLogs((prev) => [
        ...prev,
        `[INIT] Subscribed to logs for key: ${criteriaKey}`,
      ]);
    };

    socket.onmessage = (event) => {
      let logMessage = event.data;
      let finalStatus = null;
      let progressUpdate = null;

      try {
        // Attempt to parse JSON to look for a 'message' and 'status'
        const data = JSON.parse(event.data);
        // --- 🎯 CORE PROGRESS BAR LOGIC ADDED HERE ---
        if (data.type === "step_commentary" && data.progress !== undefined) {
          progressUpdate = data.progress;
        } else if (data.type === "agent_description" && data.progress !== undefined) {
          // Also update progress on agent description messages
          progressUpdate = data.progress;
        }
        logMessage = data.message || JSON.stringify(data);
        if (data.status) {
          finalStatus = data.status; // e.g., 'completed', 'error'
        }
      } catch (e) {
        // If not JSON, use raw data.
      }

      // Dispatch the progress update to AppContext if a new value was found
      if (progressUpdate !== null) {
        dispatch({ type: "SET_PROGRESS", payload: progressUpdate });
      }

      // Add the new log to the state
      setLiveLogs((prevLogs) => [...prevLogs, logMessage]);

      // Auto-close on final status messages
      if (finalStatus === "completed") {
        dispatch({ type: "SET_PROGRESS", payload: 100 });
        setLiveLogs((prevLogs) => [
          ...prevLogs,
          "[STATUS] Process Completed. Closing stream.",
        ]);
        socketRef.current?.close(1000, "Process Completed");
      } else if (finalStatus === "error") {
        setLiveLogs((prevLogs) => [
          ...prevLogs,
          "[STATUS] Process Error. Closing stream.",
        ]);
        socketRef.current?.close(1001, "Process Error");
      }
    };

    socket.onerror = (e) => {
      setWsStatus("Error");
      setLiveLogs((prev) => [
        ...prev,
        "[ERROR] WebSocket connection error. Check network.",
      ]);
      console.error("WebSocket Error:", e);
    };

    socket.onclose = (event) => {
      setWsStatus("Disconnected");
      console.log("WebSocket closed.", event.code);
      if (event.code !== 1000) {
        setLiveLogs((prev) => [
          ...prev,
          `[ERROR] Stream closed unexpectedly (Code: ${event.code}).`,
        ]);
      }
    };

    // Cleanup: Close the WebSocket connection
    return () => {
      if (
        socketRef.current &&
        (socketRef.current.readyState === WebSocket.OPEN ||
          socketRef.current.readyState === WebSocket.CONNECTING)
      ) {
        socketRef.current.close(1000, "Component Unmount/Cleanup");
      }
      socketRef.current = null;
    };
  }, [shouldConnect, criteriaKey, isProcessing, dispatch]);


  // Effect to scroll to the bottom whenever liveLogs updates
  useEffect(() => {
    scrollToBottom();
  }, [liveLogs]);

  // --- RENDER LOGIC ---

  const isIdle = !fileName && !isProcessing && liveLogs.length === 0;
  const overallStatus = isProcessing
    ? "Processing"
    : error
    ? "Error"
    : liveLogs.some((log) => log.includes("Completed"))
    ? "Completed"
    : "Idle";
  const emoji =
    overallStatus === "Completed"
      ? "✅"
      : overallStatus === "Error"
      ? "❌"
      : overallStatus === "Processing"
      ? "⏳"
      : "⚪";
  const progressText =
    overallStatus === "Completed"
      ? "100%"
      : overallStatus === "Error"
      ? "100%"
      : overallStatus === "Processing"
      ? `${state.progress}%`
      : "0%";
  const progressBarWidth =
    overallStatus === "Processing"
      ? state.progress
      : overallStatus === "Completed" || overallStatus === "Error"
      ? 100
      : 0;

  // Determine the most recent log for display outside the scrollbox
  const lastLogMessage = liveLogs[liveLogs.length - 1];

  return (
    <div className="ai-activity-panel">
      <div className="ai-header">
        <h2 className="ai-header-title">AI Agent Activity</h2>
        <div
          className={`ai-status ${wsStatus.toLowerCase()}`}
          title={`WebSocket Status: ${wsStatus}`}
        ></div>
      </div>

      {isIdle ? (
        // 1. IDLE STATE: Placeholder
        <div className="activity-feed">
          <div
            className="activity-item placeholder"
            style={{
              textAlign: "center",
              padding: "20px",
              border: "1px dashed #ccc",
              color: "#666",
            }}
          >
            <div className="activity-desc">
              The live log stream will appear here once an upload process
              starts.
            </div>
          </div>
        </div>
      ) : (
        // 2. ACTIVE/COMPLETED/ERROR STATE: Single Log View
        <>
          <div className="activity-feed">
            {/* Overall Status Box */}
            <div className={`activity-item ${overallStatus.toLowerCase()}`}>
              <div className="activity-time">
                Status: {overallStatus} • {progressText}
              </div>
              <div className="activity-title">
                <span>{emoji}</span>
                {/* <span>Process Stream for: {fileName || 'N/A'}</span> */}
                <span className="process-stream-container">
                  <span className="process-stream-label">
                    Process Stream for:{" "}
                  </span>
                  <span className="process-stream-filename">
                    {fileName || "N/A"}
                  </span>
                </span>
              </div>
              <div className="activity-desc" style={{ fontSize: "0.9em" }}>
                {/* Last Update: {lastLogMessage || "Awaiting first message..."} */}
              </div>
              <div className="progress-bar-sidebar">
                <div
                  className="progress-fill-sidebar"
                  style={{ width: `${progressBarWidth}%` }}
                ></div>
              </div>
            </div>
          </div>

          <hr style={{ margin: "20px 0" }} />
          <h3 className="ai-header-title">
            Live Agent Commentary ({wsStatus})
          </h3>

          {/* Live Log Stream Container */}
          <div
            className="activity-feed live-log-stream"
           
          >
            {liveLogs.map((log, index) => (
              <p
                key={index}
                style={{
                  margin: "2px 0",
                  fontSize: "0.85em",
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                }}
              >
                {/* <span style={{ color: "#888", marginRight: "5px" }}>
                  [{new Date().toLocaleTimeString()}]
                </span> */}
                - 
                {log}
              </p>
            ))}
            <div ref={logsEndRef} />
          </div>
        </>
      )}
    </div>
  );
};
