import { NextResponse } from "next/server";
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

interface ErrorDetails {
  error: string;
  message: string;
}

interface Result {
  success: boolean;
  details: ErrorDetails | null;
}

export async function GET() {
  try {
    // Search all possible paths
    const results = [];
    let foundCredentialsFile = false;
    let credentialsData = null;

    for (const credentialsPath of possiblePaths) {
      const exists = fs.existsSync(credentialsPath);

      const result: Result = {
        success: false,
        details: null,
      };

      if (exists) {
        try {
          const fileContent = fs.readFileSync(credentialsPath, "utf8");
          const fileSize = fileContent.length;
          result.success = true;
          result.details = null;

          try {
            const credentials = JSON.parse(fileContent);
            result.success = true;

            // Store first valid credentials data
            if (!foundCredentialsFile) {
              foundCredentialsFile = true;
              credentialsData = {
                projectId: credentials.project_id || "No project ID found",
                clientEmail: credentials.client_email ? "Present" : "Missing",
                privateKeyExists: !!credentials.private_key,
                fileSize: fileContent.length,
              };
            }
          } catch (parseError) {
            result.details = {
              error: "Invalid JSON",
              message: (parseError as Error).message,
            };
          }
        } catch (readError) {
          result.details = {
            error: "File read error",
            message: (readError as Error).message,
          };
        }
      }

      results.push(result);
    }

    const currentDirectory = process.cwd();
    const srcPath = path.join(currentDirectory, "src");
    const srcExists = fs.existsSync(srcPath);
    let srcContents: string[] = [];

    if (srcExists) {
      try {
        srcContents = fs.readdirSync(srcPath);
      } catch (dirError) {
        console.error("Error reading src directory:", dirError);
      }
    }

    if (foundCredentialsFile) {
      return NextResponse.json({
        status: "success",
        message: "Google Cloud credentials file found and valid",
        searchResults: results,
        foundValidFile: true,
        ...credentialsData,
        diagnostics: {
          currentWorkingDirectory: currentDirectory,
          srcDirectoryExists: srcExists,
          srcDirectoryContents: srcContents,
        },
      });
    } else {
      return NextResponse.json(
        {
          status: "error",
          message:
            "Google Cloud credentials file not found in any expected location",
          searchResults: results,
          diagnostics: {
            currentWorkingDirectory: currentDirectory,
            srcDirectoryExists: srcExists,
            srcDirectoryContents: srcContents,
          },
        },
        { status: 404 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: "An error occurred while checking credentials",
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
