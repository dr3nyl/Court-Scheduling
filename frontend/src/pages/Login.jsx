import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {

  // Get login function from AuthContext
  const { login, user  } = useContext(AuthContext);

  // Used to redirect user
  const navigate = useNavigate();

  // Local form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Handle form submit
  const submit = async (e) => {
    e.preventDefault(); // Prevent page refresh

    // Call login function
    const loggedInUser = await login(email, password);

    console.log("Logged in user:", loggedInUser);
    // Redirect based on role
    // `user` is now set by AuthContext
    if (loggedInUser.role === "player") {
      navigate("/player");
    } else if (loggedInUser.role === "owner") {
      navigate("/owner");
    }
  };

  return (
    <form onSubmit={submit}>
      <h2>Login</h2>

      {/* Email input */}
      <input
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />

      {/* Password input */}
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />

      {/* Submit button */}
      <button>Login</button>
    </form>
  );
}
