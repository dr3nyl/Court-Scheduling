import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function ProtectedRoute({ children, role }) {
  const { user } = useContext(AuthContext);

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (role) {
    const allowed = Array.isArray(role)
      ? role.includes(user.role) || user.role === "superadmin"
      : user.role === role || user.role === "superadmin";
    if (!allowed) return <Navigate to="/login" />;
  }

  return children;
}
