import { createContext, useContext, useState, useMemo, useEffect } from "react";
import {
  ROLES,
  ROLE_HIERARCHY,
  hasPermission,
  canManageRole,
  getSubordinateRoles,
} from "../constants/roles";
import { authAPI } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      authAPI
        .getProfile()
        .then((data) => {
          if (data.success) {
            setUser({
              id: data.user.id || data.user._id,
              username: data.user.username,
              email: data.user.email,
              role: data.user.role,
              profile: data.user.profile,
              employment: data.user.employment,
              leaveBalance: data.user.leaveBalance,
              isAdmin: data.user.role === "ADMIN",
            });
          } else {
            localStorage.removeItem("token");
            localStorage.removeItem("role");
          }
        })
        .catch(() => {
          localStorage.removeItem("token");
          localStorage.removeItem("role");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    try {
      const data = await authAPI.login(username, password);
      if (data.success) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("role", data.user.role);
        setUser({
          id: data.user.id || data.user._id,
          username: data.user.username,
          email: data.user.email,
          role: data.user.role,
          profile: data.user.profile,
          employment: data.user.employment,
          leaveBalance: data.user.leaveBalance,
          isAdmin: data.user.role === "ADMIN",
        });
        return { success: true };
      }
      return { success: false, message: data.message || "Login failed" };
    } catch (error) {
      return { success: false, message: "Network error. Please try again." };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      isAdmin: user?.isAdmin || false,
      role: user?.role || null,
      login,
      logout,
      hasPermission: (level) => user && hasPermission(user.role, level),
      canManage: (targetRole) => user && canManageRole(user.role, targetRole),
      getSubordinates: () => (user ? getSubordinateRoles(user.role) : []),
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
