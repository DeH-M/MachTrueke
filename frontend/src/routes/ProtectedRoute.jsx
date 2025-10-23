import { Navigate, Outlet } from "react-router-dom";
import useAuth from "../store/authStore";

export default function ProtectedRoute() {
  const { isAuth, loading } = useAuth();
  if (loading) return null; // ya mostramos loader en AppInit
  return isAuth ? <Outlet /> : <Navigate to="/login" replace />;
}
