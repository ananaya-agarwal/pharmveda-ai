import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register(email, password);
      navigate("/timeline");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 transition-colors">
      <ThemeToggle className="fixed top-4 right-4" />
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <img
            src="/logo.png"
            alt="PharmVeda AI logo"
            className="h-14 w-14 rounded-xl object-cover shadow-sm ring-1 ring-teal-100 dark:ring-teal-900 mb-3"
          />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Create your PharmVeda AI account
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Your digital health twin</p>
        </div>
        <div className="p-6 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-xl shadow-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              minLength={8}
              required
            />
            {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="bg-teal-600 text-white rounded-lg px-3 py-2 font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {submitting ? "Creating account…" : "Register"}
            </button>
          </form>
          <p className="text-sm mt-4 text-center text-gray-600 dark:text-gray-400">
            Already have an account?{" "}
            <Link to="/login" className="text-teal-700 dark:text-teal-400 underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
