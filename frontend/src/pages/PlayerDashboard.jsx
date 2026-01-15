import { Link } from "react-router-dom";

export default function PlayerDashboard() {
  return (

    <div>
      <h2>Player Dashboard</h2>

      <Link to="/player/book">Book a Court</Link>
    </div>
  );
}
