import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { trpc } from "@/lib/trpc";

interface User {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: "user" | "admin";
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: () => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authMe = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation();

  useEffect(() => {
    if (authMe.data) {
      setUser(authMe.data as User);
      setIsLoading(false);
      setError(null);
    } else if (authMe.error) {
      setUser(null);
      setIsLoading(false);
      setError("Failed to load user");
    } else {
      setIsLoading(true);
    }
  }, [authMe.data, authMe.error]);

  const login = () => {
    window.location.href = "/auth/github";
  };

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync(undefined);
      setUser(null);
      window.location.href = "/";
    } catch (err) {
      setError("Failed to logout");
      console.error("Logout error:", err);
    }
  };

  const refreshUser = async () => {
    await authMe.refetch();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        logout,
        refreshUser,
      }}
    >
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
