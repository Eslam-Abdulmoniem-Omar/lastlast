import EnhancedSpeechRecorderExample from "@/components/EnhancedSpeechRecorderExample";

export const metadata = {
  title: "Enhanced Speech Recording",
  description: "Practice speaking with enhanced speech recognition",
};

export default function EnhancedSpeechPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <EnhancedSpeechRecorderExample />
      </div>
    </main>
  );
}
