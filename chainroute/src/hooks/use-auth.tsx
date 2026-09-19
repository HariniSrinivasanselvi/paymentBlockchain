import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useGetCurrentUser } from "@workspace/api-client-react";
import { User, UserRole } from "@workspace/api-client-react/src/generated/api.schemas";
import { useLocation } from "wouter";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isError: boolean;
  hasRole: (roles: UserRole[]) => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading, isError } = useGetCurrentUser({
    query: {
      retry: false,
    }
  });

  const hasRole = (roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading, isError, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function ProtectedRoute({ children, allowedRoles }: { children: ReactNode, allowedRoles?: UserRole[] }) {
  const { user, isLoading, isError, hasRole } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && (isError || !user)) {
      setLocation("/login");
    } else if (!isLoading && user && allowedRoles && !hasRole(allowedRoles)) {
      setLocation("/");
    }
  }, [user, isLoading, isError, setLocation, allowedRoles, hasRole]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user || (allowedRoles && !hasRole(allowedRoles))) {
    return null;
  }

  return <>{children}</>;
}
