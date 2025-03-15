import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";
import { promisify } from "util";

const execPromise = promisify(exec);

// Route segment configuration
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;
export const runtime = "nodejs"; // Using nodejs runtime since we need child_process

export async function GET(request: NextRequest) {
  try {
    // Extract the YouTube URL from the query parameters
    const url =
      request.nextUrl.searchParams.get("url") ||
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ"; // Default to a known video
    const lang = request.nextUrl.searchParams.get("lang") || "en";
    const action = request.nextUrl.searchParams.get("action") || "transcript";

    // Path to the Python script
    const scriptPath = path.join(
      process.cwd(),
      "src",
      "scripts",
      "youtube_utils.py"
    );

    try {
      console.log(
        `Running Python test with action: ${action}, url: ${url}, lang: ${lang}`
      );

      // Execute the Python script directly
      const { stdout, stderr } = await execPromise(
        `python ${scriptPath} ${action} "${url}" "${lang}"`
      );

      if (stderr) {
        console.warn("Python script stderr:", stderr);
      }

      // Return the raw output from Python script for debugging
      return NextResponse.json({
        action,
        url,
        lang,
        stdout: JSON.parse(stdout),
        stderr: stderr || null,
        script_path: scriptPath,
      });
    } catch (pythonError: any) {
      console.error("Python script execution failed:", pythonError);

      return NextResponse.json(
        {
          error: "Failed to execute Python script",
          details: pythonError.message,
          stdout: pythonError.stdout,
          stderr: pythonError.stderr,
          script_path: scriptPath,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error in test endpoint:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
