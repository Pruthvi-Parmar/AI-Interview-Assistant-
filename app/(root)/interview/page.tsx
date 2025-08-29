import Agent from "@/components/Agent";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { getActiveInterviewTemplates } from "@/lib/actions/general.action";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import AuthCheck from "@/components/AuthCheck";

const Page = async () => {
  const user = await getCurrentUser();
  const templates = await getActiveInterviewTemplates();

  console.log("Current user in interview page:", user);
  console.log("Available templates:", templates);
  console.log("User is null:", user === null);
  console.log("Templates count:", templates.length);

  // If server-side authentication fails, let client-side handle it
  if (!user) {
    return (
      <AuthCheck requireAuth={true}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
          <h2 className="text-2xl font-bold">Choose Your Interview</h2>
          <p className="text-gray-600 text-center max-w-md">
            Select an interview template to start practicing with our AI interviewer
          </p>
          <div className="text-center">
            <p className="text-gray-600 mb-4">Please sign in to start an interview</p>
            <Button asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
          </div>
        </div>
      </AuthCheck>
    );
  }

  console.log("User is authenticated, showing templates");
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Choose Your Interview</h2>
        <p className="text-gray-600">
          Select an interview template to start practicing with our AI interviewer
        </p>
      </div>

      {templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="card-border p-6">
              <h3 className="text-xl font-semibold mb-2">{template.title}</h3>
              <p className="text-gray-600 mb-4">{template.description}</p>
              <div className="space-y-2 text-sm text-gray-500">
                <p>Industry: {template.industry}</p>
                <p>Experience: {template.experienceLevel}</p>
                <p>Questions: {template.questionCount}</p>
                <p>Duration: {template.duration} minutes</p>
              </div>
              <div className="mt-4">
                <Agent
                  userName={user.name}
                  userId={user.id}
                  type="generate"
                  templateId={template.id}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">No interview templates available</p>
          <p className="text-sm text-gray-500">
            Contact an administrator to create interview templates
          </p>
        </div>
      )}
    </div>
  );
};

export default Page;
