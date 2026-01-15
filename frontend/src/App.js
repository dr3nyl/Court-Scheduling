import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PlayerDashboard from "./pages/PlayerDashboard";
import OwnerDashboard from "./pages/OwnerDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import OwnerCourts from "./pages/OwnerCourts";
import OwnerCourtSchedule from "./pages/OwnerCourtSchedule";
import PlayerBooking from "./pages/PlayerBooking";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/player"
          element={
            <ProtectedRoute role="player">
              <PlayerDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/owner"
          element={
            <ProtectedRoute role="owner">
              <OwnerDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/owner/courts"
          element={
            <ProtectedRoute role="owner">
              <OwnerCourts />
            </ProtectedRoute>
          }
        />

        <Route
          path="/owner/courts/:courtId/schedule"
          element={
            <ProtectedRoute role="owner">
              <OwnerCourtSchedule />
            </ProtectedRoute>
          }
        />

        <Route
          path="/player/book"
          element={
            <ProtectedRoute role="player">
              <PlayerBooking />
            </ProtectedRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
