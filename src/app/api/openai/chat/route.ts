import { NextResponse } from "next/server";
import OpenAI from "openai";

// IMPORTANT! Set the dynamic to force-dynamic to disable static rendering
export const dynamic = "force-dynamic";

// Create an OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    // Log API key status (without exposing the key)
    console.log("OpenAI API Key configured:", !!process.env.OPENAI_API_KEY);

    const body = await request.json();
    const { messages } = body;

    // Log received messages
    console.log("Received messages:", messages);

    // Validate OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error("OpenAI API key is not configured");
      return NextResponse.json(
        { error: "OpenAI API key is not configured" },
        { status: 500 }
      );
    }

    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Invalid messages format" },
        { status: 400 }
      );
    }

    // Determine the type of request
    const isVocabularyRequest = messages[0].content.includes(
      "Translate this word:"
    );
    const isTranscriptRequest = messages[0].content.includes(
      "You are a helpful assistant that processes dialogue segments"
    );
    const isRoleplayRequest = messages[0].content.includes(
      "a character in a roleplay conversation"
    );

    // Configure request based on type
    const requestConfig = {
      model: isRoleplayRequest ? "gpt-4o" : "gpt-3.5-turbo",
      messages: messages,
      temperature: isRoleplayRequest ? 0.9 : 0.7,
      max_tokens: isVocabularyRequest ? 200 : isRoleplayRequest ? 150 : 1000,
      response_format: isRoleplayRequest ? undefined : { type: "json_object" },
    };

    // Make the OpenAI API request
    const completion = await openai.chat.completions.create(requestConfig);

    // Log the response
    console.log("OpenAI response:", completion.choices[0].message);

    // For transcript requests, ensure the response is an array
    if (isTranscriptRequest) {
      try {
        const content = completion.choices[0].message.content;
        const parsedContent = JSON.parse(content);

        // Ensure the response is an array
        if (!Array.isArray(parsedContent)) {
          throw new Error("Response is not an array");
        }

        return NextResponse.json(parsedContent);
      } catch (parseError) {
        console.error("Failed to parse transcript response:", parseError);
        return NextResponse.json(
          { error: "Failed to parse transcript response" },
          { status: 500 }
        );
      }
    }

    // For roleplay requests, return the plain text response
    if (isRoleplayRequest) {
      return NextResponse.json({
        text: completion.choices[0].message.content,
      });
    }

    // For vocabulary requests, return the content directly
    return NextResponse.json({
      content: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error("Error in OpenAI API route:", error);
    return NextResponse.json(
      {
        error: "Failed to process request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
