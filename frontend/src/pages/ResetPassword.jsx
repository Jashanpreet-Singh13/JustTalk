import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FiLock } from "react-icons/fi";

const API_URL = import.meta.env.VITE_BACKEND_URL;

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/auth/reset-password`, { email, newPassword });
      toast.success(res.data.message);
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reset password");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-200">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-96 backdrop-blur-xl">
        <h2 className="text-3xl font-bold text-center mb-6 text-emerald-600">
          Reset Password
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center border border-gray-300 rounded-lg p-2 bg-gray-50 focus-within:border-emerald-500">
            <FiLock className="text-gray-500 mr-2" />
            <input
              type="password"
              name="newPassword"
              placeholder="New Password"
              className="w-full bg-transparent focus:outline-none"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 transition text-white p-2 rounded-lg font-semibold"
          >
            Reset Password
          </button>
        </form>
      </div>
      <ToastContainer position="top-center" autoClose={3000} />
    </div>
  );
};

export default ResetPassword;