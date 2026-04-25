import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Customer from "@/pages/Customer";
import Technician from "@/pages/Technician";
import Admin from "@/pages/Admin";

function Protected({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center text-gold font-serif text-2xl">Niva Novus</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  if (user.role === "technician") return <Navigate to="/tech" replace />;
  return <Navigate to="/app" replace />;
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<RoleRedirect />} />
            <Route path="/app/*" element={<Protected roles={["customer"]}><Customer /></Protected>} />
            <Route path="/tech/*" element={<Protected roles={["technician"]}><Technician /></Protected>} />
            <Route path="/admin/*" element={<Protected roles={["admin"]}><Admin /></Protected>} />
          </Routes>
        </BrowserRouter>
        <Toaster theme="dark" position="top-right" />
      </AuthProvider>
    </div>
  );
}

export default App;
