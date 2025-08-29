import Link from "next/link";
import Image from "next/image";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <>
      <section className="card-cta">
        <div className="flex flex-col gap-6 max-w-lg">
          <h2>Get Interview-Ready with AI-Powered Practice & Feedback</h2>
          <p className="text-lg">
            Practice real interview questions & get instant feedback
          </p>

          <Button asChild className="btn-primary max-sm:w-full">
            <Link href="/interview">Start an Interview</Link>
          </Button>
        </div>

        <Image
          src="/robot.png"
          alt="robo-dude"
          width={400}
          height={400}
          className="max-sm:hidden"
        />
      </section>

      <section className="flex flex-col gap-6 mt-8">
        <h2>Welcome to InterviewPro</h2>
        <p className="text-lg text-gray-600">
          Sign in to start practicing with AI-powered interviews.
        </p>

        <div className="card-border p-6 text-center">
          <h3 className="text-xl font-semibold mb-4">Get Started</h3>
          <p className="text-gray-600 mb-4">
            Create an account or sign in to start practicing with our AI interviewer.
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild>
              <Link href="/sign-up">Sign Up</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/sign-in">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-6 mt-8">
        <h2>Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card-border p-6">
            <h3 className="text-xl font-semibold mb-4">AI-Powered Interviews</h3>
            <p className="text-gray-600">
              Practice with intelligent AI that adapts to your responses and provides real-time feedback.
            </p>
          </div>
          
          <div className="card-border p-6">
            <h3 className="text-xl font-semibold mb-4">Multiple Question Types</h3>
            <p className="text-gray-600">
              Technical, behavioral, and situational questions tailored to your role and experience level.
            </p>
          </div>
          
          <div className="card-border p-6">
            <h3 className="text-xl font-semibold mb-4">Detailed Feedback</h3>
            <p className="text-gray-600">
              Get comprehensive feedback on your performance with actionable insights for improvement.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
