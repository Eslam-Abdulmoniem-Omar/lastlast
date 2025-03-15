import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";
import { promisify } from "util";

const execPromise = promisify(exec);

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string; lang: string; action: string } }
) {
  try {
    const { videoId, lang, action } = params;
    const url = `https://www.youtube.com/watch?v=${videoId}`;

    // Path to the Python script
    const scriptPath = path.join(
      process.cwd(),
      "src",
      "scripts",
      "youtube_utils.py"
    );

    try {
      console.log(
        `Running Python test with action: ${action}, videoId: ${videoId}, lang: ${lang}`
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
        videoId,
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
