import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Interview Not Found</h2>
        <p className="text-lg text-gray-600 mb-6">
          The interview you're looking for doesn't exist or may have been removed.
        </p>
      </div>
      
      <div className="flex gap-4">
        <Button asChild className="btn-primary">
          <Link href="/">Go Home</Link>
        </Button>
        
        <Button asChild variant="outline">
          <Link href="/interview">Start New Interview</Link>
        </Button>
      </div>
    </div>
  );
} 