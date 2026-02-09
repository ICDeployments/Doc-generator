import React, { useState, useEffect, useRef } from "react";
import { useAppContext } from "../context/AppContext";
import "./DescriptionBox.css";

const WebSocketEndpoint =
  "wss://hqfx2qwvpg.execute-api.us-west-2.amazonaws.com/production";


const DescriptionBox = () => {
  const { state } = useAppContext();
  // Destructure necessary values from the state
  const { messages, currentStep, singleUpload } = state;
  const { isProcessing, error, fileName } = singleUpload;

  // Assuming the single file being processed is associated with criteriaKey
  // and we don't need policyKeys for single-file mode.
  const { criteriaKey } = state.processKeys;
    console.log("ct", criteriaKey);
  // ⭐️ State for live commentary logs and WebSocket status
  const [liveLogs, setLiveLogs] = useState([]);
  const [wsStatus, setWsStatus] = useState("Connecting...");
  console.log("wsStatus", wsStatus);
  const socketRef = useRef(null);

  // ⭐️ Boolean flag to control when the WebSocket should be active
  // Connection is active if processing AND progress is >= 10 AND criteriaKey exists
  const shouldConnect = isProcessing && state.progress >= 10  && criteriaKey;

  // ⭐️ useEffect Hook for WebSocket Connection (Modified)
  useEffect(() => {
    // 1. Disconnect/Idle Logic
    if (!shouldConnect) {
      setWsStatus("Idle");
      // Optional: Close any existing connection if conditions are no longer met
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      setLiveLogs([]); // Clear logs when not active
      return;
    }

    setWsStatus('Connecting...');
    const socket = new WebSocket(WebSocketEndpoint);
    socketRef.current = socket; // Store the socket reference

    socket.onopen = () => {
      setWsStatus("Connected");
      console.log("WebSocket connected for live logs");

      // 💡 MODIFICATION: Send the subscription message with ONLY the criteriaFileKey
      const subscriptionMessage = {
        action: "subscribeToLogs", // Action your backend should handle
        criteriaFileKey: criteriaKey, // ONLY send the criteriaKey
        // policyFileKeys is REMOVED
      };
      socket.send(JSON.stringify(subscriptionMessage));
      console.log(`Sent single-file subscription message for process: ${criteriaKey}`);
    };

    socket.onmessage = (event) => {
      try {
        // The message is often a JSON string from AWS API Gateway/Lambda
        const data = JSON.parse(event.data);
        const logMessage = data.message || JSON.stringify(data);

        // Add the new log to the state
        setLiveLogs((prevLogs) => [...prevLogs, logMessage]);
      } catch (e) {
        // Fallback for plain text messages
        setLiveLogs((prevLogs) => [...prevLogs, event.data]);
        console.warn("Received non-JSON message from WebSocket.");
      }
    };

    socket.onerror = (error) => {
      setWsStatus("Error");
      console.error("WebSocket Error:", error);
    };

    socket.onclose = () => {
      setWsStatus("Disconnected");
      console.log("WebSocket closed.");
      // In a real application, you'd add reconnection logic here.
    };

    // Cleanup: Close the WebSocket connection when the component unmounts OR when shouldConnect changes to false
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };

 }, [shouldConnect, criteriaKey]); // Removed policyKeys from dependency array

  const agentSteps = [
    "Upload Agent",
    "Data Ingestion Agent",
    "Textractor Agent",
    "Draft Doc Generator Agent",
    "Finalizing Results",
  ];

  return (
    <div className="description-box">
      {!fileName ? (
        <h3 className="agent-description">Please upload a file to begin</h3>
      ) : (
        <>
          <h3 style={{ color: "#000048", letterSpacing: "1px" }}>
            Agent in Action...
          </h3>
          {messages.length > 0 && <h3>Progress :</h3>}
          <div className="progress-container">
            <div
              className="progress-bar"
              style={{
                // Ensure progress is read directly from state for single-file
                width: `${state.progress}%`, 
              }}
            >
              <span className="progress-text">{state.progress}%</span>
            </div>
          </div>

          {/* Radio buttons */}
          <div className="status-buttons">
            <label>
              <input
                type="radio"
                name="status"
                checked={isProcessing && !error}
                readOnly
              />
              Running
            </label>
            <label>
              <input type="radio" name="status" checked={!!error} readOnly />
              Error
            </label>
          </div>
          <div className="logs-container">
            {/* {messages.length > 0 && <h4>Message logs:</h4>} */}
            {/* {messages.map((msg, index) => (
              <p key={index}>
                <span className="text">{msg}</span>
              </p>
            ))} */}
            {liveLogs.length > 0 && (
              <h4>Live Commentary: (Status: {wsStatus})</h4>
            )}
            {/* Display the live logs, reversed so the newest message is at the top */}
            <div
              className="live-logs-scroll"
              style={{
                maxHeight: "200px",
                overflowY: "auto",
                border: "1px solid #eee",
                padding: "5px",
                marginBottom: "10px",
              }}
            >
              {liveLogs
                .slice()
                .reverse()
                .map((log, index) => (
                  <p
                    key={`live-${index}`}
                    style={{ margin: "3px 0", fontSize: "0.9em" }}
                  >
                    <span style={{ fontWeight: "bold" }}>
                      [{new Date().toLocaleTimeString()}]
                    </span>{" "}
                    {log}
                  </p>
                ))}
            </div>

            <div className="task-queue">
              <h4>Task Queue:</h4>
              {isProcessing ? (
                currentStep < agentSteps.length - 1 ? (
                  <p style={{ fontWeight: "500" }}>
                    ⏭️ {agentSteps[currentStep + 1]}
                  </p>
                ) : (
                  <p style={{ fontWeight: "500" }}>
                    ⏭️ {agentSteps[currentStep]}
                  </p>
                )
              ) : (
                <p style={{ fontWeight: "bold" }}>✅ All tasks completed!</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DescriptionBox;
