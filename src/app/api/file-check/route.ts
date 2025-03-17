import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    // Get current working directory
    const cwd = process.cwd();

    // Define the expected path
    const expectedPath = path.join(
      cwd,
      "src",
      "metal-cascade-453903-i3-0338e31800ba.json"
    );

    // Check if file exists at expected path
    const fileExists = fs.existsSync(expectedPath);

    // Try to list files in the src directory
    const srcPath = path.join(cwd, "src");
    let srcFiles: string[] = [];

    if (fs.existsSync(srcPath)) {
      srcFiles = fs
        .readdirSync(srcPath)
        .filter(
          (file) =>
            file.endsWith(".json") ||
            file.includes("metal") ||
            file.includes("cascade")
        );
    }

    // Search for similar files in src directory and subdirectories
    interface SearchResult {
      name: string;
      path: string;
      size: number;
    }
    const searchResults: SearchResult[] = [];
    if (fs.existsSync(srcPath)) {
      const walkDir = (dir: string, depth = 0) => {
        if (depth > 3) return; // Limit depth to avoid infinite recursion

        const files = fs.readdirSync(dir);

        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);

          if (stat.isDirectory()) {
            walkDir(filePath, depth + 1);
          } else if (
            file.endsWith(".json") ||
            file.includes("metal") ||
            file.includes("cascade") ||
            file.includes("google")
          ) {
            const relativePath = path.relative(cwd, filePath);
            searchResults.push({
              name: file,
              path: relativePath,
              size: stat.size,
            });
          }
        }
      };

      walkDir(srcPath);
    }

    // Get environment variables
    const envVars = {
      GOOGLE_APPLICATION_CREDENTIALS:
        process.env.GOOGLE_APPLICATION_CREDENTIALS || "Not set",
      NODE_ENV: process.env.NODE_ENV,
      HOME: process.env.HOME || "Not available",
      PWD: process.env.PWD || "Not available",
    };

    return NextResponse.json({
      success: fileExists,
      currentWorkingDirectory: cwd,
      expectedPath,
      fileExists,
      srcFileList: srcFiles,
      searchResults,
      environmentVariables: envVars,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
