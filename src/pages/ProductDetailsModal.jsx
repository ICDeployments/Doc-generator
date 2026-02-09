import React, { useState, useEffect, useMemo, useContext, useRef } from "react";
import "./DashboardNew.css";

// Accept the new props: draftReport and earlierPolicy
const ProductDetailsModal = ({
  product,
  onClose,
  draftReport, //JavaScript array: [] or [{ filename: '...', content: '...' }]
  earlierPolicy,
  dispatch,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  // State for switching between 'Earlier Policy' and 'Additional Info'
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);
const [userEdited, setUserEdited] = useState(false);
  const reportItem = draftReport?.[0];
  const filename = reportItem?.filename;
  const content = reportItem?.content;
const editedTextRef = useRef(content || ""); // Ref to hold the edited string
const domRef = useRef(null); // Ref to hold the DOM element
useEffect(() => {
    editedTextRef.current = content || "";
    setUserEdited(false); // Reset edit status
}, [content]);
  if (!product) return null;

  const toggleExpand = () => setIsExpanded(!isExpanded);
  const toggleInfo = () => setShowAdditionalInfo(!showAdditionalInfo);

  // NEW onInput Handler: This now captures the plain text and sets the edit flag
const handleInput = (e) => {
    // The user has started editing. Save the plain text.
    editedTextRef.current = e.currentTarget.innerText; // Save string to the string ref
    setUserEdited(true); // Flag that an edit has occurred
};

  // Conditional class for modal size
  const modalContentClass = isExpanded
    ? "modal-content modal-content-expanded"
    : "modal-content";

  const secondaryContainerTitle = showAdditionalInfo
    ? "Earlier Policy (view only)"
    : "Changes Made";

  const handleApprove = () => {
    const productId = product.id;
  const finalContentToSend = userEdited 
        ? editedTextRef.current // Use the saved, plain edited text
        : domRef.current.innerText; // Use the current plain text from the rendered DOM
  console.log("approve clicked");
  console.log("userEdited:", userEdited);
  // console.log("finalContentToSend:", finalContentToSend);
    
    if (dispatch && productId) {
        dispatch({
            type: "SET_FINAL_APPROVED_CONTENT",
            payload: {
                productId: productId,
                // Send the marker-rich content if no editing occurred
                content: finalContentToSend,
            },
        });
        console.log(`Approved content dispatched for Product ID: ${productId}`);
    } 
    onClose();
};
  const parseMarkdownTable = (tableLines) => {
    if (tableLines.length === 0) return null;
    // console.log("Parsing table lines:", tableLines); // Keep for debugging if needed

    // Filter out non-content lines (only keep lines starting with -, |, or **)
    const contentLines = tableLines
      .filter(
        (line) =>
          line.trim().startsWith("-") ||
          line.trim().startsWith("|") ||
          line.trim().startsWith("**") ||
          line.includes(":") // Keep lines with colons for Key:Value or Colon Tables
      )
      .map((line) => line.trim().replace(/^- /, "").trim());
    // console.log("CL", contentLines); // Keep for debugging if needed

    if (contentLines.length === 0) return null;

    let headers = [];
    let rows = [];
    const firstContentLine = contentLines[0];

    // --- 1. Determine Delimiter and Parsing Strategy ---

    const isPipeTable = firstContentLine.includes("|");
    const delimiter = isPipeTable ? "|" : ":";
    const parts = firstContentLine.split(delimiter);
    // Is it a two-column Key:Value list (uses ':' but has only 2 parts)?
    const isKeyValueTable =
      delimiter === ":" && !isPipeTable && parts.length === 2;
    // Is it a multi-column table (GFM pipe-delimited OR colon-delimited with > 2 parts)?
    const isStandardTable =
      isPipeTable || (delimiter === ":" && parts.length > 2);
     // --- NEW EXCLUSION FILTER FUNCTION ---
  const isChangeNarrativeLine = (line) =>
    line.includes("Old Content:") || line.includes("Reason for Change:");
    if (isKeyValueTable) {
      headers = ["Term", "Definition"];

      // Function to parse a colon-separated row
      const parseColonRow = (row) => {
        // Remove the starting ** if present, we'll handle styling later
        const cleanRow = row.replace(/^\*\*/, "").trim();
        const parts = cleanRow.split(":");
        if (parts.length < 2) return null;

        // Key is the first part, Value is the rest (handles colons in the Value)
        const key = parts[0].trim();
        let value = parts.slice(1).join(":").trim();

        // Re-add bold markers to content if the line originally had them
        // NOTE: The rendering logic handles the final bolding visually.
        const finalKey = row.startsWith("**") ? `**${key}` : key;

        return [finalKey, value];
      };

      // Treat ALL relevant content lines as potential data rows
      rows = contentLines
      .slice(1)
        .filter((line) => line.includes(":")) // Only process lines with the key-value separator
        .filter((line) => !isChangeNarrativeLine(line))
        .map(parseColonRow)
        .filter((row) => row && row.length === 2); // Ensure two columns were parsed
    } else if (isStandardTable) {
      // --- STANDARD/MULTI-COLUMN: GFM Pipe or Colon-delimited Table Logic ---

      const parseRow = (row) => {
        // Use the determined delimiter
        const cells = row.split(delimiter).map((cell) => cell.trim());

        if (delimiter === "|") {
          // GFM Pipe: Filter out empty strings from leading/trailing pipes
          return cells.filter(
            (_, index, array) => index !== 0 && index !== array.length - 1
          );
        }
        // Multi-Column Colon: Keep all cells
        return cells;
      };

      let bodyStartLineIndex = 1;

      if (isPipeTable) {
        // GFM Pipe Table Logic
        const pipeHeaderLine = contentLines.find(
          (line) => line.startsWith("|") && !line.includes("---")
        );
        const separatorLine = contentLines.find((line) =>
          line.includes("|---")
        );

        if (!pipeHeaderLine) return null;

        headers = parseRow(pipeHeaderLine);

        const headerIndex = contentLines.indexOf(pipeHeaderLine);
        const separatorIndex = separatorLine
          ? contentLines.indexOf(separatorLine)
          : -1;

        // Start body after the separator line (if present) or after the header line
        bodyStartLineIndex =
          separatorIndex !== -1 ? separatorIndex + 1 : headerIndex + 1;
      } else if (!isPipeTable && delimiter === ":") {
        // Multi-Column Colon Table Logic (Your Second Table)

        // The first content line is the header for this format
        const headerLine = contentLines[0];
        if (!headerLine) return null;

        // **Dynamically extract the correct headers**
        headers = parseRow(headerLine);

        // Rows start from the line after the header
        bodyStartLineIndex = 1;
      }

      // Generate rows, stripping the leading '**' from data rows for colon tables
      rows = contentLines
        .slice(bodyStartLineIndex)
        .filter((line) => !line.includes("---")) // Exclude separator lines if they somehow got in
        .map((line) => {
          // Strip the leading '**' and leading space from body lines if present
          const cleanLine = line.replace(/^\*\*/, "").trimStart();
          return parseRow(cleanLine);
        })
        // Important: Filter out rows that don't match the expected column count
        .filter((row) => row.length === headers.length);
    } else {
      // Unrecognized table format
      return null;
    }

    // Final check
    if (headers.length === 0 || rows.length === 0) return null;

    // --- 2. Render the Table ---

    return (
      <div
        style={{ overflowX: "auto", marginBottom: "10px", marginTop: "10px" }}
      >
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            minWidth: "400px",
            fontSize: "0.9em",
          }}
        >
          <thead>
            <tr>
              {headers.map((header, colIdx) => (
                <th
                  key={colIdx}
                  style={{
                    border: "1px solid #ddd",
                    padding: "8px",
                    textAlign: "left",
                    backgroundColor: "#f2f2f2",
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {/* Ensure we only try to render cells that match the header count */}
                {row.slice(0, headers.length).map((cell, colIdx) => {
                  // Apply bold style and color if the cell content starts with **
                  const isBold = cell.startsWith("**");
                  const cellContent = isBold ? (
                    <span style={{ fontWeight: "bold", color: "#000048" }}>
                      {cell.replace(/\*\*/g, "").trim()}
                    </span>
                  ) : (
                    cell
                  );

                  return (
                    <td
                      key={colIdx}
                      style={{
                        border: "1px solid #ddd",
                        padding: "8px",
                        verticalAlign: "top",
                        // Optional: increase width of first column for "Term" in key:value tables
                        width:
                          colIdx === 0 && headers.length === 2
                            ? "30%"
                            : undefined,
                      }}
                    >
                      {cellContent}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  /**
   * Parses the document content string to extract "Old Content" and
   * "Reason for Change" narratives grouped by the change section.
   * @param {string} text - The full policy document content string.
   * @returns {Array<Object>} An array of change objects.
   */
  const extractChanges = (text) => {
    if (!text) return [];

    // Regex to capture the three parts:
    // 1. The main section line (starts with **)
    // 2. The Old Content line (starts with >>> Old Content)
    // 3. The Reason for Change line (starts with >>> Reason for Change)
    const changeBlockRegex =
      /^\*\* ([\s\S]*?)\n(>>> Old Content: (.*?)\n)(>>> Reason for Change: ([\s\S]*?))(?=\n\n[\-\d]|\n\n\*\*|$)/gim;

    const changes = [];
    let match;

    // We iterate through all matches in the document
    while ((match = changeBlockRegex.exec(text)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (match.index === changeBlockRegex.lastIndex) {
        changeBlockRegex.lastIndex++;
      }

      // match[1]: The main line
      // match[3]: The Old Content text
      // match[5]: The Reason for Change text

      changes.push({
        mainChange: match[1].trim(),
        oldContent: match[3].trim(),
        reason: match[5].trim(),
      });
    }

    return changes;
  };
  // const extractedChanges = content ? extractChanges(content) : [];

  // Memoize the expensive parsing function
  const extractedChanges = useMemo(() => {
    return content ? extractChanges(content) : [];
  }, [content]);

  const formatNarrative = (text) => {
    if (!text) return null; // Split the text into lines
    const lines = text.split("\n"); // State to track if we are inside a table block
    let inTable = false;
    let currentTableLines = []; // *** This will now hold ALL final JSX elements, including the table ***
    const finalRenderedContent = [];
    lines.forEach((line, idx) => {
      // *** CHANGE: Use forEach to build a single array ***
      // Trim the line for cleaner processing
      const trimmedLine = line.trim();
      let elementToRender = null; // Default to null (ignore line) or a specific element // --- 1. Handle Table Markers ---

      if (
        trimmedLine.startsWith("--- TABLE START ---") ||
        trimmedLine.startsWith("- --- TABLE START ---")
      ) {
        inTable = true;
        currentTableLines = [];
        elementToRender = null; // Skip rendering the marker itself
      } else if (
        trimmedLine.startsWith("--- TABLE END ---") ||
        trimmedLine.startsWith("- --- TABLE END ---")
      ) {
        inTable = false; // *** CRUCIAL: Render the parsed table and push it to the final array ***
        console.log("in Table got false");
        const parsedTable = parseMarkdownTable(currentTableLines);
        if (parsedTable) {
          finalRenderedContent.push(parsedTable); // Push the table JSX
          console.log("called?");
        }
        currentTableLines = [];
        elementToRender = null; // Skip rendering the marker itself
      } // --- 2. Handle lines within a Table ---
      // --- 2. Handle lines within a Table ---
      else if (inTable) {
        // CRITICAL FIX: Push the UNTRIMMED line. Table parsers often need leading/trailing
        // whitespace or rely on the full line content.
        // We only exclude the table markers themselves, but keep everything else.
        currentTableLines.push(line);
        elementToRender = null; // Do NOT render the raw line here.
      }
      // 3. Handle ** Bold/New/Changed Sections
      else if (
        trimmedLine.match(/^\*\*[^-\s]/) ||
        trimmedLine.startsWith("** ")
      ) {
        // Remove leading ** and trim again
        const content = trimmedLine.replace(/^\*\*/, "").trim();
        elementToRender = (
          <div
            key={idx}
            style={{
              fontWeight: "700",
              color: "#000048",
              marginTop: "10px",
              marginBottom: "5px",
            }}
          >
                        {content}         {" "}
          </div>
        );
      } // 4. Handle >>> Old Content/Reason for Change (Non-bold, indented)
      else if (trimmedLine.startsWith(">>>")) {
        elementToRender = null; // Hide these lines
      } // 5. Handle single dash (-) bullet points
      else if (trimmedLine.startsWith("-")) {
        // Check if it's an outline item (like "1. Purpose and Objective")
        const isOutlineHeader = trimmedLine.match(/^- \d+\./);
        let contentToDisplay;
        if (trimmedLine.startsWith("- ")) {
          contentToDisplay = trimmedLine.replace(/^- /, "");
        } else if (trimmedLine === "-") {
          contentToDisplay = null;
        } else {
          // Handle cases like "-Cognizant BFS Bank"
          contentToDisplay = trimmedLine.replace(/^-/, "");
        }
        if (contentToDisplay === null || contentToDisplay.trim() === "") {
          elementToRender = null; // Don't render empty lines
        } else {
          elementToRender = (
            <div
              key={idx}
              style={{
                marginLeft: isOutlineHeader ? "0px" : "15px",
                marginBottom: "4px",
                fontWeight: isOutlineHeader ? "bold" : "normal",
              }}
            >
                            {contentToDisplay}           {" "}
            </div>
          );
        }
      } // 6. Handle all other normal text/empty lines
      else {
        // Only render if the line is not empty (e.g., just whitespace)
        if (trimmedLine) {
          elementToRender = (
            <div key={idx} style={{ marginBottom: "5px", marginTop: "3px" }}>
              {trimmedLine}
            </div>
          );
        }
      }

      // *** FINAL STEP: Add the element to the main array if it's not null ***
      if (elementToRender) {
        finalRenderedContent.push(elementToRender);
      }
    }); // *** Return the fully constructed array ***
    return finalRenderedContent;
  
  };

  return (
    <div className="modal-backdrop">
      <div className={modalContentClass}>
        <div className="modal-header">
          <h2 className="modal-title"> Policy Review & Approval Workflow </h2>
          <div className="header-actions">
            {/* Control Buttons */}
            <button
              className="btn btn-secondary header-btn"
              onClick={toggleExpand}
            >
              {isExpanded ? "Collapse" : "Expand"}
            </button>
            <button
              className="btn btn-secondary header-btn"
              onClick={toggleInfo}
            >
              {showAdditionalInfo ? "Changes Made" : "Earlier Policy"}
            </button>
            {/* <button className="modal-close-btn" onClick={onClose}>
              &times;
            </button> */}
          </div>
        </div>

        <div className="modal-body">
          {/* Draft Version Report Container (Always visible) */}
          <div className="modal-container primary-container">
            <h3 className="container-title">Draft version Report</h3>
            {/* *** INSERT draftReport HERE *** */}
            <div
              className="document-content-area"
              contentEditable={true}
              suppressContentEditableWarning={true}
              // onInput={(e) => setLocalText(e.currentTarget.innerText)}
              onInput={handleInput}
             ref={domRef}
            >
              {/* <strong> FileName: </strong> {formatNarrative(filename)} */}
              {formatNarrative(content)}
            </div>
          </div>

          {/* Secondary Container (Switches between Earlier Policy and Changes Made) */}
          <div className="modal-container secondary-container">
            <h3 className="container-title">{secondaryContainerTitle}</h3>
            {showAdditionalInfo ? (
              <div className="document-content-area">
                {formatNarrative(earlierPolicy)}
              </div>
            ) : (
              /* Display bullet points for "Changes Made" */
              <ul className="container-list">
                {extractedChanges.length > 0 ? (
                  extractedChanges.map((change, index) => (
                    <li key={index} className="change-item">
                      {/* Highlight the section where the change occurred */}
                      <p className="change-main-point">
                        <strong> Section Changed: </strong>{" "}
                        <span className="change-content">
                          {change.mainChange}
                        </span>
                      </p>

                      {/* Old Content */}
                      <p className="change-detail old-content">
                        <strong> Old Content: </strong>
                        <span className="change-content">
                          {change.oldContent}
                        </span>
                      </p>

                      {/* Reason for Change (The primary narrative) */}
                      <p className="change-detail reason">
                        <strong>Reason for change: </strong>{" "}
                        <span className="change-content">{change.reason}</span>
                      </p>
                      <hr
                        style={{
                          borderTop: "1px solid #eee",
                          margin: "10px 0",
                        }}
                      />
                    </li>
                  ))
                ) : (
                  <li></li>
                )}
              </ul>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleApprove}>
            Approve
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            Reject
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailsModal;
