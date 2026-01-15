import { Link } from "react-router-dom";

export default function OwnerDashboard() {
  return (
    <div>
      <h1>Owner Dashboard</h1>
      <Link to="/owner/courts">Manage Courts</Link>
    </div>
  );
}