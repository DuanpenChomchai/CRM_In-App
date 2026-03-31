import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const [loading, setLoading] = useState(true);
  const [allowedAccess, setAllowedAccess] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setAllowedAccess(false);
      setLoading(false);
      return;
    }

    const checkAuth = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";
        const res = await fetch(`${API_BASE}/api/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          localStorage.clear();
          setAllowedAccess(false);
          setLoading(false);
          return;
        }

        const data = await res.json();

        // ⭐ อนุญาตทุก role เลย
        setAllowedAccess(true);

        // เก็บ user ลง localStorage
        localStorage.setItem("user", JSON.stringify(data.user));
      } catch (e) {
        localStorage.clear();
        setAllowedAccess(false);
      }

      setLoading(false);
    };

    checkAuth();
  }, []);

  if (loading) return <div>Loading...</div>;

  if (!allowedAccess) return <Navigate to="/login" replace />;

  return children;
};

export default ProtectedRoute;
