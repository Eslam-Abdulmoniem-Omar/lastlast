import { OpenAI } from "openai";
import { NextResponse } from "next/server";

// IMPORTANT! Set the dynamic to force-dynamic to disable static rendering
export const dynamic = "force-dynamic";

// Create an OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export async function POST(req: Request) {
  try {
    // Log environment variable status (without exposing the key)
    console.log("OpenAI API Key configured:", !!process.env.OPENAI_API_KEY);

    const { messages } = await req.json();
    console.log("Received messages:", messages);

    // Validate OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error("OpenAI API key is not configured");
      return NextResponse.json(
        {
          error:
            "OpenAI API key is not configured. Please check your .env.local file.",
          details:
            "Make sure you have added OPENAI_API_KEY=your_key_here to your .env.local file",
        },
        { status: 500 }
      );
    }

    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error("Invalid messages format");
      return NextResponse.json(
        {
          error: "Invalid messages format",
          details: "Messages must be an array with at least one message",
        },
        { status: 400 }
      );
    }

    console.log("Making OpenAI API request...");

    // Ask OpenAI for a completion without streaming
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    });

    console.log("Received OpenAI response");

    // Parse the response content as JSON
    const content = response.choices[0].message.content;
    let parsedContent;

    try {
      parsedContent = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response as JSON:", parseError);
      return NextResponse.json(
        {
          error: "Failed to parse OpenAI response",
          details: "The response was not in valid JSON format",
        },
        { status: 500 }
      );
    }

    // Return the parsed JSON response
    return NextResponse.json(parsedContent);
  } catch (error) {
    console.error("Error processing chat request:", error);

    // Provide more detailed error information
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorDetails = {
      error: "Error processing request",
      details: errorMessage,
      type: error instanceof Error ? error.constructor.name : typeof error,
      stack: error instanceof Error ? error.stack : undefined,
    };

    return NextResponse.json(errorDetails, { status: 500 });
  }
}
