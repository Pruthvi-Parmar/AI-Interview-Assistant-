"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const LogoutButton = () => {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/signout", {
        method: "POST",
      });

      if (response.ok) {
        // Clear localStorage
        localStorage.removeItem("sessionToken");
        localStorage.removeItem("userData");
        
        router.push("/sign-in");
        router.refresh();
      }
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <Button 
      onClick={handleLogout}
      variant="outline"
      size="sm"
    >
      Sign Out
    </Button>
  );
};

export default LogoutButton; 