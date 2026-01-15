import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Register() {

  // Get register function from AuthContext
  const { register } = useContext(AuthContext);

  // Used to redirect user
  const navigate = useNavigate();

  // Store all form fields in one object
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "player", // default role
  });

  // Handle form submit
  const submit = async (e) => {
    e.preventDefault();

    // Call register API
    await register(form);

    // Redirect after successful registration
    navigate("/");
  };

  return (
    <form onSubmit={submit}>
      <h2>Register</h2>

      {/* Name input */}
      <input
        placeholder="Name"
        onChange={e =>
          setForm({ ...form, name: e.target.value })
        }
      />

      {/* Email input */}
      <input
        placeholder="Email"
        onChange={e =>
          setForm({ ...form, email: e.target.value })
        }
      />

      {/* Password input */}
      <input
        type="password"
        placeholder="Password"
        onChange={e =>
          setForm({ ...form, password: e.target.value })
        }
      />

      {/* Role selection */}
      <select
        value={form.role}
        onChange={e =>
          setForm({ ...form, role: e.target.value })
        }
      >
        <option value="player">Player</option>
        <option value="owner">Court Owner</option>
      </select>

      {/* Submit button */}
      <button>Register</button>
    </form>
  );
}
