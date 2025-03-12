import { Navigate, Outlet } from "react-router-dom";
import axios from "axios";
import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_BACKEND_URL;

const ProtectedRoute = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    const verifyUser = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/auth/me`, {
          withCredentials: true,
        });
        if (response.data.user) setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
      }
    };
    verifyUser();
  }, []);

  if (isAuthenticated === null) return <div>Loading...</div>;
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute;
