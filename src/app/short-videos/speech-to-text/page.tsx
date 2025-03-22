"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import LoadingDots from "@/components/ui/loading-dots";

// Dynamically import the content component with no SSR
const SpeechToTextContent = dynamic(
  () => import("@/components/SpeechToTextContent"),
  { ssr: false }
);

export default function SpeechToTextPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <LoadingDots />
        </div>
      }
    >
      <SpeechToTextContent />
    </Suspense>
  );
}
