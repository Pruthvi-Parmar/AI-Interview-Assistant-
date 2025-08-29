import InterviewTemplateForm from "@/components/InterviewTemplateForm";

interface EditTemplatePageProps {
  params: {
    id: string;
  };
}

export default function EditTemplatePage({ params }: EditTemplatePageProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <InterviewTemplateForm mode="edit" templateId={params.id} />
    </div>
  );
}
