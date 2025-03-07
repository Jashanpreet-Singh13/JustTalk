import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FiMail, FiLock } from "react-icons/fi";

const API_URL = import.meta.env.VITE_BACKEND_URL;

const Login = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setTimeout(() => setLoading(false), 1500);
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        `${API_URL}/api/auth/login`,
        form,
        { withCredentials: true }
      );
      toast.success(res.data.message);
      setTimeout(() => {
        navigate("/");
      }, 3500);
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-200">
      {loading ? (
        <div className="flex justify-center items-center min-h-screen">
          <div className="w-12 h-12 border-4 border-emerald-500 border-dashed rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-2xl shadow-lg w-96 backdrop-blur-xl">
          <h2 className="text-3xl font-bold text-center mb-6 text-emerald-600">
            Login
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center border border-gray-300 rounded-lg p-2 bg-gray-50 focus-within:border-emerald-500">
              <FiMail className="text-gray-500 mr-2" />
              <input
                type="email"
                name="email"
                placeholder="Email"
                className="w-full bg-transparent focus:outline-none"
                onChange={handleChange}
                required
              />
            </div>
            <div className="flex items-center border border-gray-300 rounded-lg p-2 bg-gray-50 focus-within:border-emerald-500">
              <FiLock className="text-gray-500 mr-2" />
              <input
                type="password"
                name="password"
                placeholder="Password"
                className="w-full bg-transparent focus:outline-none"
                onChange={handleChange}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 transition text-white p-2 rounded-lg font-semibold"
            >
              Login
            </button>
          </form>
          <p className="text-center mt-4 text-gray-600">
            Don't have an account?{" "}
            <a href="/register" className="text-emerald-500 hover:underline">
              Register
            </a>
          </p>
        </div>
      )}
      <ToastContainer position="top-center" autoClose={3000} />
    </div>
  );
};

export default Login;
