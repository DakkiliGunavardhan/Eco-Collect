import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone?: string;
  dob?: string;
  gender?: string;
  address?: string;
  city?: string;
  country?: string;
  profile_image_url?: string;
  role: "citizen" | "supervisor" | "admin";
  eco_points: number;
  created_at: string;
  updated_at: string;
}

export interface SupervisorDetails {
  id: number;
  employee_id: string;
  user_id: number;
  assigned_area?: string;
  created_at: string;
  name?: string;
  email?: string;
  phone?: string;
  profile_picture?: string;
  performance_score?: number;
}

interface AuthContextType {
  user: User | null;
  supervisor: SupervisorDetails | null;
  token: string | null;
  role: "citizen" | "supervisor" | "admin" | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, requiredRole: "citizen" | "admin") => Promise<void>;
  loginSupervisor: (employeeId: string, password: string) => Promise<void>;
  registerCitizen: (fullName: string, email: string, phone: string, dob: string, password: string) => Promise<void>;
  logout: () => void;
  apiCall: <T = any>(path: string, options?: RequestInit) => Promise<T>;
  backendHost: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const normalizeRole = (r: string | null): "citizen" | "supervisor" | "admin" | null => {
  if (!r) return null;
  const clean = String(r).toLowerCase().trim();
  if (clean === "citizen" || clean === "user" || clean === "client" || clean === "customer") return "citizen";
  if (clean === "admin" || clean === "administrator" || clean === "superadmin" || clean === "admin_user") return "admin";
  if (clean === "supervisor" || clean === "staff") return "supervisor";
  return null;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [supervisor, setSupervisor] = useState<SupervisorDetails | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<"citizen" | "supervisor" | "admin" | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const getBackendHost = () => {
    if (import.meta.env.VITE_BACKEND_URL) {
      return import.meta.env.VITE_BACKEND_URL;
    }
    const hostname = window.location.hostname;
    if (hostname === "localhost" || !hostname) {
      return "http://127.0.0.1:8000";
    }
    return `http://${hostname}:8000`;
  };

  const backendHost = getBackendHost();
  const apiBase = `${backendHost}/api`;

  const safeFetch = async (path: string, options: RequestInit = {}): Promise<Response> => {
    const primaryUrl = `${apiBase}${path}`;
    try {
      return await fetch(primaryUrl, options);
    } catch (err: any) {
      const altHost = backendHost.includes("127.0.0.1")
        ? `http://localhost:8000/api`
        : `http://127.0.0.1:8000/api`;
      try {
        return await fetch(`${altHost}${path}`, options);
      } catch (fallbackErr) {
        throw err;
      }
    }
  };

  const logout = useCallback(() => {
    setToken(null);
    setRole(null);
    setUser(null);
    setSupervisor(null);

    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    localStorage.removeItem("supervisor");
  }, []);

  const apiCall = useCallback(async <T = any>(path: string, options: RequestInit = {}): Promise<T> => {
    let rawToken = token || localStorage.getItem("token");
    if (rawToken && typeof rawToken === "string" && (rawToken.startsWith("Bearer ") || rawToken.startsWith("bearer "))) {
      rawToken = rawToken.slice(7).trim();
    }

    const headers = new Headers(options.headers || {});
    if (rawToken) {
      headers.set("Authorization", `Bearer ${rawToken}`);
    }

    const res = await safeFetch(path, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      if (!path.startsWith("/auth/")) {
        logout();
      }
      throw new Error("Session expired. Please log in again.");
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "An error occurred" }));
      let errorMsg = `Request failed with status ${res.status}`;
      if (typeof err.detail === "string") {
        errorMsg = err.detail;
      } else if (Array.isArray(err.detail)) {
        errorMsg = err.detail.map((d: any) => (typeof d === "string" ? d : d.msg || JSON.stringify(d))).join(", ");
      } else if (err.detail && typeof err.detail === "object") {
        errorMsg = err.detail.msg || JSON.stringify(err.detail);
      } else if (err.message && typeof err.message === "string") {
        errorMsg = err.message;
      }
      throw new Error(errorMsg);
    }

    return res.json();
  }, [token, logout, safeFetch]);

  // Restore session
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedRoleRaw = localStorage.getItem("role");
    const storedRole = normalizeRole(storedRoleRaw);
    const storedUser = localStorage.getItem("user");
    const storedSupervisor = localStorage.getItem("supervisor");

    if (storedToken && storedRole) {
      setToken(storedToken);
      setRole(storedRole);
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {}
      }
      if (storedSupervisor) {
        try {
          setSupervisor(JSON.parse(storedSupervisor));
        } catch {}
      }
    }
    setIsLoading(false);
  }, []);

  // Clear isLoading after auth state (token) is committed to React state
  useEffect(() => {
    if (token && isLoading) {
      setIsLoading(false);
    }
  }, [token, isLoading]);

  const login = async (email: string, password: string, requiredRole: "citizen" | "admin") => {
    try {
      const cleanEmail = email.trim();
      const res = await safeFetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: "Incorrect email or password" }));
        throw new Error(errorData.detail || "Incorrect email or password");
      }

      const data = await res.json();
      let authToken = data.token || data.access_token || data.jwt || data.data?.token || data.data?.access_token;
      if (!authToken) {
        throw new Error("No authentication token received.");
      }

      if (typeof authToken === "string" && (authToken.startsWith("Bearer ") || authToken.startsWith("bearer "))) {
        authToken = authToken.slice(7).trim();
      }

      const rawRole = data.user?.role || data.user?.user_type || data.role || data.user_type || data.data?.user?.role || data.data?.role;
      const userRole = normalizeRole(rawRole ? String(rawRole) : requiredRole) || requiredRole;

      // Verify role
      if (userRole !== requiredRole) {
        throw new Error(`Unauthorized. You do not have access as a ${requiredRole}.`);
      }

      const rawUserData = data.user || data.data?.user || data.data || data || {};
      const normalizedUser: User = {
        id: rawUserData.id || 0,
        email: rawUserData.email || cleanEmail,
        full_name: rawUserData.full_name || rawUserData.name || "User",
        phone: rawUserData.phone || "",
        dob: rawUserData.dob || "",
        gender: rawUserData.gender || "",
        address: rawUserData.address || "",
        city: rawUserData.city || "",
        country: rawUserData.country || "",
        profile_image_url: rawUserData.profile_image_url || rawUserData.profile_picture || "",
        role: userRole,
        eco_points: rawUserData.eco_points || 0,
        created_at: rawUserData.created_at || new Date().toISOString(),
        updated_at: rawUserData.updated_at || new Date().toISOString(),
      };

      // Set localStorage FIRST so route component reads succeed immediately
      localStorage.setItem("token", authToken);
      localStorage.setItem("role", userRole);
      localStorage.setItem("user", JSON.stringify(normalizedUser));
      localStorage.removeItem("supervisor");

      setToken(authToken);
      setRole(userRole);
      setUser(normalizedUser);
      setSupervisor(null);
    } catch (error) {
      throw error;
    }
  };

  const loginSupervisor = async (employeeId: string, password: string) => {
    try {
      const res = await safeFetch("/auth/supervisor/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: employeeId, password }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: "Incorrect Employee ID or password" }));
        throw new Error(errorData.detail || "Incorrect Employee ID or password");
      }

      const data = await res.json();

      let authToken = data.token || data.access_token || data.jwt || data.data?.token || "";
      if (typeof authToken === "string" && (authToken.startsWith("Bearer ") || authToken.startsWith("bearer "))) {
        authToken = authToken.slice(7).trim();
      }

      const mockUser: User = {
        id: data.supervisor.user_id,
        email: data.supervisor.email,
        full_name: data.supervisor.name || "Supervisor",
        phone: data.supervisor.phone,
        role: "supervisor",
        eco_points: 0,
        profile_image_url: data.supervisor.profile_picture,
        created_at: data.supervisor.created_at,
        updated_at: data.supervisor.created_at,
      };

      // Set localStorage FIRST so route component reads succeed immediately
      localStorage.setItem("token", authToken);
      localStorage.setItem("role", "supervisor");
      localStorage.setItem("user", JSON.stringify(mockUser));
      localStorage.setItem("supervisor", JSON.stringify(data.supervisor));

      setToken(authToken);
      setRole("supervisor");
      setSupervisor(data.supervisor);
      setUser(mockUser);
    } catch (error) {
      throw error;
    }
  };

  const registerCitizen = async (fullName: string, email: string, phone: string, dob: string, password: string) => {
    try {
      const data = await apiCall("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone,
          dob: dob || "",
          password,
        }),
      });

      let authToken = data.token || data.access_token || data.jwt || data.data?.token || "";
      if (typeof authToken === "string" && (authToken.startsWith("Bearer ") || authToken.startsWith("bearer "))) {
        authToken = authToken.slice(7).trim();
      }

      const userRole = normalizeRole(data.user?.role || "citizen") || "citizen";
      const normalizedUser = {
        ...data.user,
        role: userRole,
      };

      localStorage.setItem("token", authToken);
      localStorage.setItem("role", userRole);
      localStorage.setItem("user", JSON.stringify(normalizedUser));
      localStorage.removeItem("supervisor");

      setToken(authToken);
      setRole(userRole as "citizen");
      setUser(normalizedUser);
      setSupervisor(null);
    } catch (error) {
      throw error;
    }
  };

  const getActiveUser = (): User | null => {
    if (user) return user;
    const stored = localStorage.getItem("user");
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  };

  const getActiveSupervisor = (): SupervisorDetails | null => {
    if (supervisor) return supervisor;
    const stored = localStorage.getItem("supervisor");
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  };

  const activeUser = getActiveUser();
  const activeSupervisor = getActiveSupervisor();
  const activeToken = token || localStorage.getItem("token");
  const rawRole = role || localStorage.getItem("role");
  const activeRole = normalizeRole(rawRole);
  const isAuthenticated = !!activeToken;

  return (
    <AuthContext.Provider
      value={{
        user: activeUser,
        supervisor: activeSupervisor,
        token: activeToken,
        role: activeRole,
        isAuthenticated,
        isLoading,
        login,
        loginSupervisor,
        registerCitizen,
        logout,
        apiCall,
        backendHost,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};


