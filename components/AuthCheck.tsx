"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUserFromStorage } from "@/lib/utils";

interface AuthCheckProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export default function AuthCheck({ children, requireAuth = true }: AuthCheckProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      const user = getCurrentUserFromStorage();
      setIsAuthenticated(!!user);
      setIsLoading(false);
      
      if (requireAuth && !user) {
        router.push("/sign-in");
      }
    };

    checkAuth();
  }, [requireAuth, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return null; // Will redirect to sign-in
  }

  return <>{children}</>;
}
