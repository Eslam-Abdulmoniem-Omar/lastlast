import { OpenAI } from "openai";
import { OpenAIStream, StreamingTextResponse } from "ai";

// IMPORTANT! Set the dynamic to force-dynamic to disable static rendering
export const dynamic = "force-dynamic";

// Create an OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export async function POST(req: Request) {
  try {
    // Remove API route logging

    const { messages } = await req.json();

    // Ask OpenAI for a streaming completion
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      messages,
    });

    // Remove API response logging

    // Convert the response into a friendly text-stream
    const stream = OpenAIStream(response);

    // Respond with the stream
    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error("Error processing chat request");
    return new Response(JSON.stringify({ error: "Error processing request" }), {
      status: 500,
    });
  }
}
