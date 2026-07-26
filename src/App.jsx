import { Routes, Route } from "react-router-dom";

import Landing from "./pages/Landing";
import CandidateDashboard from "./pages/CandidateDashboard";
import RecruiterDashboard from "./pages/RecruiterDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Login from "./pages/Login";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route
        path="/candidate"
        element={<CandidateDashboard />}
      />

      <Route
        path="/recruiter"
        element={<RecruiterDashboard />}
      />

      <Route
        path="/admin"
        element={<AdminDashboard />}
      />

      <Route path="/login" element={<Login />} />
      
    </Routes>
  );
}

export default App;