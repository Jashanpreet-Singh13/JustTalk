import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import { FiCode } from "react-icons/fi";

const API_URL = import.meta.env.VITE_BACKEND_URL;

const VerifyOtpRegister = () => {
  const [otp, setOtp] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/auth/verify-otp-register`, { email, otp });
      toast.success(res.data.message);
      setTimeout(() => {
        navigate("/login");
      }, 1000);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to verify OTP");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-200">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-96 backdrop-blur-xl">
        <h2 className="text-3xl font-bold text-center mb-6 text-emerald-600">
          Verify OTP
        </h2>
        <p className="text-center text-gray-600 mb-4">
          Enter the OTP sent to {email}
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center border border-gray-300 rounded-lg p-2 bg-gray-50 focus-within:border-emerald-500">
            <FiCode className="text-gray-500 mr-2" />
            <input
              type="text"
              name="otp"
              placeholder="Enter OTP"
              className="w-full bg-transparent focus:outline-none"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 transition text-white p-2 rounded-lg font-semibold"
          >
            Verify OTP
          </button>
        </form>
      </div>
      <Toaster position="top-center"/>
    </div>
  );
};

export default VerifyOtpRegister;