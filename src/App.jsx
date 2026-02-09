import { AppProvider } from "./context/AppContext";
import Login from "./Login";
import Signup from "./SignUp";
import { Routes, Route } from "react-router-dom";
import Dashboardnew from "./pages/DashboardNew";

function App() {
  return (
    <AppProvider>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signin" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboardnew />} />
      </Routes>
    </AppProvider>
  );
}

export default App;
