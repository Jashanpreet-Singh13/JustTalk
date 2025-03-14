import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import { FiMail } from "react-icons/fi";

const API_URL = import.meta.env.VITE_BACKEND_URL;

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/auth/forgot-password`, { email });
      setIsOtpSent(true);
      toast.success(res.data.message);
      navigate("/verify-otp", { state: {email} });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send OTP");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-200">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-96 backdrop-blur-xl">
        <h2 className="text-3xl font-bold text-center mb-6 text-emerald-600">
          Forgot Password
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center border border-gray-300 rounded-lg p-2 bg-gray-50 focus-within:border-emerald-500">
            <FiMail className="text-gray-500 mr-2" />
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              className="w-full bg-transparent focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className={`w-full p-2 rounded-lg font-semibold transition text-white ${
              isOtpSent
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
            disabled={isOtpSent} 
          >
            {isOtpSent ? "OTP Sent" : "Send OTP"}
          </button>
        </form>
      </div>
      <Toaster position="top-center"/>
    </div>
  );
};

export default ForgotPassword;