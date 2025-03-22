const { spawn } = require("child_process");
const path = require("path");

/**
 * Execute the Python script and return only the JSON output
 * @param {string} action - The action to perform (transcript, languages, metadata)
 * @param {string} url - The YouTube URL
 * @param {string} lang - The language code (optional)
 * @returns {Promise<object>} - The parsed JSON result
 */
function executePythonScript(action, url, lang = "en") {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(
      process.cwd(),
      "src",
      "scripts",
      "youtube_utils.py"
    );

    // Spawn Python process
    const pythonProcess = spawn("python", [scriptPath, action, url, lang]);

    let stdoutData = "";
    let stderrData = "";

    // Collect stdout data
    pythonProcess.stdout.on("data", (data) => {
      stdoutData += data.toString();
    });

    // Collect stderr data
    pythonProcess.stderr.on("data", (data) => {
      stderrData += data.toString();
    });

    // Handle process completion
    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        console.error("Python process exited with code:", code);
        console.error("STDERR:", stderrData);

        // Try to extract JSON from stderr if possible (sometimes Python prints to stderr)
        try {
          const jsonMatch = stderrData.match(/({[\s\S]*})/);
          if (jsonMatch && jsonMatch[1]) {
            const result = JSON.parse(jsonMatch[1]);
            return resolve(result);
          }
        } catch (e) {
          // Ignore parsing errors in stderr
        }

        return reject(
          new Error(`Python process exited with code ${code}: ${stderrData}`)
        );
      }

      try {
        // Look for JSON in the output
        const jsonRegex = /{[\s\S]*}/;
        const match = stdoutData.match(jsonRegex);

        if (!match) {
          console.error("No JSON found in output:", stdoutData);
          return reject(new Error("No valid JSON found in Python output"));
        }

        const jsonString = match[0];
        const result = JSON.parse(jsonString);

        // Log success for debugging
        console.log(`Successfully parsed JSON for action: ${action}`);

        resolve(result);
      } catch (error) {
        console.error("Failed to parse JSON output:", error);
        console.error("Raw stdout:", stdoutData);
        console.error("Raw stderr:", stderrData);

        // Return a fallback error response
        resolve({
          success: false,
          error: `Failed to parse JSON output: ${error.message}`,
          debug: {
            stdout: stdoutData,
            stderr: stderrData,
          },
        });
      }
    });

    // Handle process errors
    pythonProcess.on("error", (error) => {
      console.error("Failed to start Python process:", error);
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
  });
}

// Export the function to be used in the API routes
module.exports = { executePythonScript };
