import GPT4oMiniTest from "@/components/GPT4oMiniTest";

export default function GPT4oMiniPage() {
  return (
    <div className="container mx-auto py-8 h-screen flex flex-col">
      <h1 className="text-3xl font-bold mb-6 text-center">GPT-4o-mini Demo</h1>
      <div className="flex-1">
        <GPT4oMiniTest />
      </div>
    </div>
  );
}
