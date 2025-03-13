import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Mail, Lock } from "lucide-react";

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
      const res = await axios.post(`${API_URL}/api/auth/login`, form, {
        withCredentials: true,
      });
      toast.success(res.data.message);
      setTimeout(() => {
        navigate("/");
      }, 3500);
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      {loading ? (
        <div className="flex justify-center items-center min-h-screen">
          <div className="w-12 h-12 border-4 border-emerald-500 border-dashed rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-2xl shadow-lg w-96 backdrop-blur-xl">
          <h2 className="text-3xl font-bold text-center mb-6 text-emerald-600">
            Login
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center border rounded-lg px-3 py-2 bg-gray-50">
              <Mail className="text-gray-500" />
              <input
                type="email"
                name="email"
                placeholder="Email"
                className="w-full bg-transparent p-2 outline-none"
                onChange={handleChange}
                required
              />
            </div>
            <div className="flex items-center border rounded-lg px-3 py-2 bg-gray-50">
              <Lock className="text-gray-500" />
              <input
                type="password"
                name="password"
                placeholder="Password"
                className="w-full bg-transparent p-2 outline-none"
                onChange={handleChange}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-emerald-600 text-white p-3 rounded-lg font-semibold hover:bg-emerald-700 transition-all"
            >
              Login
            </button>
          </form>
          <p className="text-center mt-4 text-gray-600">
            <Link to="/forgot-password" className="text-emerald-600 font-semibold hover:underline">
              Forgot Password?
            </Link>
          </p>
          <p className="text-center mt-2 text-gray-600">
            Don't have an account?{" "}
            <Link to="/register" className="text-emerald-600 font-semibold hover:underline">
              Register
            </Link>
          </p>
        </div>
      )}
      <ToastContainer position="top-center" autoClose={3000} />
    </div>
  );
};

export default Login;