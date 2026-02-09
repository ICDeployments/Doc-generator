import React, { useState, useEffect, useRef } from "react";
import "./SArNarrative.css";
import { useAppContext } from "../context/AppContext";
import copyIcon from "../assets/copy.svg";
import downloadIcon from "../assets/download.svg";
import jsPDF from "jspdf";
import greenTick from "../assets/success-tick.svg";
import "pdfmake/build/vfs_fonts";

const SArNarrative = () => {
  const { state, dispatch } = useAppContext();
  const currentNarrative = state?.narratives?.[state.activeResponseTab] || "";
  const [copied, setCopied] = useState(false);
  const [localText, setLocalText] = useState(currentNarrative);
  const editableRef = useRef(null);
  const endRef = useRef(null);
  const [status, setStatus] = useState("");
  const uploadedFileNames = state.multiUpload?.fileName || [];
  // console.log("multi", uploadedFileNames)
 console.log("currentNarrative", currentNarrative);
  const handleCopy = () => {
    navigator.clipboard.writeText(currentNarrative);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    setLocalText(currentNarrative || "");
  }, [state.activeResponseTab, currentNarrative]);

  useEffect(() => {
    const container = editableRef.current?.parentElement; // ✅ the .sar-narrative-box
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [currentNarrative]);

  useEffect(() => {
    const container = document.querySelector(".sar-narrative-box");
    if (container) container.scrollTop = container.scrollHeight;
  }, [currentNarrative]);

  const formatNarrative = (text) => {
    if (!text) return null;

    // Split text by newline
    return text.split("\n").map((line, idx) => {
      // Check if line starts with **-
      if (line.startsWith("**-") || line.startsWith("**")) {
        return (
          <div
            key={idx}
            style={{
              fontWeight: "700",
              // color: "#6D6D6D",
              // color: "#2563EB",
              color: "#000048",
              marginTop: "5px",
              marginBottom: "5px",
            }}
          >
            {line.replace("**-", "") && line.replace("**", "")}
            {/* {line.replace(".**", ".")}  */}
            {/* remove the ** for display */}
          </div>
        );
      }

      // Check if line starts with single dash (-)
      if (line.startsWith("-")) {
        return (
          <div key={idx} style={{ marginLeft: "10px", marginBottom: "8px" }}>
            {line}
          </div>
        );
      }

      // normal text
      return (
        <div key={idx} style={{ marginBottom: "5px", marginTop: "3px" }}>
          {line}
        </div>
      );
    });
  };

  const handleApprove = () => {
    setStatus("approved");
  };

  const handleReject = () => {
    setStatus("rejected");
  };

  // Download as PDF

  const handleDownload = () => {
    const doc = new jsPDF();
    const marginLeft = 14;
    const lineHeight = 7;
    const pageHeight = doc.internal.pageSize.height;

    // --- HEADER ---
    doc.setFontSize(16).setFont("helvetica", "bold");
    doc.text("DOC GENERATOR REPORT", 105, 15, { align: "center" });

    doc.setFontSize(11).setFont("helvetica", "normal");
    doc.text("Generated Date: " + new Date().toLocaleDateString(), 105, 25, {
      align: "center",
    });

    let y = 40;

    // --- SPLIT LINES ---
    const lines = (localText || currentNarrative || "")
      .split("\n")
      // .filter((l) => l.trim() !== "");
      .filter((l) => l.trim() !== "" && !l.startsWith(">>> Old Content:")); // ✅ 1. EXCLUDE Old Content for download

    lines.forEach((rawLine) => {
      let line = rawLine;
      let fontSize = 11;
      let fontStyle = "normal";
      let color = [17, 24, 39]; // default almost black
      let indent = marginLeft;

      // --- Special handling for ** markers ---
      if (line.startsWith("**-") || line.startsWith("**")) {
        fontSize = 12;
        fontStyle = "bold";
        color = [0, 0, 72]; // #000048 dark blue
        line = line.replace(/^\*\*-/, "").replace(/^\*\*/, ""); // remove ** or **-
      } else if (line.startsWith("-")) {
        fontSize = 11;
        fontStyle = "normal";
        color = [55, 65, 81]; // gray
      }

      // --- Wrap long lines ---
      doc
        .setFont("helvetica", fontStyle)
        .setFontSize(fontSize)
        .setTextColor(...color);

      const wrapped = doc.splitTextToSize(line, 180);

      // --- Page break handling ---
      if (y + wrapped.length * lineHeight > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }

      doc.text(wrapped, indent, y);
      y += wrapped.length * lineHeight + 2;
    });

    // --- SAVE PDF ---
    doc.save("DOC_Generator_Report.pdf");
  };

  useEffect(() => {
    const headings = {
      0: "Dashboard OVerview",
      1: "Preprocessor Output",
      2: "SAR Narrative Report",
      3: "Evaluator Report",
      4: "Formatter Agent Report",
      5: "Dashboard Overview",
    };

    if (state.completedStep) {
      dispatch({
        type: "SET_ACTIVE_HEADING",
        payload: headings[state.completedStep] || "SAR Narrative Report",
      });
    }
  }, [state.completedStep]);

  const Default_text =
    "Draft Version Report would be generated here once processing is complete.";

  return (
    <div className="sar-narrative-container">
      {/* 🎯 The simple UI display at the beginning */}
      {/* {uploadedFileNames.length > 0 && currentNarrative && (
        <div className="uploaded-files-info">
          The following draft is the updated version of File:{" "}
          <span style={{ color: "#000048" }}>{uploadedFileNames} </span>
        </div>
      )} */}
      <div className="sar-narrative-box">
        {/* <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}> */}
        <div className="default_text">
          {formatNarrative(currentNarrative || Default_text)}

          {status === "approved" && (
            <div style={{ textAlign: "center", padding: "20px" }}>
              <img
                src={greenTick}
                alt="Approved"
                style={{ width: "40px", marginBottom: "10px" }}
              />
              <div style={{ color: "green", fontWeight: "bold" }}>
                -- The content has been approved and saved.
              </div>
            </div>
          )}
          {status === "rejected" && (
            <div style={{ textAlign: "center", padding: "20px" }}>
              <img
                src={redCross}
                alt="Rejected"
                style={{ width: "40px", marginBottom: "10px" }}
              />
              <div style={{ color: "red", fontWeight: "bold" }}>
                -- The content has been rejected.
              </div>
            </div>
          )}
        </div>
        <div ref={endRef} />
      </div>
      {
        <div className="sar-narrative-actions">
          {/* Group 1: Left End (Copy and Download) */}
          <div className="action-group-left">
            <button onClick={handleCopy} disabled={!state.finished}>
              <img src={copyIcon} alt="Copy" />
            </button>
            <button
              className="downloadBtn"
              onClick={handleDownload}
              disabled={!state.finished}
            >
              <img src={downloadIcon} alt="Download" />
            </button>
          </div>

          {/* Group 2: Right End (Approve and Reject) */}
          <div className="action-group-right">
            <button
              className="approve-btn"
              disabled={!state.finished || status === "rejected"}
              onClick={handleApprove}
            >
              ✅ Approve
            </button>
            <button
              className="reject-btn"
              disabled={!state.finished || status === "approved"}
              onClick={handleReject}
            >
              ❌ Reject
            </button>
          </div>
        </div>
      }
    </div>
  );
};

export default SArNarrative;




































