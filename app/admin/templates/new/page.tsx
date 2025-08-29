import InterviewTemplateForm from "@/components/InterviewTemplateForm";

export default function NewTemplatePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <InterviewTemplateForm mode="create" />
    </div>
  );
}
