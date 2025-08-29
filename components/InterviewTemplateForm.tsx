"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { X, Plus } from "lucide-react";

interface InterviewTemplateFormProps {
  templateId?: string;
  mode: "create" | "edit";
}

const INDUSTRIES = [
  "Software Engineering",
  "Data Science",
  "Product Management",
  "Marketing",
  "Sales",
  "Design",
  "Finance",
  "Human Resources",
  "Operations",
  "Customer Support",
];

const EXPERIENCE_LEVELS = ["Junior", "Mid-level", "Senior"] as const;
const DIFFICULTY_LEVELS = ["Easy", "Medium", "Hard", "Custom"] as const;
const QUESTION_TYPES = ["technical", "behavioral", "situational", "mixed"] as const;

export default function InterviewTemplateForm({ templateId, mode }: InterviewTemplateFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    industry: "",
    experienceLevel: "Junior" as const,
    questionCount: 10,
    questionTypes: [
      { type: "technical" as const, percentage: 60 },
      { type: "behavioral" as const, percentage: 40 },
    ],
    difficultyLevel: "Medium" as "Easy" | "Medium" | "Hard" | "Custom",
    customDifficulty: 5,
    duration: 30,
    customInstructions: "",
    tags: [] as string[],
    estimatedSalary: {
      min: 50000,
      max: 80000,
      currency: "USD",
    },
  });

  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    if (templateId && mode === "edit") {
      fetchTemplate();
    }
  }, [templateId, mode]);

  const fetchTemplate = async () => {
    try {
      const response = await fetch(`/api/admin/templates/${templateId}`);
      const data = await response.json();

      if (data.success) {
        setFormData(data.data);
        setSystemPrompt(data.data.systemPrompt || "");
      } else {
        toast.error("Failed to fetch template");
      }
    } catch (error) {
      console.error("Error fetching template:", error);
      toast.error("An error occurred while fetching template");
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleQuestionTypeChange = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      questionTypes: prev.questionTypes.map((qt, i) =>
        i === index ? { ...qt, [field]: value } : qt
      ),
    }));
  };

  const addQuestionType = () => {
    setFormData(prev => ({
      ...prev,
      questionTypes: [...prev.questionTypes, { type: "technical", percentage: 0 }],
    }));
  };

  const removeQuestionType = (index: number) => {
    setFormData(prev => ({
      ...prev,
      questionTypes: prev.questionTypes.filter((_, i) => i !== index),
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const generateSystemPrompt = async () => {
    try {
      const response = await fetch("/api/admin/templates/generate-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        setSystemPrompt(data.data);
        setIsPreviewOpen(true);
      } else {
        toast.error("Failed to generate system prompt");
      }
    } catch (error) {
      console.error("Error generating system prompt:", error);
      toast.error("An error occurred while generating system prompt");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const url = mode === "create" 
        ? "/api/admin/templates" 
        : `/api/admin/templates/${templateId}`;
      
      const method = mode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Template ${mode === "create" ? "created" : "updated"} successfully!`);
        router.push("/admin/templates");
      } else {
        toast.error(data.error || `Failed to ${mode} template`);
      }
    } catch (error) {
      console.error(`Error ${mode}ing template:`, error);
      toast.error(`An error occurred while ${mode}ing template`);
    } finally {
      setIsLoading(false);
    }
  };

  const totalPercentage = formData.questionTypes.reduce((sum, qt) => sum + qt.percentage, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            {mode === "create" ? "Create New Template" : "Edit Template"}
          </h1>
          <p className="text-gray-600 mt-2">
            {mode === "create" 
              ? "Create a new interview template with custom configurations" 
              : "Update the interview template configuration"
            }
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Template Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="e.g., Senior Frontend Developer Interview"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry *</Label>
                <select
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => handleInputChange("industry", e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Select Industry</option>
                  {INDUSTRIES.map(industry => (
                    <option key={industry} value={industry}>{industry}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Describe the interview template and its purpose..."
                className="w-full p-2 border border-gray-300 rounded-md h-20"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="experienceLevel">Experience Level *</Label>
                <select
                  id="experienceLevel"
                  value={formData.experienceLevel}
                  onChange={(e) => handleInputChange("experienceLevel", e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                >
                  {EXPERIENCE_LEVELS.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="questionCount">Number of Questions *</Label>
                <Input
                  id="questionCount"
                  type="number"
                  min="1"
                  max="50"
                  value={formData.questionCount}
                  onChange={(e) => handleInputChange("questionCount", parseInt(e.target.value))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes) *</Label>
                <Input
                  id="duration"
                  type="number"
                  min="5"
                  max="180"
                  value={formData.duration}
                  onChange={(e) => handleInputChange("duration", parseInt(e.target.value))}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Question Types */}
        <Card>
          <CardHeader>
            <CardTitle>Question Types</CardTitle>
            <p className="text-sm text-gray-600">
              Configure the mix of question types (total must equal 100%)
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.questionTypes.map((qt, index) => (
              <div key={index} className="flex items-center gap-4">
                <select
                  value={qt.type}
                  onChange={(e) => handleQuestionTypeChange(index, "type", e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded-md"
                >
                  {QUESTION_TYPES.map(type => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={qt.percentage}
                  onChange={(e) => handleQuestionTypeChange(index, "percentage", parseInt(e.target.value))}
                  className="w-24"
                  placeholder="%"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeQuestionType(index)}
                  disabled={formData.questionTypes.length === 1}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            <Button
              type="button"
              variant="outline"
              onClick={addQuestionType}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Question Type
            </Button>

            <div className="text-sm">
              <span className={totalPercentage === 100 ? "text-green-600" : "text-red-600"}>
                Total: {totalPercentage}%
              </span>
              {totalPercentage !== 100 && (
                <span className="text-red-600 ml-2">
                  (Must equal 100%)
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Difficulty and Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Difficulty & Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="difficultyLevel">Difficulty Level *</Label>
                <select
                  id="difficultyLevel"
                  value={formData.difficultyLevel}
                  onChange={(e) => handleInputChange("difficultyLevel", e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                >
                  {DIFFICULTY_LEVELS.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
              {formData.difficultyLevel === "Custom" && (
                <div className="space-y-2">
                  <Label htmlFor="customDifficulty">Custom Difficulty (1-10)</Label>
                  <Input
                    id="customDifficulty"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.customDifficulty}
                    onChange={(e) => handleInputChange("customDifficulty", parseInt(e.target.value))}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customInstructions">Custom Instructions</Label>
              <textarea
                id="customInstructions"
                value={formData.customInstructions}
                onChange={(e) => handleInputChange("customInstructions", e.target.value)}
                placeholder="Additional instructions for the AI interviewer..."
                className="w-full p-2 border border-gray-300 rounded-md h-24"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag..."
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              />
              <Button type="button" onClick={addTag}>
                Add
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Salary Range */}
        <Card>
          <CardHeader>
            <CardTitle>Estimated Salary Range</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salaryMin">Minimum Salary</Label>
                <Input
                  id="salaryMin"
                  type="number"
                  min="0"
                  value={formData.estimatedSalary.min}
                  onChange={(e) => handleInputChange("estimatedSalary", {
                    ...formData.estimatedSalary,
                    min: parseInt(e.target.value)
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salaryMax">Maximum Salary</Label>
                <Input
                  id="salaryMax"
                  type="number"
                  min="0"
                  value={formData.estimatedSalary.max}
                  onChange={(e) => handleInputChange("estimatedSalary", {
                    ...formData.estimatedSalary,
                    max: parseInt(e.target.value)
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  value={formData.estimatedSalary.currency}
                  onChange={(e) => handleInputChange("estimatedSalary", {
                    ...formData.estimatedSalary,
                    currency: e.target.value
                  })}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CAD">CAD</option>
                  <option value="AUD">AUD</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <Button
            type="button"
            variant="outline"
            onClick={generateSystemPrompt}
            disabled={totalPercentage !== 100}
          >
            Preview System Prompt
          </Button>
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || totalPercentage !== 100}
            >
              {isLoading ? "Saving..." : mode === "create" ? "Create Template" : "Update Template"}
            </Button>
          </div>
        </div>
      </form>

      {/* System Prompt Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">System Prompt Preview</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPreviewOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="bg-gray-100 p-4 rounded-md">
              <pre className="whitespace-pre-wrap text-sm">{systemPrompt}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
