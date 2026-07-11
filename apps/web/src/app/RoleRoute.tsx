import { Navigate, Outlet } from "react-router-dom";
import { ROLE_RANK, type UserRole } from "@bluwheelz/shared";
import { useAuth } from "@/hooks/useAuth";

/** Gates a subtree of routes behind a minimum role, redirecting unauthorized users back to the dashboard. */
export function RoleRoute({ minRole }: { minRole: UserRole }) {
  const { user } = useAuth();
  if (!user || ROLE_RANK[user.role] < ROLE_RANK[minRole]) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
