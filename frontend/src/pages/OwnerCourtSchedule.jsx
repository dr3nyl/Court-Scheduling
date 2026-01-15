import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "../services/api";

export default function OwnerCourtSchedule() {
  const { courtId } = useParams();

  const [schedules, setSchedules] = useState([]);
  const [dayOfWeek, setDayOfWeek] = useState("");
  const [openTime, setOpenTime] = useState("");
  const [closeTime, setCloseTime] = useState("");

  useEffect(() => {
    api.get(`/owner/courts/${courtId}/availability`)
      .then(res => setSchedules(res.data));
  }, [courtId]);

  const addSchedule = async () => {
    const res = await api.post(`/owner/courts/${courtId}/availability`, {
        day_of_week: Number(dayOfWeek),
        open_time: openTime,
        close_time: closeTime
    });

    setSchedules([...schedules, res.data]);
    setDayOfWeek("");
    setOpenTime("");
    setCloseTime("");
  };

  const dayName = (day) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[day];
  };

return (
    <div>
        <h2>Court {courtId} Schedule</h2>

        <select value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)}>
            <option value="">Select day</option>
            <option value="0">Sunday</option>
            <option value="1">Monday</option>
            <option value="2">Tuesday</option>
            <option value="3">Wednesday</option>
            <option value="4">Thursday</option>
            <option value="5">Friday</option>
            <option value="6">Saturday</option>
        </select>

        <input
            type="time"
            value={openTime}
            onChange={e => setOpenTime(e.target.value)}
        />

        <input
            type="time"
            value={closeTime}
            onChange={e => setCloseTime(e.target.value)}
        />

        <button onClick={addSchedule}>Add</button>

        <hr />

        <h3>Available Schedules</h3>
        <ul>
        {schedules.map(s => (
        <li key={s.id}>
            {dayName(s.day_of_week)} | {s.open_time} – {s.close_time}
        </li>
        ))}
        </ul>
    </div>
    );
}