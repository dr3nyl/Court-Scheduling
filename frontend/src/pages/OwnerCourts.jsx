import { useEffect, useState } from "react";
import api from "../services/api";
import { Link } from "react-router-dom";

export default function OwnerCourts() {
  const [courts, setCourts] = useState([]);
  const [name, setName] = useState("");

  useEffect(() => {
    api.get("/courts").then(res => setCourts(res.data));
  }, []);

  const addCourt = async () => {
    const res = await api.post("/courts", { name });
    setCourts([...courts, res.data]);
    setName("");
  };

  return (
    <div>
      <h2>My Courts</h2>

      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Court name"
      />
      <button onClick={addCourt}>Add Court</button>

      <ul>
        {courts.map(court => (
          <li key={court.id}>
            <Link to={`/owner/courts/${court.id}/schedule`}>
              {court.name} {court.is_active ? "🟢" : "🔴"}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};
