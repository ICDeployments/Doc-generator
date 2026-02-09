//both dashnew and old integrated -
import React, { useState, useRef } from "react";
import "./DashboardNew.css";
import ProductDetailsModal from "./ProductDetailsModal";
import { AiActivityPanel } from "./useLiveAgentLogs";
import { useAppContext } from "../context/AppContext"; 
import { uploadSingleFile, triggerDocGeneration } from "./ApiService"; 
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const MAX_FILE_SIZE_MB = 15;
const clearAllTimers = () =>
  console.log("Timer cleanup (mock): Timers cleared.");
const ProductTile = ({ product, onOpenModal, onStartAgent, activeAgentProductId, onExportPdf }) => {

  const isExportPdfDisabled = (actionLabel) => {
    return (
      actionLabel === "Export PDF" &&
      activeAgentProductId !== null &&
      product.id !== activeAgentProductId
    );
  };

  const statusStyle = {
    processing: {
      bg: "rgba(255, 232, 163, 0.2)",
      text: "#856404",
      border: "#ffe8a3",
    },
    approved: {
      bg: "rgba(212, 237, 218, 0.5)",
      text: "#155724",
      border: "#d4edda",
    },
    pending: {
      bg: "rgba(255, 243, 205, 0.5)",
      text: "#856404",
      border: "#fff3cd",
    },
  }[product.status] || { bg: "#f9fafb", text: "#4b5563", border: "#e5e7eb" };

  const handleActionClick = (action, e) => {
    e.stopPropagation();

    // Prevent action if disabled
    if (isExportPdfDisabled(action.label)) {
      console.log("Export PDF is disabled because another agent is running.");
      return;
    }

    if (action.label === "Start") {
      // **ACTION:** Call the agent trigger function
      onStartAgent(product);
      // **ACTION:** Open the modal (existing functionality)
      // onOpenModal(product);
    } 
    // ✨ NEW LOGIC: Check for 'Export PDF' action
    else if (action.label === "Export PDF") {
       
        onExportPdf(product.id); 
    }
    else {
      console.log("Else block");
    }
  };

  return (
    <div
      className={`product-tile ${product.status}`}
      style={{ borderTopColor: statusStyle.border }}
      // onClick={() => onOpenModal(product)}
    >
      <div className="product-header">
        <div>
          <div className="product-title">{product.title}</div>
          <div
            className={`product-market ${
              product.market === "Market" ? "is-market" : "is-productmarket"
            }`}
          >
            Market: {product.market}
          </div>
        </div>
        <span
          className={`product-status status-${product.status}`}
          style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
        >
          {product.statusText}
        </span>
      </div>

     
      <p className="product-description">{product.description}</p>

      <div className="product-actions">
        {product.actions.map((action, index) => {
          // Determine if this specific button should be disabled
          const isDisabled = isExportPdfDisabled(action.label);

          return (
            <button
              key={index}
              className={action.primary ? "btn btn-primary" : "btn btn-secondary"}
              onClick={(e) => handleActionClick(action, e)}
              // ✨ NEW ATTRIBUTE: Conditionally disable the button
              disabled={isDisabled}
              // Optional: Add a CSS class for visual feedback when disabled
              style={isDisabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};


// Main App Component
export default function App() {
  
  const { state, dispatch } = useAppContext(); // Correctly using the context
  const [criteriaFile, setCriteriaFile] = useState(null);
  const [selectedMarket, setSelectedMarket] = useState("India");
  const [activeFilter, setActiveFilter] = useState("All");
  const [modalProduct, setModalProduct] = useState(null);
  const [fileSizeMB, setFileSizeMB] = useState(null);
  const [showSuccessUI, setShowSuccessUI] = useState(false); // To control success UI locally
  const fileInputRef = useRef(null);

const approvedContentsMap = state.approvedContents || {};
  // State to control the visibility of the modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  // ✨ NEW STATE: To control the dashboard's disabled state
    const [isMainAreaDisabled, setIsMainAreaDisabled] = useState(false);
// ✨ NEW STATE: Tracks the ID of the product currently running the agent
    const [activeAgentProductId, setActiveAgentProductId] = useState(null);

const uploadType = "SINGLE";
  const uploaderState = state.singleUpload;
  const productsData = [
    // ... (Your productsData)
    {
      id: 1,
      title: "Loan",
      value: "loan",
      market: selectedMarket,
      meta: "Started: 2 mins ago",
      status: "processing",
      aiBadge: "⚡ AI Agent Active",
      description:
        "The AI extracts key financial data and collateral details for contract drafting.",
      actions: [
        { label: "Start", primary: true },
        { label: "Export PDF", primary: false },
      ],
    },
    {
      id: 2,
      title: "Insurance",
      value: "Insurance",
      market: selectedMarket,
      meta: "Last updated: 1 day ago",
      status: "approved",
      aiBadge: "⚡ AI Agent Active",
      description:
        "The AI parses policy terms and claim reports to quickly validate coverage and recommend payouts.",
      actions: [
        { label: "Start", primary: true },
        { label: "Export PDF", primary: false },
      ],
    },
    {
      id: 3,
      title: "Credit Cards",
      value: "Credit_Cards",
      market: selectedMarket,
      meta: "Started: 5 mins ago",
      status: "processing",
      aiBadge: "⚡ AI Agent Active",
      description:
        "The AI verifies identity and income for quick approval decisions.",
      actions: [
        { label: "Start", primary: true },
        { label: "Export PDF", primary: false },
      ],
    },
    {
      id: 4,
      title: "Securities & Deposits",
      value: "Securities_&_Deposits",
      market: selectedMarket,
      meta: "Last updated: 5 days ago",
      status: "approved",
      aiBadge: "⚡ AI Agent Active",
      description:
        "The AI analyzes KYC and regulatory documents to ensure compliance and automate account setup..",
      actions: [
        { label: "Start", primary: true },
        { label: "Export PDF", primary: false },
      ],
    },
  ];

  //for sending the finalresponsedata to modal file
  
  const draftReportContent =
    state.generatedDocument?.draft || [];
  const earlierPolicyContent =
    state.generatedDocument?.earlierPolicy ||
    "No earlier policy data available.";

 const handleDownload = (productId) => {
    const productSpecificContent = approvedContentsMap[productId];
    let finalContent = productSpecificContent;

    if (!finalContent) {
      console.error(
        `No final approved content available for product ID: ${productId}. Cannot download.`
      );
      return;
    }

    const doc = new jsPDF();
    const marginLeft = 14;
    const lineHeight = 7;
    const pageHeight = doc.internal.pageSize.height;
    let y = 40;

    // --- HEADER ---
    doc.setFontSize(18).setFont("helvetica", "bold");
    doc.text("DOC GENERATOR REPORT", 105, 15, { align: "center" });

    doc.setFontSize(11).setFont("helvetica", "normal");
    doc.text("Generated Date: " + new Date().toLocaleDateString(), 105, 25, {
      align: "center",
    });

    // --- PDF Content Setup ---
    let inDefinitionsTable = false;
    let definitionsTableData = [];
    let inApprovalRecordTable = false;
    let approvalRecordTableData = [];

    // Helper function to split a line by the first occurrence of 2+ spaces or a tab
    const splitTableLine = (line) => {
      // Find the index of the first tab OR where 2 or more spaces occur
      const tabIndex = line.indexOf("\t");
      const multipleSpaceMatch = line.match(/\s{2,}/);
      const splitIndex =
        tabIndex !== -1 &&
        (multipleSpaceMatch === null || tabIndex < multipleSpaceMatch.index)
          ? tabIndex
          : multipleSpaceMatch
          ? multipleSpaceMatch.index
          : -1;

      if (splitIndex !== -1) {
        const term = line.substring(0, splitIndex).trim();
        const definition = line.substring(splitIndex).trim();
        if (term && definition) return [term, definition];
      }
      return [line.trim(), ""]; // Fallback if no clean split is found
    };

    const lines = (finalContent || "")
      .split("\n")
      .filter((l) => l.trim() !== "" && !l.startsWith(">>> Old Content:"))
      .filter(
        (l) => l.trim() !== "" && !l.startsWith(">>> Reason for Change:")
      );

    lines.forEach((rawLine) => {
      let line = rawLine;

      if (line.trim().startsWith("Cognizant BFS Bank")) {
        doc.setFontSize(16).setFont("helvetica", "bold").setTextColor(0, 0, 72);
        doc.text(line.trim(), 105, y, { align: "center" });
        y += lineHeight;
        return;
      } // Skip empty lines

      // --- 1. NEW LOGIC: Document Metadata/Header Lines ---
      if (line.trim().startsWith("Microfinance Loan Policy Document")) {
        // Document Title - centered and bold
        doc.setFontSize(14).setFont("helvetica", "bold").setTextColor(0, 0, 72);
        doc.text(line.trim(), 105, y, { align: "center" });
        y += lineHeight;
        return;
      } else if (
        line.trim().startsWith("Version") ||
        line.trim().startsWith("Effective Date") ||
        line.trim().startsWith("Approved By") ||
        line.trim().startsWith("Prepared By") ||
        line.trim().startsWith("Classification")
      ) {
        doc.setFontSize(10).setFont("helvetica", "bold").setTextColor(0, 0, 22);
        doc.text(line.trim(), 105, y, { align: "center" });
        y += lineHeight;
        return;
      }

      // --- 2. Table Logic (Definitions) ---

      // The logic for Definitions table remains here
      if (line.trim().startsWith("Term	Definition")) {
        inDefinitionsTable = true;
        return;
      } else if (
        inDefinitionsTable &&
        (line.trim().startsWith("Microfinance Loan") ||
          line.trim().startsWith("Household") ||
          line.trim().startsWith("Group Lending") )
          // line.trim().startsWith("Key Facts Statement (KFS)")
           
          // line.trim().startsWith("External Benchmark"))
      ) {
        const row = splitTableLine(line);
        if (row.length === 2) definitionsTableData.push(row);

        if ( line.trim().startsWith("Group Lending")) {
          inDefinitionsTable = false;

          // --- Render Definitions Table ---
          autoTable(doc, {
            startY: y,
            head: [["Term", "Definition"]],
            body: definitionsTableData,
            theme: "grid",
            headStyles: { fillColor: [20, 30, 90], textColor: 255 },
            margin: { left: marginLeft },
          });
          y = doc.lastAutoTable.finalY + 22;
        }
        return;
      }

      // --- 3. Table Logic (Approval Record) ---
      if (line.trim().startsWith("Version	Date	Approved By	Remarks")) {
        inApprovalRecordTable = true;
        return;
      } else if (
        inApprovalRecordTable &&
        (line.trim().startsWith("1.0") || line.trim().startsWith("2.0"))
      ) {
        const row = line
          .split("\t")
          .map((c) => c.trim())
          .filter((c) => c.length > 0);

        if (row.length >= 4) {
          const remarks = row.slice(3).join(" ");
          approvalRecordTableData.push([row[0], row[1], row[2], remarks]);
        }

        if (line.trim().startsWith("2.0")) {
          inApprovalRecordTable = false;

          // --- Render Approval Record Table ---
          autoTable(doc, {
            startY: y,
            head: [["Version", "Date", "Approved By", "Remarks"]],
            body: approvalRecordTableData,
            theme: "grid",
            headStyles: { fillColor: [20, 30, 90], textColor: 255 },
            margin: { left: marginLeft },
          });
          //  y = doc.autoTable.previous.finalY + 4; // Update y position after table
          y = doc.lastAutoTable.finalY + 22;
        }
        return;
      }

      // --- 4. Normal Text Line Processing (Cleanup) ---

      // Skip final internal header
      if (line.trim().startsWith("Final Approved Content for Product")) {
        return;
      }

      // Re-process line to clean up internal spaces for text wrapping, only if it's not table data
      line = rawLine.replace(/\s\s+/g, " ");

      let fontSize = 11;
      let fontStyle = "normal";
      let color = [17, 24, 39];
      let indent = marginLeft;

      // Logic for Headings (1., 2., 3., etc.)
      if (
        /^\d+\. [A-Za-z]/.test(line.trim()) ||
        /^\d+[A-Z]?\. [A-Za-z]/.test(line.trim())
      ) {
        fontSize = 12;
        fontStyle = "bold";
        color = [0, 0, 72];
        indent = marginLeft - 2;
      }
      // Logic for Bullet points (a), b), etc.)
      else if (/^[a-z]\) /.test(line.trim())) {
        fontSize = 11;
        fontStyle = "normal";
        color = [55, 65, 81];
        indent = marginLeft + 5;
      }

      // --- Wrap long lines ---
      doc
        .setFont("helvetica", fontStyle)
        .setFontSize(fontSize)
        .setTextColor(...color);

      const wrapped = doc.splitTextToSize(line, 180 - (indent - marginLeft));

      // --- Page break handling ---
      if (y + wrapped.length * lineHeight > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }

      doc.text(wrapped, indent, y);
      y += wrapped.length * lineHeight + (line.trim().endsWith(".") ? 2 : 4);
    });

    // --- SAVE PDF ---
    doc.save("Microfinance_Loan_Policy_V2.0.pdf");
  };



  const handleFileSelection = (file) => {
  };

  // Helper function for context
  const addMessage = (text) => dispatch({ type: "ADD_MESSAGE", payload: text });

  // Function to handle upload reset
  const resetUpload = () => {
    console.log("Resetting upload state clicked...");
    setShowSuccessUI(false);
    setFileSizeMB(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    // Reset the relevant state in context
    dispatch({ type: `SET_ERROR_${uploadType}`, payload: null });
    dispatch({ type: `UPLOAD_SUCCESS_${uploadType}`, payload: false });
    dispatch({ type: "SET_PROGRESS", payload: 0 });
    dispatch({
      type: `START_PROCESSING_${uploadType}`,
      payload: { fileName: null },
    }); // Resets isProcessing and fileName
  };
//  setTimeout(() => {
//  dispatch({ type: "CLEAR_PROCESS_KEYS" });
//  }, 0);

  // Functions to open and close the modal
  const openModal = (product) => {
      setModalProduct(product);
    setIsModalOpen(true); 
  };

  const closeModal = () => {
    setModalProduct(null);
    setIsModalOpen(false); // Close the modal UI
    setIsMainAreaDisabled(false); // Re-enable main area when modal is closed
  };

  const handleFileChange = (e) => {
    const files = [e.target.files[0]];
    if (!files[0]) return;

    const file = files[0];

    // --- Start: onFileSelect & Context Logic ---

    // 1. Pass file back (equivalent to onFileSelect)
    handleFileSelection(file);

    // 2. Clear timers and reset context for a fresh upload attempt
    clearAllTimers();
    dispatch({ type: `SET_ERROR_${uploadType}`, payload: null }); // Clear error first
    dispatch({ type: `UPLOAD_SUCCESS_${uploadType}`, payload: false });
    dispatch({ type: "SET_PROGRESS", payload: 0 });
    // Start processing with file name
    dispatch({
      type: `START_PROCESSING_SINGLE`,
      payload: { fileName: file.name },
    });

    // 3. Validation
    const lower = file.name.toLowerCase();
    // Updated accept attribute in input to include .xls, .xlsx, .json as well
    const isAccepted =
      lower.endsWith(".pdf") ||
      lower.endsWith(".doc") ||
      lower.endsWith(".docx") ||
      lower.endsWith(".xls") ||
      lower.endsWith(".xlsx") ||
      lower.endsWith(".json");

    if (!isAccepted) {
      dispatch({
        type: `SET_ERROR_SINGLE`,
        payload:
          "Unsupported file type. Allowed: PDF, DOC/DOCX, XLS/XLSX, JSON.",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const sizeMB = file.size / (1024 * 1024);
    setFileSizeMB(sizeMB.toFixed(2));
    if (sizeMB > MAX_FILE_SIZE_MB) {
      dispatch({
        type: `SET_ERROR_SINGLE`,
        payload: `File too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`,
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setCriteriaFile(file); // <-- Save the file here
    // 4. Initial messages and success state
    addMessage("🕹️ Agent Kicked off...");
    addMessage("📤 Uploading file...");
    dispatch({ type: `UPLOAD_SUCCESS_SINGLE` });
    setShowSuccessUI(true); // Manually show success UI if UPLOAD_SUCCESS_SINGLE sets isProcessing to true
    // --- End: onFileSelect & Context Logic ---
  };



  // **NEW FUNCTION: Handles the full API workflow when 'Start' is clicked**
  const handleStartAgent = async (product) => {
    // 1. **CRITICAL CHECK:** Ensure the user uploaded a criteria file first
    if (!criteriaFile) {
      dispatch({
        type: "SET_ERROR_SINGLE",
        payload: "Please upload a Criteria document before starting the agent.",
      });
      return;
    }

    setActiveAgentProductId(product.id);
    
    // ✨ NEW LINE: Disabling the main scroll area immediately upon starting the agent
    setIsMainAreaDisabled(true);
    
    // const productTitle = product.title; // ✨ NEW LINE: Capture the product title
    const productValue = product.value; //Kishore

    clearAllTimers();
    // dispatch({ type: "RESET_ALL" }); // Assuming you have a RESET_ALL or similar to clear messages, progress, etc.
    dispatch({
      type: "ADD_MESSAGE",
      payload: `🚀 Starting agent for: ${product.title}...`,
    });
   
    let criteriaKey = null;
    // 2. Create a dummy file for the upload API call.
    // NOTE: In a production app, the user would need to select a file here.

    try {
      // A. UPLOAD THE CRITERIA FILE
      dispatch({ type: "SET_CURRENT_STEP", payload: 0 }); // Start Step
      dispatch({
        type: "START_PROCESSING_SINGLE",
        payload: { fileName: criteriaFile.name },
      });

      // The actual upload service call
      criteriaKey = await uploadSingleFile(criteriaFile, dispatch, selectedMarket,productValue );

      if (criteriaKey) {
        dispatch({
          type: "SET_CRITERIA_FILE_KEY",
          payload: criteriaKey,
        });
      }

      // B. TRIGGER DOCUMENT GENERATION
      // Assuming criteriaKey is available, proceed to the second step
      // dispatch({ type: "SET_PROGRESS", payload: 40 });
      dispatch({
        type: "ADD_MESSAGE",
        payload: "✨ Criteria analyzed. Triggering document synthesis.",
      });

      const docData = await triggerDocGeneration(criteriaKey, state, dispatch, selectedMarket, productValue );

      let parsedDraft = [];
try {
    parsedDraft = JSON.parse(docData.body); 
} catch (e) {
    console.error("Error parsing docData.body JSON string:", e);
}

      // C. FINAL SUCCESS STATE
      dispatch({ type: "SET_CURRENT_STEP", payload: 4 });
      dispatch({ type: "UPLOAD_SUCCESS_SINGLE", payload: true }); // Marks process as complete
      dispatch({
        type: "ADD_MESSAGE",
        payload: "✅ Document generation complete. See activity panel.",
      });
      // Add a new dispatch to save the document content
      dispatch({
        type: "SET_GENERATED_DOC_CONTENT",
        payload: {
          draft: parsedDraft,
          earlierPolicy: docData.earlier_policy,
        },
      });
    setIsModalOpen(true);     // 💡 CRITICAL: Immediately opens the modal UI (with initial/loading data)
   setModalProduct(product); // Sets product data
    } catch (error) {
      console.error("Agent workflow failed:", error);
      // Error dispatching is handled inside the service functions, but we ensure it's logged.
      dispatch({ type: "SET_CURRENT_STEP", payload: 0 });
      setIsMainAreaDisabled(false); // Re-enable main area on error
      setActiveAgentProductId(null);
    }
  };
  // **END NEW FUNCTION**

  const renderUploadContent = () => {
    // Check for success/error states using the uploaderState from context
    if (uploaderState.success || showSuccessUI) {
      return (
        <div className="upload-content success-state">
          {/* Placeholder for success icon */}
          <span className="success-icon">✅</span>

          <p className="success-text">File Uploaded Successfully</p>
          <p className="file-name">
            {uploaderState.fileName && uploaderState.fileName[0]}
          </p>
          <button className="reset-upload btn-secondary" onClick={resetUpload}>
            Upload another file
          </button>
        </div>
      );
    }

    if (uploaderState.error) {
      return (
        <div className="upload-content error-state">
          <p className="error-text">❌ {uploaderState.error}</p>
          <button onClick={resetUpload} className="reset-button btn-primary">
            Try again
          </button>
        </div>
      );
    }

    if (uploaderState.isProcessing) {
      return (
        <div className="upload-content processing-state">
          <div className="spinner" /> {/* Requires spinner CSS */}
          <p className="upload-text">Uploading...</p>
          {uploaderState.fileName && (
            <p className="file-name">{uploaderState.fileName[0]}</p>
          )}
        </div>
      );
    }

    // Default drag-and-drop state
    return (
      <div className="upload-content default-state">
        <span className="upload-icon-emoji">📤</span>
        <h3 className="upload-title">
          Upload New Regulatory Guideline Document
        </h3>
        <p className="upload-text">
          Drag and drop files here or click to browse • Supports PDF, DOCX, XLS,
          JSON
        </p>
      </div>
    );
  };

  const filteredProducts = productsData.filter((p) => {
    if (activeFilter === "All") return true;
    return p.status.toLowerCase() === activeFilter.toLowerCase();
  });

  return (
    <div className="main-wrapper">
      {isModalOpen && (
        <ProductDetailsModal
          product={modalProduct}
          onClose={closeModal}
          draftReport={draftReportContent}
          earlierPolicy={earlierPolicyContent}
          dispatch={dispatch}
        />
      )}
      {/* Main Content Area */}
      <div className="main-content-container">
        <div className="content-inner-wrapper">
          <div className="header">
            <h1 className="header-title-main">PolicyNexus AI</h1>
            <div className="header-right">
              <select
                className="market-selector"
                value={selectedMarket}
                onChange={(e) => setSelectedMarket(e.target.value)}
              >
                <option value="India">🌍 Market: India</option>
                <option value="USA">🌍 Market: USA</option>
                <option value="Canada">🌍 Market: Canada</option>
              </select>
            </div>
          </div>

          <div className={`main-scroll-area ${isMainAreaDisabled ? 'disabled' : ''}`}>
            {/* Upload Section */}
            <div
              className="upload-section"
              onClick={() => fileInputRef.current?.click()}
            >
              {/* Hidden Input Field */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.json"
                onChange={handleFileChange}
                className="file-input-hidden" // Requires CSS to hide/style correctly
                style={{ display: "none" }} // Ensure it's hidden but clickable
              />
              {renderUploadContent()}
            </div>

            <div className="products-header">
              <h2 className="products-title-1">
                Product Tiles - Compliance Documents
              </h2>
              {/* <div className="filter-buttons">
                {["All", "Pending", "Approved", "Processing"].map((filter) => (
                  <button
                    key={filter}
                    className={`filter-btn ${
                      activeFilter === filter ? "active" : ""
                    }`}
                    onClick={() => setActiveFilter(filter)}
                  >
                    {filter}
                  </button>
                ))}
              </div> */}
            </div>

            <div className="products-grid">
              {filteredProducts.map((product) => (
                <ProductTile
                  key={product.id}
                  product={product}
                  onOpenModal={openModal}
                  onStartAgent={handleStartAgent} // **PROP ADDED HERE**
                  activeAgentProductId={activeAgentProductId}
                  onExportPdf={() => handleDownload(product.id)}
                  productApprovedContent={approvedContentsMap[product.id]}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <AiActivityPanel />
    </div>
  );
}
