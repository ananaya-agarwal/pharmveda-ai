import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Upload from "./pages/Upload";
import Timeline from "./pages/Timeline";
import DocumentDetail from "./pages/DocumentDetail";
import Trends from "./pages/Trends";
import Chat from "./pages/Chat";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/upload" element={<Upload />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/documents/:id" element={<DocumentDetail />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="/chat" element={<Chat />} />
        </Route>
        <Route path="*" element={<Navigate to="/timeline" replace />} />
      </Routes>
    </AuthProvider>
  );
}
