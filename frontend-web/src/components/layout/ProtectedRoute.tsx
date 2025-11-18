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
        const res = await fetch("http://localhost:3000/api/me", {
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

        // อนุญาตเฉพาะ 3 role
        const allowed = ["ADMIN", "SALE", "MANAGER"];

        if (!allowed.includes(data.user.role)) {
          setAllowedAccess(false);
        } else {
          // อัปเดต user ใหม่ (token เดิมใช้ได้)
          localStorage.setItem("user", JSON.stringify(data.user));
          setAllowedAccess(true);
        }
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
