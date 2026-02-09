import React, { createContext, useReducer, useContext } from "react";

const initialState = {
  messages: [],
  narrative: "",
  isProcessing: false,
  fileName: null,
  error: null,
  success: false,
  statusMessage: "",
  progress: 0,
  finished: false,
  selectedAgent: "dashboard", // Default agent
  activeHeading: "Dashboard Overview",
  narratives: {
    dashboard: "",
    data: "",
    preprocessor: "",
    doc: "",
  },
 approvedContents: {}, // ✨ NEW: Stores content keyed by productId  edited & approved in modal, store here
  // activeTab: "preprocessor" | "sarNarrative" | "evaluator" | "formatter",
  activeTab: "dashboard",
  activeResponseTab: "preprocessor",
   // 💡 NEW FIELD: To hold keys needed for WebSocket subscription
  processKeys: {
    criteriaKey: null,
    policyKeys: [],
  },
  // uploader-specific states
  singleUpload: {
    isProcessing: false,
    fileName: null,
    error: null,
    success: false,
    progress: 0,
     // 💡 NEW FIELD: To store the unique key for WebSocket subscription
    // criteriaKey: null,
  },
  multiUpload: {
    isProcessing: false,
    fileName: [],
    error: null,
    success: false,
    progress: 0,
  },
};

const AppContext = createContext(undefined);

const appReducer = (state, action) => {
  switch (action.type) {
    case "START_PROCESSING":
      return {
        ...state,
        isProcessing: true,
        fileName: action.payload.fileName,
        messages: [],
        narrative: "",
        error: null,
        success: false,
        currentStep: 0,
        selectedAgent: "data",
        // selectedAgent: "dashboard"
      };
    case "START_PROCESSING_SINGLE":
      return {
        ...state,

        singleUpload: {
          ...state.singleUpload,
          isProcessing: true,
          // fileName: action.payload.fileName,
            fileName: [action.payload.fileName],
          error: null,
          success: false,
          progress: 0,
        },
      };

    case "UPLOAD_SUCCESS_SINGLE":
      return {
        ...state,

        singleUpload: {
          ...state.singleUpload,

          isProcessing: true,

          success: true,

          error: null,

          // progress: 100,
        },
      };

    case "SET_ERROR_SINGLE":
      return {
        ...state,

        singleUpload: {
          ...state.singleUpload,

          error: action.payload,

          isProcessing: false,

          success: false,
        },
      };

    case "START_PROCESSING_MULTI":
      return {
        ...state,
        multiUpload: {
          ...state.multiUpload,
          isProcessing: true,
          // fileName: action.payload.fileName,
          fileName: Array.isArray(action.payload.fileName)
            ? action.payload.fileName
            : [action.payload.fileName],
          error: null,
          success: false,
          progress: 0,
        },
      };

    case "UPLOAD_SUCCESS_MULTI":
      return {
        ...state,
        multiUpload: {
          ...state.multiUpload,
          isProcessing: true,
          success: true,
          error: null,
          progress: 100,
        },
      };

    case "SET_ERROR_MULTI":
      return {
        ...state,
        multiUpload: {
          ...state.multiUpload,
          error: action.payload,
          isProcessing: false,
          success: false,
        },
      };

    case "ADD_MESSAGE":
      const newMessages = [...state.messages, action.payload];
      return {
        ...state,
        messages: newMessages.slice(-1),
      };
    case "SET_NARRATIVE":
      return {
        ...state,
        narratives: {
          ...state.narratives,
          [action.payload.tab]: action.payload.text,
        },
        isProcessing: false,
      };
    case "SET_ERROR":
      return {
        ...state,
        error: action.payload,
        isProcessing: false,
        success: false,
      };
    case "UPLOAD_SUCCESS":
      return {
        ...state,
        isProcessing: false,
        success: true,
        error: null,
      };
    case "RESET":
      return { ...initialState, currentStep: 0 };

    case "SET_STATUS_MESSAGE":
      return {
        ...state,
        statusMessage: action.payload,
      };

    case "SET_PROGRESS":
      return {
        ...state,
        progress: action.payload, // Update progress state
      };

    case "SET_CURRENT_STEP":
      return {
        ...state,
        currentStep: action.payload, // Update current step state
      };

    case "SET_FINISHED":
      return {
        ...state,
        finished: action.payload, // Update finished state
      };

    case "SET_COMPLETED_STEP":
      return {
        ...state,
        completedStep: action.payload, // Update current step state
      };

    case "SET_SELECTED_AGENT":
      return {
        ...state,
        selectedAgent: action.payload, // Update selected agent
      };

    case "SET_ACTIVE_HEADING":
      return {
        ...state,
        activeHeading: action.payload, // Update active heading
      };

    case "SET_NARRATIVE_FOR_STEP":
      return {
        ...state,
        narratives: {
          ...state.narratives,
          [action.payload.step]: action.payload.text,
        },
      };

    case "SET_ACTIVE_TAB":
      return {
        ...state,
        activeTab: action.payload,
      };

    case "SET_ACTIVE_RESPONSE_TAB":
      return {
        ...state,
        activeResponseTab: action.payload,
      };


       // 💡 NEW CASE 1: Store the Criteria File Key
    case "SET_CRITERIA_FILE_KEY":
      return {
        ...state,
        processKeys: {
          ...state.processKeys,
          criteriaKey: action.payload,
        },
      };

    case "CLEAR_PROCESS_KEYS":
      return {
        ...state,
        processKeys: {
          criteriaKey: null,
          // policyKeys: [],
        },
      }; 

      //this is the new case for sending received api data to the modalfile to get rendered
     case "SET_GENERATED_DOC_CONTENT":
            return {
                ...state,
                // Assuming you have a place for this data in your state
                generatedDocument: {
                    draft: action.payload.draft,
                    earlierPolicy: action.payload.earlierPolicy
                }
            };

            case "SET_FINAL_APPROVED_CONTENT":
      return {
        ...state,
        approvedContents: {
            ...state.approvedContents,
            // Use [action.payload.productId] to dynamically set the key
            [action.payload.productId]: action.payload.content, 
        },}

    //   case "CLEAR_PROCESS_KEYS":
    // return {
    //     ...state,
    //     processKeys: {
    //         criteriaKey: null, // This is the key that causes AiActivityPanel to disconnect and reset
    //         // policyKeys: [],
    //     },
    // };

    default:
      return state;
  }
};

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined)
    throw new Error("useAppContext must be used within an AppProvider");
  return context;
};
