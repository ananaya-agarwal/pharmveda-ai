import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";

const navItems = [
  { to: "/upload", label: "Upload" },
  { to: "/timeline", label: "Timeline" },
  { to: "/trends", label: "Trends" },
  { to: "/chat", label: "Ask a question" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const initial = user?.email?.[0]?.toUpperCase() || "?";
  const isChatRoute = location.pathname === "/chat";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col transition-colors">
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200 dark:border-gray-800 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-2.5 gap-3">
          <Link
            to="/upload"
            className="flex items-center gap-3 rounded-lg -m-1 p-1 hover:opacity-80 transition-opacity"
          >
            <img
              src="/logo.png"
              alt="PharmVeda AI logo"
              className="h-12 w-12 rounded-xl object-cover ring-1 ring-teal-100 dark:ring-teal-900 shadow-sm"
            />
            <div className="leading-tight">
              <div className="font-semibold text-teal-800 dark:text-teal-400 tracking-tight text-base">
                PharmVeda AI
              </div>
              <div className="text-[11px] text-gray-400 dark:text-gray-500 hidden sm:block">
                Digital Health Twin
              </div>
            </div>
          </Link>
          <nav className="flex gap-1 text-sm">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  "px-3 py-1.5 rounded-full transition-colors " +
                  (isActive
                    ? "bg-teal-50 text-teal-700 font-medium dark:bg-teal-950 dark:text-teal-400"
                    : "text-gray-600 hover:text-teal-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-teal-400 dark:hover:bg-gray-800")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <div className="hidden md:flex items-center gap-2">
              <span className="h-7 w-7 rounded-full bg-teal-600 text-white text-xs font-semibold flex items-center justify-center">
                {initial}
              </span>
              <span className="max-w-[160px] truncate">{user?.email}</span>
            </div>
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-teal-700 hover:underline dark:text-gray-400 dark:hover:text-teal-400"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main
        className={
          isChatRoute
            ? "flex-1 flex flex-col min-h-0"
            : "max-w-5xl w-full mx-auto px-4 py-6 flex-1"
        }
      >
        <Outlet />
      </main>
    </div>
  );
}
