export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;
export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";
import { promisify } from "util";

const execPromise = promisify(exec);

// This API route cannot be rendered statically because it uses:
// - request.nextUrl.searchParams
// Therefore we must ensure Vercel doesn't try to render it statically

export async function GET(request: NextRequest) {
  // Directly access all the query parameters without any try/catch at all
  const url =
    request.nextUrl.searchParams.get("url") ||
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ"; // Default to a known video
  const lang = request.nextUrl.searchParams.get("lang") || "en";
  const action = request.nextUrl.searchParams.get("action") || "transcript";

  // Log explicitly that we're using dynamic parameters
  console.log("Dynamic route call with query parameters:", {
    url,
    lang,
    action,
  });

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

    // Re-throw the error instead of returning an error response
    throw pythonError;
  }
}
