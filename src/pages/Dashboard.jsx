

// THIS FILE IS NOT BEING USED BUT KEPT AS A BACKUP OF OLD CODE WHEN IT WAS OPERATIONAL
// WOULD BE REMOVING THIS FILE WHEN EVERYTHING IS FINALIZED

import React, { useContext, useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import FileUpload from "../components/FileUpload";
import NarrativeBox from "../components/NarrativeBox";
import DescriptionBox from "../components/DescriptionBox";
import "./Dashboard.css";
import CognizantLogo from "../assets/cognizant-logo.svg";
import CognizantTitle from "../assets/cognizant-title.svg";

const AGENTS = [
  // { id: 'upload', label: 'Uploader Agent' },
  { id: "dashboard", label: "Dashboard" },
  { id: "data", label: "Data Ingestion Agent" },
  { id: "preprocessor", label: "Textractor Agent" },
  { id: "doc", label: "Draft Doc Generator Agent" },
];

const UPLOAD_URL =
  "https://i340k5fce3.execute-api.us-west-2.amazonaws.com/devlopment/upload_reretive";

const DOC_GENERATOR_URL =
  "https://ttk2sstsyd.execute-api.us-west-2.amazonaws.com/Development/Retrieve_policy";

// MULTI_URL is removed as it's no longer needed

const Dashboard = () => {
  const { state, dispatch } = useAppContext();
  const [singleFile, setSingleFile] = useState(null);
  // const [multiFiles, setMultiFiles] = useState([]); // Removed
  const [singleStatus, setSingleStatus] = useState("");
  // const [multiStatus, setMultiStatus] = useState(""); // Removed
  const setError = (text) => dispatch({ type: "SET_ERROR", payload: text });
  const addMessage = (text) => dispatch({ type: "ADD_MESSAGE", payload: text });

  // Function to handle file selection for multi-upload (REMOVED)
  // const handleMultiFiles = (files) => { ... }

  // Sync current step with sidebar agent selection
  useEffect(() => {
    const stepToAgent = {
      0: "dashboard",
      1: "data",
      2: "preprocessor",
      3: "doc",
      4: "dashboard", // Final Destination
    };

    if (typeof state.currentStep === "number") {
      dispatch({
        type: "SET_SELECTED_AGENT",
        payload: stepToAgent[state.currentStep],
      });
    }
  }, [state.currentStep, dispatch]);

  // --- MODIFIED FUNCTION: TRIGGERS FINAL DOC GENERATION API ---
  // It no longer expects multiUploadResult, but uses existing policy keys in context (if applicable) or a placeholder.
  // NOTE: The payload structure assumes policy keys are somehow available or hardcoded, 
  // which might need adjustment based on the backend API's actual single-file requirement.
  const triggerDocGeneration = async (criteriaFileKey) => {
    const setNarrative = (text) =>
      dispatch({ type: "SET_NARRATIVE", payload: text });
    try {
      addMessage("📄 Extracting Insights...");
      dispatch({ type: "SET_CURRENT_STEP", payload: 2 }); // Textractor Agent step

      // Assuming policy keys are either not needed or pre-configured/hardcoded for single file mode.
      // For the purposes of this modification, we'll use a placeholder or rely on backend default.
      // If the backend *requires* policy keys, you'll need another way to obtain them.
      const processedKeys = state.policyFileKeys || ["policy/default_policy_file.pdf"]; 
      dispatch({ type: "SET_POLICY_FILE_KEYS", payload: processedKeys });

      // payload for DOC_GENERATOR_URL - Simplified for single input file
      const docPayload = {
        Records: [
          {
            eventVersion: "2.1",
            eventSource: "aws:s3",
            awsRegion: "us-west-2",
            eventTime: "2025-09-12T10:00:00.000Z",
            eventName: "ObjectCreated:Put",
            s3: {
              bucket: {
                name: "policydocs-bucket",
                arn: "arn:aws:s3:::policydocs-bucket",
              },
              object: {
                // Criteria File Key
                key: `input/${criteriaFileKey}`, 
                size: 123456,
              },
            },
          },
          {
            eventVersion: "2.1",
            eventSource: "aws:s3",
            awsRegion: "us-west-2",
            eventTime: "2025-09-12T10:05:00.000Z",
            eventName: "ObjectCreated:Put",
            s3: {
              bucket: {
                name: "policydocs-bucket",
                arn: "arn:aws:s3:::policydocs-bucket",
              },
              object: {
                // Multi Policy Files Key - Now using simplified/placeholder key
//                 "key": processedKeys, 
                   "key" : ["preprocess_policy_pdfs/1_BANK_LOAN_DOC.txt"],
                size: 5000000,
              },
            },
          },
        ],
      };

      dispatch({ type: "SET_PROGRESS", payload: 80 });
      dispatch({ type: "SET_CURRENT_STEP", payload: 3 }); // Draft Doc Generator Agent
      addMessage("📄 Generating document...");
        
      // Final API Call
      const docResponse = await fetch(DOC_GENERATOR_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(docPayload),
      });

      if (!docResponse.ok) {
        throw new Error(`Document generation failed: ${docResponse.status} ${docResponse.statusText}`);
      }

      const docData = await docResponse.json();
        
      // Typewriter effect for displaying response
      const finalText = docData?.body || JSON.stringify(docData, null, 2);
      let currentText = "";
      let index = 0;
      const speed = 2; // ms per character
      setNarrative("");
      dispatch({ type: "SET_CURRENT_STEP", payload: 4 });

      const intervalId = setInterval(() => {
        currentText += finalText.charAt(index);
        dispatch({
          type: "SET_NARRATIVE",
          payload: {
            tab: state.activeResponseTab,
            text: currentText,
          },
        });
        index++;
        if (index >= finalText.length) {
          clearInterval(intervalId);
          dispatch({ type: "SET_FINISHED", payload: true });
        }
      }, speed);

      dispatch({ type: "SET_PROGRESS", payload: 100 });
      addMessage("✅ Agent report is ready...");
      dispatch({ type: "UPLOAD_SUCCESS" });
    } catch (err) {
      const msg = err?.message || "Document generation failed";
      setError(msg);
      addMessage(`❌ ${msg}`);
      dispatch({ type: "SET_CURRENT_STEP", payload: 4 });
      dispatch({ type: "SET_PROGRESS", payload: 100 });
      throw err; // Re-throw to be caught by handleSubmit
    }
  };


  // --- UNMODIFIED: UPLOADS SINGLE FILE AND RETURNS KEY ---
  const uploadSingleFile = async (file) => {
    if (!file) return;

    try {
      // Convert file to Base64
      const base64File = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve(reader.result.split(",")[1]); // Remove data:application/pdf;base64, prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Build JSON payload
      const payload = {
        fileName: file.name, // original PDF name
        fileType: file.type, // e.g., "application/pdf"
        body: base64File, // Base64-encoded file content
      };
      
      addMessage("⬆️ Uploading Criteria file...");
      dispatch({ type: "SET_CURRENT_STEP", payload: 1 }); // Data Ingestion Agent
      dispatch({ type: "SET_PROGRESS", payload: 10 });

      const res = await fetch(UPLOAD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Criteria file upload failed: ${res.status} ${res.statusText}`);
      }

      const responseData = await res.json();
      dispatch({ type: "SET_PROGRESS", payload: 40 });
      addMessage("✅ Criteria file uploaded successfully.");
      
      // Return the file key needed for the final document generation payload
      const criteriaFileKey = JSON.parse(responseData.body).file_name;
        dispatch({ type: "SET_CRITERIA_FILE_KEY", payload: criteriaFileKey });
      return criteriaFileKey;
    } catch (err) {
      const msg = err?.message || "Criteria file upload failed";
      setError(msg);
      addMessage(`❌ ${msg}`);
      throw err; // Re-throw the error to be caught by handleSubmit
    }
  };

  // uploadMultiFiles is REMOVED

  // --- MODIFIED FUNCTION: SIMPLIFIED TO SINGLE UPLOAD ONLY ---
  const handleSubmit = async () => {
    if (!singleFile) {
      setError(
        "⚠️ Please upload the mandatory Criteria file before submitting."
      );
      dispatch({ type: "ADD_MESSAGE", payload: "❌ Required file missing." });
      return;
    }
    try {
      // Reset UI State
      dispatch({ type: "CLEAR_MESSAGES" }); 
      dispatch({ type: "SET_ERROR", payload: null });
      dispatch({ type: "SET_PROGRESS", payload: 0 });
      dispatch({ type: "SET_NARRATIVE", payload: { tab: 'default', text: '' } });
      dispatch({ type: "SET_FINISHED", payload: false });
        
      addMessage("Starting file submission process...");

      // 1. Run the single file upload and wait for it to complete
      const criteriaKey = await uploadSingleFile(singleFile); // Returns unique file key string

      addMessage("✅ Criteria file successfully uploaded. Initiating document generation pipeline...");

      // 2. If the upload is successful, trigger the final API
      if (criteriaKey) {
        await triggerDocGeneration(criteriaKey);
      } else {
        throw new Error("Missing required file key after upload. Cannot proceed to document generation.");
      }
    } catch (err) {
      console.error("❌ Error in file submission process", err);
      const msg = err?.message || "Final submission failed due to an unknown error.";
      // Error handling is already done in individual upload functions, but we ensure final failure is shown.
      setError(msg);
      addMessage(`❌ Final process halted: ${msg}`);
      dispatch({ type: "SET_CURRENT_STEP", payload: 4 });
      dispatch({ type: "SET_PROGRESS", payload: 100 });
    }
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar remains the same */}
      <aside className="sidebar">
        {/* ... (omitted for brevity) */}
        <div className="logo-wrap">
          <img src={CognizantLogo} alt="Cognizant Logo" className="logo-img" />
          <img
            src={CognizantTitle}
            alt="Cognizant Title"
            className="title-img"
          />
        </div>

        <nav className="sidebar-nav">
          <ul>
            {AGENTS.map((a) => {
              const isActive = a.id === state.selectedAgent;
              return (
                <li
                  key={a.id}
                  className={`sidebar-item ${isActive ? "active" : ""}`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    dispatch({ type: "SET_SELECTED_AGENT", payload: a.id })
                  }
                >
                  <span className="square" aria-hidden />
                  <span className="item-label">{a.label}</span>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <main className="main-content">
        <h2 className="main-sar-title">Doc Generator</h2>
        <div className="fileUpload-row">
          <FileUpload
            type="single"
            title="Criteria Uploader"
            className="criteria-uploader"
            setSelectedAgent={state.setSelectedAgent}
            multiple={false}
            onFileSelect={setSingleFile}
            status={singleStatus}
          />
          {/* The multi-file FileUpload component is REMOVED */}
        </div>
        <button
          className="api-btn"
          onClick={handleSubmit}
          // Only checks for singleFile now
          disabled={!singleFile} 
        >
          Submit
        </button>

{/*         <DescriptionBox selectedAgent={state.selectedAgent} /> */}
{/*         <NarrativeBox selectedAgent={state.selectedAgent} /> */}
      </main>
    </div>
  );
};

export default Dashboard;