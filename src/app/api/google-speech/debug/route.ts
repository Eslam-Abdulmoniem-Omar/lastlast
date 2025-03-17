import { NextResponse } from "next/server";
import { SpeechClient } from "@google-cloud/speech";
import fs from "fs";
import path from "path";

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
  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  return null;
}

interface CredentialsInfo {
  credentialsFileExists: boolean;
  credentialsPathFound: string | null;
  checkedPaths: string[];
  credentialsEnvVarSet: boolean;
  credentialsEnvPath: string;
  parsedCredentialsValid: boolean;
  projectId: string;
  clientEmail: string;
  privateKeyExists: boolean;
  parseError?: string | undefined;
  tempCredentialsSet?: boolean;
}

interface ResponseType {
  success: boolean;
  environment: {
    nodeVersion: string;
    nodeEnv: string | undefined;
    platform: NodeJS.Platform;
    arch: string;
  };
  credentials: CredentialsInfo;
  speechClient: {
    initialized: boolean;
    error: null | {
      message: string;
      stack?: string;
    };
    keyFileError?: string;
  };
  test: {
    completed: boolean;
    result: string | null;
    error: null | {
      message: string;
      stack?: string;
    };
  };
}

export async function GET() {
  try {
    // Check Node.js version
    const nodeVersion = process.version;
    const nodeEnv = process.env.NODE_ENV;

    // Check all possible credential paths
    const credentialsPath = findCredentialsFile();
    const credentialsExist = !!credentialsPath;

    // Check environment variables
    const hasCredentialsEnvVar = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;

    // Initialize response object
    const response: ResponseType = {
      success: false,
      environment: {
        nodeVersion,
        nodeEnv,
        platform: process.platform,
        arch: process.arch,
      },
      credentials: {
        credentialsFileExists: credentialsExist,
        credentialsPathFound: credentialsPath,
        checkedPaths: possiblePaths,
        credentialsEnvVarSet: hasCredentialsEnvVar,
        credentialsEnvPath:
          process.env.GOOGLE_APPLICATION_CREDENTIALS || "Not set",
        parsedCredentialsValid: false,
        projectId: "",
        clientEmail: "",
        privateKeyExists: false,
        parseError: undefined,
      },
      speechClient: {
        initialized: false,
        error: null,
      },
      test: {
        completed: false,
        result: null,
        error: null,
      },
    };

    // Try to initialize the Speech client
    try {
      // Check if credentials file is valid JSON
      if (credentialsExist) {
        const credentialsContent = fs.readFileSync(credentialsPath!, "utf8");
        try {
          const parsedCredentials = JSON.parse(credentialsContent);
          response.credentials.parsedCredentialsValid = true;
          response.credentials.projectId =
            parsedCredentials.project_id || "Not found in credentials";
          response.credentials.clientEmail =
            parsedCredentials.client_email || "Not found in credentials";
        } catch (parseError) {
          response.credentials.parsedCredentialsValid = false;
          response.credentials.parseError = (parseError as Error).message;
        }
      }

      if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && credentialsExist) {
        // Temporarily set the credentials path for this request
        process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
        response.credentials.tempCredentialsSet = true;
      }

      // Initialize the Speech client
      let speechClient;
      try {
        speechClient = new SpeechClient({
          keyFilename: credentialsPath || undefined,
        });
      } catch (keyFileError) {
        response.speechClient.keyFileError = (keyFileError as Error).message;
        // Try without keyFilename
        speechClient = new SpeechClient();
      }

      response.speechClient.initialized = true;

      // Test the client with a basic API call
      try {
        const [result] = await speechClient.recognize({
          config: {
            encoding: "LINEAR16",
            sampleRateHertz: 16000,
            languageCode: "en-US",
          },
          audio: {
            content: Buffer.from("").toString("base64"),
          },
        });
        response.test.completed = true;
        response.test.result =
          "Successfully connected to Google Cloud Speech API";
        response.success = true;
      } catch (testError) {
        response.test.error = {
          message: (testError as Error).message,
          stack: (testError as Error).stack,
        };
      }
    } catch (clientError) {
      response.speechClient.error = {
        message: (clientError as Error).message,
        stack: (clientError as Error).stack,
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
        stack: (error as Error).stack,
      },
      { status: 500 }
    );
  }
}
