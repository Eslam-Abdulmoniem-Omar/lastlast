import { Metadata } from "next";
import { Suspense } from "react";
import LoadingDots from "@/components/ui/loading-dots";

export const metadata: Metadata = {
  title: "Speech to Text Practice | SayFluent",
  description:
    "Practice speaking with AI feedback using speech-to-text technology",
};

// Force dynamic rendering to prevent static prerendering issues
export const dynamic = "force-dynamic";

// Import the client component
import SpeechToTextClient from "./client";

export default function SpeechToTextPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <LoadingDots />
        </div>
      }
    >
      <SpeechToTextClient />
    </Suspense>
  );
}
