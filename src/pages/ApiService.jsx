const UPLOAD_URL =
  "https://i340k5fce3.execute-api.us-west-2.amazonaws.com/devlopment/upload_reretive";
const DOC_GENERATOR_URL =
  "https://ttk2sstsyd.execute-api.us-west-2.amazonaws.com/Development/Retrieve_policy";

// Function to upload/ trigger upload-  a single file
export const uploadSingleFile = async (
  file,
  dispatch,
  market,
  // productTitle,
  productValue
) => {
  if (!file) {
    throw new Error("No file provided for upload.");
  }
  // All the logic from the original uploadSingleFile
  try {
    const base64File = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const payload = {
      fileName: file.name,
      fileType: file.type,
      body: base64File,
      //  key: ["india","loan"],
      // key: [market.toLowerCase(), productTitle.toLowerCase()],
      key: [market.toLowerCase(), productValue],

    };

    if (dispatch) {
      // Use dispatch if available to update state/messages
      dispatch({
        type: "ADD_MESSAGE",
        payload: "⬆️ Uploading Criteria file...",
      });
      // dispatch({ type: "SET_CURRENT_STEP", payload: 1 });
      // dispatch({ type: "SET_PROGRESS", payload: 10 });
    }

    const res = await fetch(UPLOAD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(
        `Criteria file upload failed: ${res.status} ${res.statusText}`
      );
    }

    const responseData = await res.json();
    const criteriaFileKey = JSON.parse(responseData.body).file_name;
    const file_keys = JSON.parse(responseData.body).file_keys;

    if (dispatch) {
      // dispatch({ type: "SET_PROGRESS", payload: 40 });
      dispatch({
        type: "ADD_MESSAGE",
        payload: "✅ Criteria file uploaded successfully.",
      });
      dispatch({ type: "SET_CRITERIA_FILE_KEY", payload: criteriaFileKey });
    }

    return criteriaFileKey;
  } catch (err) {
    const msg = err?.message || "Criteria file upload failed";
    if (dispatch) {
      dispatch({ type: "SET_ERROR", payload: msg });
      // dispatch({ type: "ADD_MESSAGE", payload: `❌ ${msg}` });
    }
    throw err;
  }
};

// Function to trigger document generation- api call
export const triggerDocGeneration = async (
  criteriaFileKey,
  state,
  dispatch,
  market,
  productValue,
  // productTitle
) => {
  // All the logic from the original triggerDocGeneration
  // NOTE: This function relies heavily on `state` (e.g., state.policyFileKeys, state.activeResponseTab)
  // You MUST pass the `state` object and `dispatch` function from the component where the context is available.
  if (!dispatch || !state) {
    throw new Error("State or Dispatch is missing for document generation.");
  }

  // ... (include the rest of the original triggerDocGeneration logic)
  // You'll need to re-implement the typewriter effect as well,
  // which also relies on `dispatch` and `state.activeResponseTab`.

  try {
    const processedKeys = state.policyFileKeys || [
      "policy/default_policy_file.pdf",
    ];

    //   "key": ["preprocess_policy_pdfs/1_BANK_LOAN_DOC.txt"],
    // console.log("productTitle", productTitle);
    const docPayload = {
      Records: [
        {
          s3: {
            bucket: {
              name: "policydocs-bucket",
            },
            object: {
              key: `input/${criteriaFileKey}`,
            },
          },
        },
        {
          s3: {
            bucket: {
              name: "policydocs-bucket",
            },
            object: {
              // key: ["india","loan"],
              // key: [market.toLowerCase(), productTitle.toLowerCase()],
      key: [market.toLowerCase(), productValue],
            },
          },
        },
      ],
    };

    // dispatch({ type: "SET_PROGRESS", payload: 50 });
    // dispatch({ type: "SET_CURRENT_STEP", payload: 3 });
    // dispatch({ type: "ADD_MESSAGE", payload: "📄 Generating document..." });

    const docResponse = await fetch(DOC_GENERATOR_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(docPayload),
    });

    if (!docResponse.ok) {
      throw new Error(
        `Document generation failed: ${docResponse.status} ${docResponse.statusText}`
      );
    }
    const docData = await docResponse.json();
    // dispatch({ type: "SET_PROGRESS", payload: 80 });

    return docData;
  } catch (err) {
    throw err;
  }
};
