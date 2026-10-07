import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, normalizeRole } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles: ("citizen" | "supervisor" | "admin")[];
}

const LoadingSpinner: React.FC = () => {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      width: "100vw",
      backgroundColor: "#F8FAFC",
      fontFamily: "Inter, sans-serif"
    }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: "50%",
        border: "4px solid #E2E8F0",
        borderTopColor: "#10B981",
        animation: "spin 1s linear infinite"
      }} />
      <span style={{ marginTop: 16, color: "#64748B", fontWeight: 500 }}>Loading system session...</span>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { token, role, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const activeToken = token || localStorage.getItem("token");
  const rawRole = role || localStorage.getItem("role");
  const activeRole = normalizeRole(rawRole);

  if (!activeToken || !activeRole) {
    if (allowedRoles.includes("admin")) {
      return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }
    if (allowedRoles.includes("supervisor")) {
      return <Navigate to="/supervisor/login" state={{ from: location }} replace />;
    }
    return <Navigate to="/citizen/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(activeRole)) {
    return <Navigate to={`/${activeRole}/dashboard`} replace />;
  }

  return children;
};

interface PublicRouteProps {
  children: React.ReactElement;
}

export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { token, role, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const activeToken = token || localStorage.getItem("token");
  const rawRole = role || localStorage.getItem("role");
  const activeRole = normalizeRole(rawRole);

  if (activeToken && activeRole) {
    return <Navigate to={`/${activeRole}/dashboard`} replace />;
  }

  return children;
};

export const RootRedirect: React.FC = () => {
  const { token, role, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const activeToken = token || localStorage.getItem("token");
  const rawRole = role || localStorage.getItem("role");
  const activeRole = normalizeRole(rawRole);

  if (activeToken && activeRole) {
    return <Navigate to={`/${activeRole}/dashboard`} replace />;
  }

  return <Navigate to="/landing" replace />;
};

