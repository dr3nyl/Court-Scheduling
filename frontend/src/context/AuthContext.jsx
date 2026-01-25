// React utilities for shared state
import { createContext, useState, useEffect } from "react";

// Axios instance (API calls to Laravel)
import api from "../services/api";

// Create a context object
export const AuthContext = createContext();

// Provider component that wraps the app
export function AuthProvider({ children }) {

  // Store logged-in user info
  const [user, setUser] = useState(null);

  // Store auth token (from Laravel Sanctum)
  const [token, setToken] = useState(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      api.get("/me")
        .then(res => {
          setUser(res.data);      // restore user
        })
        .catch(() => {
          // ONLY here: token is invalid/expired
          localStorage.removeItem("token");
          setUser(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);


  // Login function
  const login = async (email, password) => {
    try {
      const res = await api.post("/login", { email, password });

      setUser(res.data.user);
      setToken(res.data.token);
      localStorage.setItem("token", res.data.token);

      return res.data.user;
    } catch (err) {
      // Re-throw error so components can handle it
      throw err;
    }
  };

  // Register function
  const register = async (data) => {
    try {
      const res = await api.post("/register", data);
      setUser(res.data.user);
      setToken(res.data.token);
      localStorage.setItem("token", res.data.token);
      
      return res.data.user;
    } catch (err) {
      // Re-throw error so components can handle it
      throw err;
    }
  };

  // Logout function
    const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
  };
  
  if (loading) return null;
  
  // Provide values to the rest of the app
  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      register,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}
