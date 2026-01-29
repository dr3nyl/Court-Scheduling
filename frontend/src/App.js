import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Landing from "./pages/Landing";
import PlayerDashboard from "./pages/PlayerDashboard";
import OwnerDashboard from "./pages/OwnerDashboard";
import QueueMasterDashboard from "./pages/QueueMasterDashboard";
import QueueSessionView from "./pages/QueueSessionView";
import ProtectedRoute from "./components/ProtectedRoute";
import OwnerCourts from "./pages/OwnerCourts";
import OwnerCourtSchedule from "./pages/OwnerCourtSchedule";
import OwnerBookings from "./pages/OwnerBookings";
import OwnerAnalytics from "./pages/OwnerAnalytics";
import PlayerBooking from "./pages/PlayerBooking";
import PlayerBookings from "./pages/PlayerBookings";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
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
          path="/queue-master"
          element={
            <ProtectedRoute role={["owner", "queue_master"]}>
              <QueueMasterDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/queue-master/sessions/:sessionId"
          element={
            <ProtectedRoute role={["owner", "queue_master"]}>
              <QueueSessionView />
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
          path="/owner/bookings"
          element={
            <ProtectedRoute role="owner">
              <OwnerBookings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/owner/analytics"
          element={
            <ProtectedRoute role="owner">
              <OwnerAnalytics />
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

        <Route
          path="/player/bookings"
          element={
            <ProtectedRoute role="player">
              <PlayerBookings />
            </ProtectedRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
