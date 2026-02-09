import React, { useState, useRef, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import successIcon from "../assets/success-tick.svg";
import UploadIcon from "../assets/upload.svg";
import "./FileUpload.css";
import axios from "axios";

const MAX_FILE_SIZE_MB = 15;

const FileUpload = ({
  title = "Doc Generator",
  multiple = false,
  onFileSelect, // callback to send files to parent(Dashboard)
  type = "single",
}) => {
  const { state, dispatch } = useAppContext();
  const fileInputRef = useRef(null);
  const [fileSizeMB, setFileSizeMB] = useState(null);
  const timersRef = useRef([]);
  const [showSuccessUI, setShowSuccessUI] = useState(false);
  const uploadType = type === "single" ? "SINGLE" : "MULTI";
  const uploaderState =
    type === "single" ? state.singleUpload : state.multiUpload;

  const startProcessing = (fileName) =>
    dispatch({ type: `START_PROCESSING_${uploadType}`, payload: { fileName } });

  const addMessage = (text) => dispatch({ type: "ADD_MESSAGE", payload: text });
  const setNarrative = (text) =>
    dispatch({ type: "SET_NARRATIVE", payload: text });
  const setError = (text) => dispatch({ type: "SET_ERROR", payload: text });
  const resetAll = () => dispatch({ type: "RESET" });

  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => clearTimeout(id));
      timersRef.current = [];
    };
  }, []);

  const clearAllTimers = () => {
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];
  };



  const handleFileChange = (e) => {
    const files = multiple ? e.target.files : [e.target.files[0]];
    if (!files || files.length === 0) return;

    // //Passing files back to parent
    // if (multiple) onFileSelect && onFileSelect(files);
    // else onFileSelect && onFileSelect(files[0]);
    // Pass files back to parent
    if (multiple) {
      onFileSelect && onFileSelect(files);

      // Dispatch **all file names** to context
      const fileNames = Array.from(files).map((f) => f.name);
      dispatch({
        type: "START_PROCESSING_MULTI",
        payload: { fileName: fileNames },
      });
    } else {
      onFileSelect && onFileSelect(files[0]);
      dispatch({
        type: "START_PROCESSING_SINGLE",
        payload: { fileName: files[0].name },
      });
    }

    clearAllTimers();
    // resetAll();
    dispatch({ type: `RESET_${uploadType}` });
    dispatch({ type: "SET_PROGRESS", payload: 0 });
    dispatch({ type: "SET_FINISHED", payload: false });
    dispatch({ type: "SET_SUCCESS", payload: false });

    const file = files[0];
    const lower = file.name.toLowerCase();
    const isAccepted =
      lower.endsWith(".pdf") ||
      lower.endsWith(".doc") ||
      lower.endsWith(".docx");

    if (!isAccepted) {
      dispatch({
        type: `SET_ERROR_${uploadType}`,
        payload: "Only PDF and DOC/DOCX files are allowed.",
      });
      // setError("Only PDF and DOC/DOCX files are allowed.");
      fileInputRef.current.value = "";
      // Clear input so user can re-upload same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    const sizeMB = file.size / (1024 * 1024);
    setFileSizeMB(sizeMB.toFixed(2));
    if (sizeMB > MAX_FILE_SIZE_MB) {
      // setError("File too large. Maximum size is 15 MB.");
      dispatch({
        type: `SET_ERROR_${uploadType}`,
        payload: "File too large. Maximum size is 15 MB.",
      });
      fileInputRef.current.value = "";
      return;
    }

    // startProcessing(file.name);
    // Start processing state
    // dispatch({
    //   type: `START_PROCESSING_${uploadType}`,
    //   payload: { fileName: file.name },
    // });
    // startProcessing(file.name);
    addMessage("🕹️ Agent Kicked off...");
    addMessage("📤 Uploading file...");

    dispatch({ type: `UPLOAD_SUCCESS_${uploadType}` });
  };

  const resetUpload = () => {
    // clearAllTimers();
    // resetAll();
    dispatch({ type: "SET_SUCCESS", payload: false });
    dispatch({ type: "SET_FINISHED", payload: false });
    setShowSuccessUI(false);
    dispatch({ type: "SET_PROGRESS", payload: 0 });
    if (fileInputRef.current) fileInputRef.current.value = "";
    dispatch({ type: `SET_ERROR_${uploadType}`, payload: null });
    dispatch({ type: `UPLOAD_SUCCESS_${uploadType}`, payload: false });
    // dispatch({
    //   type: `START_PROCESSING_${uploadType}`,
    //   payload: { fileName: null },
    // });

    setFileSizeMB(null);
  };

  const renderUploadContent = () => {
    // if (state.success || showSuccessUI) {
    if (uploaderState.success || showSuccessUI) {
      return (
        <div className="upload-content">
          <img src={successIcon} alt="success Icon" className="logo-img-f" />

          <p className="success-text">File Uploaded Successfully</p>
          <button className="reset-upload" onClick={resetUpload}>
            Upload another file
          </button>
          {/* <p className="file-name">{uploaderState.fileName}</p> */}
          {uploaderState.fileName?.length > 0 && (
            <ul className="file-names">
              {uploaderState.fileName.map((name, i) => (
                <li key={i}>{name}</li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    // if (state.error) {
    if (uploaderState.error) {
      return (
        <div className="upload-content">
          <p className="error-text">{uploaderState.error}</p>
          <button onClick={resetUpload} className="reset-button">
            Try again
          </button>
        </div>
      );
    }

    // if (state.isProcessing) {
    if (uploaderState.isProcessing) {
      return (
        <div className="upload-content">
          <div className="spinner" />
          <p className="upload-text">Uploading...</p>
          {/* {uploaderState.fileName && (
            <p className="file-name">{uploaderState.fileName}</p>
          )} */}
        </div>
      );
    }

    return (
      <div className="upload-content">
        <img src={UploadIcon} alt="Upload Icon" className="upload-img" />
        <p className="main-text">Drag and Drop or Browse File</p>
      </div>
    );
  };

  return (
    <div className="file-upload-container">
      <div className="upload-wrapper">
        <div className="upload-label"> {title}</div>
        <div className="upload-box">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.json"
            multiple={multiple}
            onChange={handleFileChange}
            className="file-input"
          />
          {renderUploadContent()}
        </div>

        <div className="upload-info-row">
          {uploaderState.fileName ? (
            <p className="support-text left-info">File Size: {fileSizeMB} MB</p>
          ) : (
            <p className="support-text left-info">Supported Format: PDF, DOC</p>
          )}
          <p className="support-text right-info">Maximum Size: 15 MB</p>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
