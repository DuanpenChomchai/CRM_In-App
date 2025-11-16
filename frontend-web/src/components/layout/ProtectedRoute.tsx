import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");

  if (!token || !user) return <Navigate to="/login" replace />;

  const parsed = JSON.parse(user);

  // อนุญาตเฉพาะ 3 role เท่านั้น
  const allowed = ["ADMIN", "SALE", "MANAGER"];

  if (!allowed.includes(parsed.role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
