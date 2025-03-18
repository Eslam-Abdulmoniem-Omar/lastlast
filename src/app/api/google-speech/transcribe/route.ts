import { NextResponse } from "next/server";
import { SpeechClient } from "@google-cloud/speech";
import path from "path";
import fs from "fs";

// Global variable to store the Speech client instance
let speechClient: SpeechClient | null = null;

// Possible paths for the credentials file
const possiblePaths = [
  path.join(process.cwd(), "src", "metal-cascade-453903-i3-0338e31800ba.json"),
  path.join(process.cwd(), "metal-cascade-453903-i3-0338e31800ba.json"),
  path.join(
    process.cwd(),
    "src",
    "app",
    "metal-cascade-453903-i3-0338e31800ba.json"
  ),
  path.join(
    process.cwd(),
    "public",
    "metal-cascade-453903-i3-0338e31800ba.json"
  ),
  path.join(
    process.cwd(),
    "sayFlunetlastversion",
    "src",
    "metal-cascade-453903-i3-0338e31800ba.json"
  ),
];

// Find the first valid credentials file
function findCredentialsFile() {
  console.log("Searching for credentials file in multiple locations...");

  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      console.log("Found credentials file at:", filePath);
      return filePath;
    }
  }

  console.error("Credentials file not found in any of the expected locations");
  return null;
}

// Initialize the Speech client
function initSpeechClient() {
  try {
    // Find credentials file
    const keyFilePath = findCredentialsFile();
    if (!keyFilePath) {
      console.error(
        "CRITICAL ERROR: Credentials file not found in any location"
      );
      return null;
    }

    // Verify the credentials file is valid JSON
    try {
      const credentialContent = fs.readFileSync(keyFilePath, "utf8");
      JSON.parse(credentialContent); // Test parse to validate
      console.log("Credentials file is valid JSON");
    } catch (parseError) {
      console.error(
        "CRITICAL ERROR: Credentials file is not valid JSON:",
        parseError
      );
      return null;
    }

    // Initialize the client
    console.log("Initializing Speech client with credentials file");

    // First, try initializing with keyFilename
    try {
      const client = new SpeechClient({
        keyFilename: keyFilePath,
      });
      console.log("Speech client initialized successfully with keyFilename");
      return client;
    } catch (keyFileError) {
      console.error("Failed to initialize with keyFilename:", keyFileError);

      // If that fails, try setting the environment variable and initializing without params
      try {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = keyFilePath;
        console.log(
          "Set GOOGLE_APPLICATION_CREDENTIALS environment variable to:",
          keyFilePath
        );

        const client = new SpeechClient();
        console.log(
          "Speech client initialized successfully with environment variable"
        );
        return client;
      } catch (envVarError) {
        console.error(
          "Failed to initialize with environment variable:",
          envVarError
        );
        return null;
      }
    }
  } catch (error) {
    console.error("CRITICAL ERROR: Failed to initialize speech client:", error);
    return null;
  }
}

export async function POST(request: Request) {
  console.log("POST request received at /api/google-speech/transcribe");

  try {
    // Initialize the Speech client if not already initialized
    if (!speechClient) {
      speechClient = initSpeechClient();
    }

    // Check if speech client was successfully initialized
    if (!speechClient) {
      console.error("Speech client initialization failed");
      return NextResponse.json(
        {
          error: "Speech-to-text service not available - credentials issue",
          details:
            "The Google Cloud Speech client could not be initialized. Please check if your credentials file is in the correct location.",
          searchedPaths: possiblePaths,
        },
        { status: 500 }
      );
    }

    console.log("Processing audio transcription request");

    // Parse the form data
    let formData;
    try {
      formData = await request.formData();
    } catch (formError) {
      console.error("Error parsing form data:", formError);
      return NextResponse.json(
        { error: "Invalid form data", details: (formError as Error).message },
        { status: 400 }
      );
    }

    // Get the audio file
    const audioFile = formData.get("audio") as File | null;
    if (!audioFile) {
      console.error("No audio file in request");
      return NextResponse.json(
        { error: "Audio file is required" },
        { status: 400 }
      );
    }

    console.log("Audio file details:", {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size,
    });

    if (audioFile.size === 0) {
      console.error("Empty audio file received");
      return NextResponse.json(
        { error: "Audio file is empty" },
        { status: 400 }
      );
    }

    // Get audio buffer
    let audioBytes;
    try {
      const arrayBuffer = await audioFile.arrayBuffer();
      audioBytes = Buffer.from(arrayBuffer);
      console.log("Audio buffer created, size:", audioBytes.length, "bytes");
    } catch (bufferError) {
      console.error("Error creating audio buffer:", bufferError);
      return NextResponse.json(
        {
          error: "Failed to process audio data",
          details: (bufferError as Error).message,
        },
        { status: 500 }
      );
    }

    // Configure the request
    const audio = {
      content: audioBytes.toString("base64"),
    };

    const config = {
      encoding: "WEBM_OPUS",
      sampleRateHertz: 48000,
      languageCode: "en-US",
      model: "default",
      enableAutomaticPunctuation: true,
    };

    console.log("Configured request for Google Cloud Speech API");
    const recognizeRequest = {
      audio: audio,
      config: config,
    };

    // Detects speech in the audio file
    console.log("Sending request to Google Cloud Speech API...");
    let response;
    try {
      [response] = await speechClient.recognize(recognizeRequest);
      console.log("Received response from Google Cloud Speech API");
    } catch (apiError) {
      console.error("API Error from Google Cloud Speech:", apiError);
      return NextResponse.json(
        {
          error: "Google Speech API error",
          details: (apiError as Error).message,
        },
        { status: 500 }
      );
    }

    // Process the results
    if (!response.results || response.results.length === 0) {
      console.log("No transcription results received");
      return NextResponse.json({
        transcript: "",
        message: "No speech detected in the audio",
      });
    }

    // Concatenate the transcription results
    let transcript = "";
    let confidence = 0;
    let resultsCount = 0;

    response.results.forEach((result) => {
      if (result.alternatives && result.alternatives.length > 0) {
        transcript += result.alternatives[0].transcript;
        if (result.alternatives[0].confidence) {
          confidence += result.alternatives[0].confidence;
          resultsCount++;
        }
      }
    });

    // Calculate average confidence if available
    const avgConfidence = resultsCount > 0 ? confidence / resultsCount : null;

    console.log("Transcription successful:", {
      transcript,
      confidence: avgConfidence,
    });

    return NextResponse.json({
      transcript,
      confidence: avgConfidence,
      resultsCount,
    });
  } catch (error) {
    console.error("Unhandled error in transcription process:", error);
    return NextResponse.json(
      {
        error: "Error transcribing audio",
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
