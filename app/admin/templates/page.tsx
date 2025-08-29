"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface InterviewTemplate {
  id: string;
  title: string;
  description: string;
  industry: string;
  experienceLevel: string;
  questionCount: number;
  difficultyLevel: string;
  duration: number;
  isActive: boolean;
  createdAt: string;
  tags: string[];
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<InterviewTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/admin/templates");
      const data = await response.json();

      if (data.success) {
        setTemplates(data.data.data);
      } else {
        toast.error("Failed to fetch templates");
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("An error occurred while fetching templates");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/templates/${templateId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Template deleted successfully");
        fetchTemplates();
      } else {
        toast.error(data.error || "Failed to delete template");
      }
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("An error occurred while deleting template");
    }
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
        <h1 className="text-3xl font-bold">Interview Templates</h1>
        <Button onClick={() => window.location.href = "/admin/templates/new"}>
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{template.title}</CardTitle>
                <Badge variant={template.isActive ? "default" : "secondary"}>
                  {template.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">{template.description}</p>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Industry:</span>
                  <span className="text-sm font-medium">{template.industry}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Level:</span>
                  <span className="text-sm font-medium">{template.experienceLevel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Questions:</span>
                  <span className="text-sm font-medium">{template.questionCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Difficulty:</span>
                  <span className="text-sm font-medium">{template.difficultyLevel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Duration:</span>
                  <span className="text-sm font-medium">{template.duration} min</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-4">
                {template.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = `/admin/templates/${template.id}/edit`}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteTemplate(template.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600">No templates found</p>
          <Button 
            onClick={() => window.location.href = "/admin/templates/new"}
            className="mt-4"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create First Template
          </Button>
        </div>
      )}
    </div>
  );
}
