const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Paths
const requirementsPath = path.join(__dirname, "requirements.txt");
const pythonUtilsPath = path.join(__dirname, "youtube_utils.py");

console.log("Checking Python installation...");
try {
  const pythonVersion = execSync("python --version").toString();
  console.log(`${pythonVersion.trim()} detected`);
} catch (error) {
  console.error("Python is not installed or not in your PATH.");
  console.error(
    "Please install Python 3.6+ from https://www.python.org/downloads/"
  );
  process.exit(1);
}

// Check if the YouTube utils script exists
if (!fs.existsSync(pythonUtilsPath)) {
  console.error(`Could not find YouTube utils script at: ${pythonUtilsPath}`);
  process.exit(1);
}

// Check if requirements.txt exists
if (!fs.existsSync(requirementsPath)) {
  console.error(`Could not find requirements.txt at: ${requirementsPath}`);
  console.error("Creating a new requirements.txt file...");

  // Create the requirements.txt file with the necessary dependencies
  const requirements = [
    "yt-dlp>=2023.3.4",
    "youtube-transcript-api>=0.6.1",
  ].join("\n");

  fs.writeFileSync(requirementsPath, requirements);
  console.log("requirements.txt file created successfully");
}

// Install dependencies
console.log("Installing Python dependencies...");
try {
  execSync(`pip install -r "${requirementsPath}"`, { stdio: "inherit" });
  console.log("Dependencies installed successfully!");
} catch (error) {
  console.error("Failed to install dependencies:", error.message);
  console.error("Please try to run manually: pip install -r requirements.txt");
  process.exit(1);
}

// Test importing the modules
console.log("Testing module imports...");
try {
  execSync(
    "python -c \"import yt_dlp, youtube_transcript_api; print('Modules imported successfully')\"",
    { stdio: "inherit" }
  );
} catch (error) {
  console.error("Failed to import modules:", error.message);
  console.error("The dependencies might not be installed correctly.");
  process.exit(1);
}

console.log(
  "\nSetup complete! The YouTube transcript functionality should now work properly."
);
console.log("If you still have issues, try the following:");
console.log("1. Make sure you have a working internet connection");
console.log("2. Restart your development server");
console.log(
  "3. Try different YouTube videos (not all videos have transcripts)"
);
console.log("4. Check browser console for detailed error messages");
