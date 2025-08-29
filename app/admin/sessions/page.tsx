"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface InterviewSession {
  id: string;
  templateId: string;
  userId: string;
  status: string;
  startTime?: string;
  endTime?: string;
  duration: number;
  createdAt: string;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch("/api/admin/sessions");
      const data = await response.json();

      if (data.success) {
        setSessions(data.data.data);
      } else {
        toast.error("Failed to fetch sessions");
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
      toast.error("An error occurred while fetching sessions");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "in_progress":
        return "default";
      case "pending":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Interview Sessions</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sessions.map((session) => (
          <Card key={session.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">Session {session.id.slice(-8)}</CardTitle>
                <Badge variant={getStatusColor(session.status)}>
                  {session.status.replace("_", " ")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">User ID:</span>
                  <span className="text-sm font-medium">{session.userId.slice(-8)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Template ID:</span>
                  <span className="text-sm font-medium">{session.templateId?.slice(-8) || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Duration:</span>
                  <span className="text-sm font-medium">{session.duration} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Created:</span>
                  <span className="text-sm font-medium">{formatDate(session.createdAt)}</span>
                </div>
                {session.startTime && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Started:</span>
                    <span className="text-sm font-medium">{formatDate(session.startTime)}</span>
                  </div>
                )}
                {session.endTime && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Ended:</span>
                    <span className="text-sm font-medium">{formatDate(session.endTime)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {sessions.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600">No interview sessions found</p>
        </div>
      )}
    </div>
  );
}
