import { OpenAI } from "openai";

export async function GET() {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "",
    });

    // Try a simple completion to test the API key
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Hello" }],
      max_tokens: 5,
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "OpenAI API is working",
      response: response.choices[0].message.content
    }));
  } catch (error) {
    console.error("OpenAI API test failed:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error",
      details: "Please check your OpenAI API key configuration"
    }), { status: 500 });
  }
} 