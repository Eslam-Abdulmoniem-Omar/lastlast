import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Log request received
    console.log("Speech test API called");

    // Check if the request is a FormData request
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      console.log("Invalid content type:", contentType);
      return NextResponse.json(
        { error: "Invalid content type. Expected multipart/form-data" },
        { status: 400 }
      );
    }

    // Parse the form data
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      console.log("No audio file found in request");
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Log audio file info
    console.log("Received audio file:", {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size,
    });

    // This is a mock API that simply returns a successful response
    // without actually processing the audio

    return NextResponse.json({
      success: true,
      transcript: "This is a mock transcript from the test API.",
      confidence: 0.95,
      processingTimeMs: 120,
      audioDetails: {
        format: audioFile.type,
        sizeBytes: audioFile.size,
        filename: audioFile.name,
      },
    });
  } catch (error) {
    console.error("Error in speech test API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
